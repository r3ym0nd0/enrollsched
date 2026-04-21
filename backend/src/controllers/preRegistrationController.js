const db = require("../config/db");
const { getEvidencePath, removeUploadedEvidence } = require("../middleware/evidenceUpload");

function getUploadedEvidencePaths(req) {
  return {
    comEvidencePath: getEvidencePath(req.files?.comEvidence?.[0]),
    receiptEvidencePath: getEvidencePath(req.files?.receiptEvidence?.[0])
  };
}

async function getSuggestedSlots(connection, excludedSlotId = null) {
  const params = [];
  let excludedClause = "";

  if (excludedSlotId) {
    excludedClause = "AND ts.id != ?";
    params.push(excludedSlotId);
  }

  const [slots] = await connection.execute(
    `
      SELECT
        ts.id,
        ts.slot_label AS slotLabel,
        ts.capacity,
        COUNT(pr.id) AS bookedCount,
        GREATEST(ts.capacity - COUNT(pr.id), 0) AS remainingSlots
      FROM time_slots ts
      LEFT JOIN pre_registrations pr
        ON pr.time_slot_id = ts.id
        AND pr.status IN ('pending', 'approved', 'confirmed')
      WHERE ts.is_active = TRUE
        ${excludedClause}
      GROUP BY ts.id, ts.slot_label, ts.start_time, ts.capacity
      HAVING bookedCount < ts.capacity
      ORDER BY ts.start_time ASC
      LIMIT 3
    `,
    params
  );

  return slots;
}

async function getMyRegistrationHistory(req, res) {
  try {
    const studentId = req.session.student.id;

    const [registrations] = await db.execute(
      `
        SELECT
          pr.id,
          pr.course,
          pr.year_level AS yearLevel,
          pr.time_slot_id AS timeSlotId,
          ts.slot_label AS timeSlotLabel,
          pr.expected_payment_amount AS expectedPaymentAmount,
          pr.status,
          pr.created_at AS createdAt
        FROM pre_registrations pr
        LEFT JOIN time_slots ts ON ts.id = pr.time_slot_id
        WHERE pr.student_id = ?
        ORDER BY pr.created_at DESC
      `,
      [studentId]
    );

    return res.status(200).json({
      success: true,
      data: registrations
    });

  } catch (error) {
    console.error('Get registration history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load registration history' });
  }
}

async function getMyPreRegistration(req, res) {
  try {
    const [registrations] = await db.execute(
      `
        SELECT
          pr.id,
          pr.course,
          pr.year_level AS yearLevel,
          pr.preferred_time_slot AS preferredTimeSlot,
          pr.expected_payment_amount AS expectedPaymentAmount,
          pr.fee_acknowledged AS feeAcknowledged,
          pr.com_acknowledged AS comAcknowledged,
          pr.balance_acknowledged AS balanceAcknowledged,
          pr.receipt_acknowledged AS receiptAcknowledged,
          pr.com_evidence_path AS comEvidencePath,
          pr.receipt_evidence_path AS receiptEvidencePath,
          pr.status,
          pr.rejection_reason AS rejectionReason,
          pr.created_at AS createdAt,
          ts.id AS timeSlotId,
          ts.slot_label AS slotLabel
        FROM pre_registrations pr
        LEFT JOIN time_slots ts ON ts.id = pr.time_slot_id
        WHERE pr.student_id = ?
        ORDER BY pr.created_at DESC
        LIMIT 1
      `,
      [req.session.student.id]
    );

    return res.json({ registration: registrations[0] || null });
  } catch (error) {
    console.error("Failed to load student pre-registration:", error);
    return res.status(500).json({ message: "Unable to load your pre-registration." });
  }
}

function validateRegistrationInput(body) {
  const {
    course,
    yearLevel,
    timeSlotId,
    feeAcknowledged,
    expectedPaymentAmount,
    comAcknowledged,
    balanceAcknowledged,
    receiptAcknowledged
  } = body;
  const parsedExpectedPaymentAmount = Number(expectedPaymentAmount);

  if (!course || !yearLevel || !timeSlotId) {
    return "Course, year level, and time slot are required.";
  }

  if (!Number.isFinite(parsedExpectedPaymentAmount) || parsedExpectedPaymentAmount < 500) {
    return "Expected initial payment must be at least ₱500.";
  }

  if (feeAcknowledged !== "on" && feeAcknowledged !== true) {
    return "Please acknowledge the minimum initial payment reminder.";
  }

  if (comAcknowledged !== "on" && comAcknowledged !== true) {
    return "Please acknowledge that you need to bring your Certificate of Matriculation (COM).";
  }

  if (balanceAcknowledged !== "on" && balanceAcknowledged !== true) {
    return "Please acknowledge that unpaid balances must be settled at the cashier first.";
  }

  if (receiptAcknowledged !== "on" && receiptAcknowledged !== true) {
    return "Please acknowledge that you need to bring your tuition/payment receipt.";
  }

  return "";
}

async function getLockedAvailableSlot(connection, timeSlotId, existingRegistrationId = null) {
  const [slots] = await connection.execute(
    `
      SELECT id, slot_label AS slotLabel, capacity, is_active AS isActive
      FROM time_slots
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [timeSlotId]
  );

  const slot = slots[0];

  if (!slot || !slot.isActive) {
    return {
      errorStatus: 404,
      errorPayload: { message: "Selected time slot is not available." }
    };
  }

  const params = [timeSlotId];
  let excludeCurrentRegistration = "";

  if (existingRegistrationId) {
    excludeCurrentRegistration = "AND id != ?";
    params.push(existingRegistrationId);
  }

  const [bookingCounts] = await connection.execute(
    `
      SELECT COUNT(*) AS bookedCount
      FROM pre_registrations
        WHERE time_slot_id = ?
        AND status IN ('pending', 'approved', 'confirmed')
        ${excludeCurrentRegistration}
    `,
    params
  );

  const bookedCount = Number(bookingCounts[0].bookedCount);

  if (bookedCount >= slot.capacity) {
    const suggestedSlots = await getSuggestedSlots(connection, slot.id);

    return {
      errorStatus: 409,
      errorPayload: {
        message: "This time slot is already full. Please choose another available slot.",
        suggestedSlots
      }
    };
  }

  return { slot };
}

async function createPreRegistration(req, res) {
  const { course, yearLevel, timeSlotId, expectedPaymentAmount } = req.body;
  const validationMessage = validateRegistrationInput(req.body);
  const { comEvidencePath, receiptEvidencePath } = getUploadedEvidencePaths(req);

  if (validationMessage) {
    removeUploadedEvidence(req.files);
    return res.status(400).json({ message: validationMessage });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRegistrations] = await connection.execute(
      `
        SELECT id
        FROM pre_registrations
        WHERE student_id = ?
          AND status IN ('pending', 'approved', 'confirmed')
        LIMIT 1
      `,
      [req.session.student.id]
    );

    if (existingRegistrations.length > 0) {
      await connection.rollback();
      removeUploadedEvidence(req.files);
      return res.status(409).json({
        message: "You already have an active pre-registration."
      });
    }

    const slotResult = await getLockedAvailableSlot(connection, timeSlotId);

    if (slotResult.errorPayload) {
      await connection.rollback();
      removeUploadedEvidence(req.files);
      return res.status(slotResult.errorStatus).json(slotResult.errorPayload);
    }

    const { slot } = slotResult;

    const [result] = await connection.execute(
      `
        INSERT INTO pre_registrations (
          student_id,
          time_slot_id,
          course,
          year_level,
          preferred_time_slot,
          expected_payment_amount,
          fee_acknowledged,
          com_acknowledged,
          balance_acknowledged,
          receipt_acknowledged,
          com_evidence_path,
          receipt_evidence_path,
          status,
          rejection_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, TRUE, TRUE, ?, ?, 'pending', NULL)
      `,
      [
        req.session.student.id,
        slot.id,
        course,
        yearLevel,
        slot.slotLabel,
        Number(expectedPaymentAmount),
        comEvidencePath,
        receiptEvidencePath
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Pre-registration submitted for admin review.",
      registration: {
        id: result.insertId,
        course,
        yearLevel,
        preferredTimeSlot: slot.slotLabel,
        expectedPaymentAmount: Number(expectedPaymentAmount),
        feeAcknowledged: true,
        comAcknowledged: true,
        balanceAcknowledged: true,
        receiptAcknowledged: true,
        comEvidencePath,
        receiptEvidencePath,
        status: "pending",
        rejectionReason: null
      }
    });
  } catch (error) {
    await connection.rollback();
    removeUploadedEvidence(req.files);
    console.error("Failed to submit student pre-registration:", error);
    return res.status(500).json({ message: "Unable to submit pre-registration." });
  } finally {
    connection.release();
  }
}

async function updateMyPreRegistration(req, res) {
  const { course, yearLevel, timeSlotId, expectedPaymentAmount } = req.body;
  const validationMessage = validateRegistrationInput(req.body);
  const uploadedEvidencePaths = getUploadedEvidencePaths(req);

  if (validationMessage) {
    removeUploadedEvidence(req.files);
    return res.status(400).json({ message: validationMessage });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [registrations] = await connection.execute(
      `
        SELECT id, com_evidence_path AS comEvidencePath, receipt_evidence_path AS receiptEvidencePath
        FROM pre_registrations
        WHERE student_id = ?
          AND status IN ('pending', 'approved', 'confirmed', 'rejected')
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [req.session.student.id]
    );

    const registration = registrations[0];

    if (!registration) {
      await connection.rollback();
      removeUploadedEvidence(req.files);
      return res.status(404).json({ message: "No active pre-registration found to update." });
    }

    const slotResult = await getLockedAvailableSlot(connection, timeSlotId, registration.id);

    if (slotResult.errorPayload) {
      await connection.rollback();
      removeUploadedEvidence(req.files);
      return res.status(slotResult.errorStatus).json(slotResult.errorPayload);
    }

    const { slot } = slotResult;
    const comEvidencePath = uploadedEvidencePaths.comEvidencePath || registration.comEvidencePath;
    const receiptEvidencePath =
      uploadedEvidencePaths.receiptEvidencePath || registration.receiptEvidencePath;

    await connection.execute(
      `
        UPDATE pre_registrations
        SET
          time_slot_id = ?,
          course = ?,
          year_level = ?,
          preferred_time_slot = ?,
          expected_payment_amount = ?,
          fee_acknowledged = TRUE,
          com_acknowledged = TRUE,
          balance_acknowledged = TRUE,
          receipt_acknowledged = TRUE,
          com_evidence_path = ?,
          receipt_evidence_path = ?,
          status = 'pending',
          rejection_reason = NULL
        WHERE id = ?
          AND student_id = ?
      `,
      [
        slot.id,
        course,
        yearLevel,
        slot.slotLabel,
        Number(expectedPaymentAmount),
        comEvidencePath,
        receiptEvidencePath,
        registration.id,
        req.session.student.id
      ]
    );

    await connection.commit();

    return res.json({
      message: "Pre-registration updated.",
      registration: {
        id: registration.id,
        course,
        yearLevel,
        preferredTimeSlot: slot.slotLabel,
        expectedPaymentAmount: Number(expectedPaymentAmount),
        feeAcknowledged: true,
        comAcknowledged: true,
        balanceAcknowledged: true,
        receiptAcknowledged: true,
        comEvidencePath,
        receiptEvidencePath,
        status: "pending",
        rejectionReason: null
      }
    });
  } catch (error) {
    await connection.rollback();
    removeUploadedEvidence(req.files);
    console.error("Failed to update student pre-registration:", error);
    return res.status(500).json({ message: "Unable to update pre-registration." });
  } finally {
    connection.release();
  }
}

module.exports = {
  createPreRegistration,
  getMyPreRegistration,
  getMyRegistrationHistory,
  updateMyPreRegistration
};
