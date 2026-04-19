const db = require("../config/db");

async function getAdminDashboard(req, res) {
  try {
    const [[studentStats], [registrationStats], [slotStats], [registrations], [timeSlots]] =
      await Promise.all([
        db.execute("SELECT COUNT(*) AS totalStudents FROM students"),
        db.execute(
          "SELECT COUNT(*) AS totalPreRegistrations FROM pre_registrations WHERE status IN ('pending', 'approved', 'confirmed')"
        ),
        db.execute(`
          SELECT
            SUM(CASE WHEN booked_count < capacity THEN 1 ELSE 0 END) AS availableSlots,
            SUM(CASE WHEN booked_count >= capacity THEN 1 ELSE 0 END) AS fullSlots
          FROM (
            SELECT
              ts.id,
              ts.capacity,
              COUNT(pr.id) AS booked_count
            FROM time_slots ts
            LEFT JOIN pre_registrations pr
              ON pr.time_slot_id = ts.id
              AND pr.status IN ('pending', 'approved', 'confirmed')
            WHERE ts.is_active = TRUE
            GROUP BY ts.id, ts.capacity
          ) slot_counts
        `),
        db.execute(`
          SELECT
            pr.id,
            s.full_name AS studentName,
            s.student_id AS studentId,
            pr.course,
            pr.year_level AS yearLevel,
            pr.preferred_time_slot AS selectedTimeSlot,
            pr.expected_payment_amount AS expectedPaymentAmount,
            pr.fee_acknowledged AS feeAcknowledged,
            pr.com_acknowledged AS comAcknowledged,
            pr.balance_acknowledged AS balanceAcknowledged,
            pr.receipt_acknowledged AS receiptAcknowledged,
            pr.status,
            pr.rejection_reason AS rejectionReason,
            pr.created_at AS createdAt
          FROM pre_registrations pr
          INNER JOIN students s ON s.id = pr.student_id
          ORDER BY pr.created_at DESC
          LIMIT 10
        `),
        db.execute(`
          SELECT
            ts.id,
            ts.slot_label AS slotLabel,
            ts.capacity,
            ts.is_active AS isActive,
            CASE
              WHEN ts.slot_label LIKE '%Lunch Break%' THEN TRUE
              ELSE FALSE
            END AS isBreak,
            COUNT(pr.id) AS bookedCount,
            GREATEST(ts.capacity - COUNT(pr.id), 0) AS remainingSlots,
            CASE
              WHEN COUNT(pr.id) >= ts.capacity THEN TRUE
              ELSE FALSE
            END AS isFull
          FROM time_slots ts
          LEFT JOIN pre_registrations pr
            ON pr.time_slot_id = ts.id
            AND pr.status IN ('pending', 'approved', 'confirmed')
          WHERE ts.is_active = TRUE
            OR ts.slot_label LIKE '%Lunch Break%'
          GROUP BY
            ts.id,
            ts.slot_label,
            ts.start_time,
            ts.capacity,
            ts.is_active
          ORDER BY ts.start_time ASC
        `)
      ]);

    return res.json({
      stats: {
        totalStudents: Number(studentStats[0]?.totalStudents || 0),
        totalPreRegistrations: Number(registrationStats[0]?.totalPreRegistrations || 0),
        availableSlots: Number(slotStats[0]?.availableSlots || 0),
        fullSlots: Number(slotStats[0]?.fullSlots || 0)
      },
      registrations,
      timeSlots
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load admin dashboard data." });
  }
}

async function updateTimeSlotCapacity(req, res) {
  const slotId = Number(req.params.id);
  const capacity = Number(req.body.capacity);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    return res.status(400).json({ message: "Invalid time slot." });
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
    return res.status(400).json({ message: "Capacity must be between 1 and 200." });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [slots] = await connection.execute(
      `
        SELECT id, slot_label AS slotLabel, is_active AS isActive
        FROM time_slots
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [slotId]
    );

    const slot = slots[0];

    if (!slot) {
      await connection.rollback();
      return res.status(404).json({ message: "Time slot not found." });
    }

    if (!slot.isActive || slot.slotLabel.includes("Lunch Break")) {
      await connection.rollback();
      return res.status(400).json({ message: "Break slots cannot be edited." });
    }

    const [counts] = await connection.execute(
      `
        SELECT COUNT(*) AS bookedCount
        FROM pre_registrations
        WHERE time_slot_id = ?
          AND status IN ('pending', 'approved', 'confirmed')
      `,
      [slotId]
    );

    const bookedCount = Number(counts[0].bookedCount);

    if (capacity < bookedCount) {
      await connection.rollback();
      return res.status(400).json({
        message: `Capacity cannot be lower than current bookings (${bookedCount}).`
      });
    }

    await connection.execute("UPDATE time_slots SET capacity = ? WHERE id = ?", [capacity, slotId]);
    await connection.commit();

    return res.json({
      message: "Time slot capacity updated.",
      slot: {
        id: slotId,
        capacity,
        bookedCount,
        remainingSlots: capacity - bookedCount,
        isFull: bookedCount >= capacity
      }
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: "Unable to update time slot capacity." });
  } finally {
    connection.release();
  }
}

async function updatePreRegistrationStatus(req, res) {
  const registrationId = Number(req.params.id);
  const { status, rejectionReason = "" } = req.body;
  const allowedStatuses = ["approved", "rejected"];

  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    return res.status(400).json({ message: "Invalid pre-registration." });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Status must be approved or rejected." });
  }

  if (status === "rejected" && !String(rejectionReason).trim()) {
    return res.status(400).json({ message: "Rejection reason is required." });
  }

  try {
    const [result] = await db.execute(
      `
        UPDATE pre_registrations
        SET status = ?,
            rejection_reason = ?
        WHERE id = ?
      `,
      [status, status === "rejected" ? String(rejectionReason).trim() : null, registrationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pre-registration not found." });
    }

    return res.json({ message: `Pre-registration ${status}.` });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update pre-registration status." });
  }
}

module.exports = {
  getAdminDashboard,
  updatePreRegistrationStatus,
  updateTimeSlotCapacity
};
