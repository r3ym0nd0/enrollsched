document.addEventListener("DOMContentLoaded", () => {
  checkStudentSession();
  initStudentSidebar();
  initPreRegistration();

  const logoutBtn = document.getElementById("studentLogoutBtn");
  const startRegistrationBtn = document.getElementById("startRegistrationBtn");
  const logoutModalOverlay = document.getElementById("logoutModalOverlay");
  const confirmLogoutBtn = document.querySelector("[data-confirm-logout]");
  const cancelLogoutBtn = document.querySelector("[data-cancel-logout]");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", openLogoutModal);
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", logoutStudent);
  }

  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", closeLogoutModal);
  }

  if (logoutModalOverlay) {
    logoutModalOverlay.addEventListener("click", closeLogoutModal);
  }

  if (startRegistrationBtn) {
    startRegistrationBtn.addEventListener("click", () => {
      document.getElementById("preRegistrationSection")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLogoutModal();
    }
  });
});

let availableSlots = [];
let currentRegistration = null;

function initStudentSidebar() {
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", openSidebar);
  }

  overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

async function checkStudentSession() {
  try {
    const response = await apiFetch("/api/auth/me");

    if (!response.ok) {
      window.location.href = "/login";
      return;
    }

    const data = await response.json();

    if (data.student) {
      renderStudentProfile(data.student);
    }
  } catch (error) {
    window.location.href = "/login";
  }
}

function renderStudentProfile(student) {
  const studentName = document.getElementById("studentName");
  const studentFirstName = document.getElementById("studentFirstName");
  const studentAvatar = document.getElementById("studentAvatar");
  const fullNameInput = document.getElementById("studentFullNameInput");
  const fullName = student.fullName || "Student";
  const firstName = fullName.split(" ")[0] || "Student";

  if (studentName) {
    studentName.textContent = fullName;
  }

  if (studentFirstName) {
    studentFirstName.textContent = firstName;
  }

  if (studentAvatar) {
    studentAvatar.textContent = getInitials(fullName);
  }

  if (fullNameInput) {
    fullNameInput.value = fullName;
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function logoutStudent() {
  await apiFetch("/api/auth/logout", {
    method: "POST"
  });

  window.location.href = "/login";
}

function openLogoutModal() {
  const modal = document.getElementById("logoutModal");
  const overlay = document.getElementById("logoutModalOverlay");
  const confirmButton = document.querySelector("[data-confirm-logout]");

  if (!modal || !overlay) return;

  modal.classList.add("active");
  overlay.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (confirmButton) {
    confirmButton.focus();
  }
}

function closeLogoutModal() {
  const modal = document.getElementById("logoutModal");
  const overlay = document.getElementById("logoutModalOverlay");

  if (!modal || !overlay || !modal.classList.contains("active")) return;

  modal.classList.remove("active");
  overlay.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function initPreRegistration() {
  const form = document.getElementById("preRegistrationForm");

  await loadTimeSlots();
  await loadMyPreRegistration();

  if (form) {
    form.addEventListener("submit", submitPreRegistration);
  }
}

async function loadTimeSlots() {
  const slotSelect = document.getElementById("timeSlotInput");
  const slotGrid = document.getElementById("timeSlotGrid");
  const availableSlotsStat = document.getElementById("availableSlotsStat");

  try {
    const response = await apiFetch("/api/time-slots");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load time slots.");
    }

    availableSlots = data.slots || [];
    const openSlots = availableSlots.filter((slot) => Boolean(slot.isActive) && !Boolean(slot.isFull));

    if (availableSlotsStat) {
      availableSlotsStat.textContent = String(openSlots.length);
    }

    renderTimeSlotSelect(slotSelect, availableSlots);
    renderTimeSlotCards(slotGrid, availableSlots);
  } catch (error) {
    if (slotSelect) {
      slotSelect.innerHTML = '<option value="">Unable to load slots</option>';
    }

    if (slotGrid) {
      slotGrid.innerHTML = `
        <div class="timeslot-card">
          <div class="timeslot-time">Unable to load time slots</div>
          <div class="timeslot-count">${error.message}</div>
        </div>
      `;
    }
  }
}

function renderTimeSlotSelect(slotSelect, slots) {
  if (!slotSelect) return;

  const selectableSlots = slots.filter((slot) => Boolean(slot.isActive));

  if (selectableSlots.length === 0) {
    slotSelect.innerHTML = '<option value="">No active slots available</option>';
    return;
  }

  const options = selectableSlots.map((slot) => {
    const isFull = Boolean(slot.isFull);
    const label = isFull
      ? `${slot.slotLabel} - Full`
      : `${slot.slotLabel} - ${slot.remainingSlots} left`;

    return `<option value="${slot.id}" ${isFull ? "disabled" : ""}>${escapeHtml(label)}</option>`;
  });

  slotSelect.innerHTML = '<option value="">Select preferred time slot</option>' + options.join("");
}

function renderTimeSlotCards(slotGrid, slots) {
  if (!slotGrid) return;

  if (slots.length === 0) {
    slotGrid.innerHTML = `
      <div class="timeslot-card">
        <div class="timeslot-time">No slots available</div>
        <div class="timeslot-count">Please check again later.</div>
      </div>
    `;
    return;
  }

  slotGrid.innerHTML = slots
    .map((slot) => {
      const isBreak = Boolean(slot.isBreak);

      if (isBreak) {
        return `
          <div class="timeslot-card timeslot-break-card">
            <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
            <div class="timeslot-count">Staff lunch break. Booking resumes at 1:00 PM.</div>
            <span class="status-badge status-break">Break</span>
          </div>
        `;
      }

      const isFull = Boolean(slot.isFull);
      const statusText = isFull ? "Full" : "Available";
      const statusClass = isFull ? "status-pending" : "status-approved";

      return `
        <div class="timeslot-card ${isFull ? "is-full" : ""}">
          <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
          <div class="timeslot-count">${slot.bookedCount} / ${slot.capacity} students</div>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      `;
    })
    .join("");
}

async function loadMyPreRegistration() {
  try {
    const response = await apiFetch("/api/pre-registrations/me");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load pre-registration.");
    }

    if (data.registration) {
      currentRegistration = data.registration;
      prefillPreRegistrationForm(data.registration);
      renderConfirmation(data.registration);
      setFormMode("update");
    }
  } catch (error) {
    setPreRegistrationMessage(error.message, "error");
  }
}

async function submitPreRegistration(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(form).entries());

  setPreRegistrationMessage("");

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    const isUpdate = Boolean(currentRegistration);
    const response = await apiFetch(isUpdate ? "/api/pre-registrations/me" : "/api/pre-registrations", {
      method: isUpdate ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      const suggestion = formatSuggestedSlots(data.suggestedSlots);
      throw new Error(`${data.message || "Unable to submit pre-registration."}${suggestion}`);
    }

    renderConfirmation(data.registration);
    currentRegistration = data.registration;
    setFormMode("update");
    await loadTimeSlots();
    prefillPreRegistrationForm(data.registration);
    setPreRegistrationMessage(
      isUpdate
        ? "Pre-registration updated and sent back for admin review."
        : "Pre-registration submitted for admin review.",
      "success"
    );
  } catch (error) {
    setPreRegistrationMessage(error.message, "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = currentRegistration
        ? "Update Pre-Registration"
        : "Submit Pre-Registration";
    }
  }
}

function prefillPreRegistrationForm(registration) {
  const courseInput = document.getElementById("courseInput");
  const yearLevelInput = document.getElementById("yearLevelInput");
  const timeSlotInput = document.getElementById("timeSlotInput");
  const expectedPaymentAmountInput = document.getElementById("expectedPaymentAmountInput");
  const feeCheckbox = document.querySelector('input[name="feeAcknowledged"]');
  const comCheckbox = document.querySelector('input[name="comAcknowledged"]');
  const balanceCheckbox = document.querySelector('input[name="balanceAcknowledged"]');
  const receiptCheckbox = document.querySelector('input[name="receiptAcknowledged"]');

  if (courseInput) {
    courseInput.value = registration.course || "";
  }

  if (yearLevelInput) {
    yearLevelInput.value = registration.yearLevel || "";
  }

  if (timeSlotInput && registration.timeSlotId) {
    timeSlotInput.value = String(registration.timeSlotId);
  }

  if (expectedPaymentAmountInput) {
    expectedPaymentAmountInput.value = registration.expectedPaymentAmount || 500;
  }

  if (feeCheckbox) {
    feeCheckbox.checked = Boolean(registration.feeAcknowledged);
  }

  if (comCheckbox) {
    comCheckbox.checked = Boolean(registration.comAcknowledged);
  }

  if (balanceCheckbox) {
    balanceCheckbox.checked = Boolean(registration.balanceAcknowledged);
  }

  if (receiptCheckbox) {
    receiptCheckbox.checked = Boolean(registration.receiptAcknowledged);
  }
}

function renderConfirmation(registration) {
  const emptyConfirmation = document.getElementById("emptyConfirmation");
  const confirmationDetails = document.getElementById("confirmationDetails");
  const confirmationStatus = document.getElementById("confirmationStatus");
  const rejectionReasonRow = document.getElementById("rejectionReasonRow");
  const confirmationRejectionReason = document.getElementById("confirmationRejectionReason");
  const confirmationCourse = document.getElementById("confirmationCourse");
  const confirmationYearLevel = document.getElementById("confirmationYearLevel");
  const confirmationSchedule = document.getElementById("confirmationSchedule");
  const confirmationFeeNotice = document.getElementById("confirmationFeeNotice");
  const confirmationExpectedPayment = document.getElementById("confirmationExpectedPayment");
  const confirmationRequirements = document.getElementById("confirmationRequirements");
  const registrationStatusStat = document.getElementById("registrationStatusStat");
  const selectedScheduleStat = document.getElementById("selectedScheduleStat");

  if (emptyConfirmation) {
    emptyConfirmation.hidden = true;
  }

  if (confirmationDetails) {
    confirmationDetails.hidden = false;
  }

  if (confirmationStatus) {
    confirmationStatus.textContent = formatStatus(registration.status || "pending");
  }

  if (rejectionReasonRow) {
    rejectionReasonRow.hidden = registration.status !== "rejected";
  }

  if (confirmationRejectionReason) {
    confirmationRejectionReason.textContent = registration.rejectionReason || "--";
  }

  if (confirmationCourse) {
    confirmationCourse.textContent = registration.course || "--";
  }

  if (confirmationYearLevel) {
    confirmationYearLevel.textContent = registration.yearLevel || "--";
  }

  if (confirmationSchedule) {
    confirmationSchedule.textContent = registration.preferredTimeSlot || registration.slotLabel || "--";
  }

  if (confirmationFeeNotice) {
    confirmationFeeNotice.textContent = registration.feeAcknowledged
      ? "Acknowledged - prepare at least ₱500"
      : "Not acknowledged";
  }

  if (confirmationExpectedPayment) {
    confirmationExpectedPayment.textContent = formatPeso(registration.expectedPaymentAmount || 500);
  }

  if (confirmationRequirements) {
    confirmationRequirements.textContent = hasCompleteRequirements(registration)
      ? "Ready - COM, receipt, and cashier reminders acknowledged"
      : "Incomplete";
  }

  if (registrationStatusStat) {
    registrationStatusStat.textContent = formatStatus(registration.status || "pending");
  }

  if (selectedScheduleStat) {
    selectedScheduleStat.textContent = registration.preferredTimeSlot || registration.slotLabel || "--";
  }
}

function setFormMode(mode) {
  const form = document.getElementById("preRegistrationForm");

  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.textContent = mode === "update"
      ? "Update Pre-Registration"
      : "Submit Pre-Registration";
  }
}

function setPreRegistrationMessage(message, type = "") {
  const messageElement = document.getElementById("preRegistrationMessage");

  if (!messageElement) return;

  messageElement.textContent = message;
  messageElement.className = "auth-message student-form-message";

  if (type) {
    messageElement.classList.add(type);
  }
}

function formatSuggestedSlots(slots = []) {
  if (!slots.length) return "";

  const labels = slots.map((slot) => slot.slotLabel).join(", ");
  return ` Suggested slots: ${labels}.`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatus(value) {
  if (value === "confirmed") return "Approved";
  return titleCase(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPeso(value) {
  return `PHP ${Number(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function hasCompleteRequirements(registration) {
  return Boolean(
    registration.comAcknowledged &&
    registration.balanceAcknowledged &&
    registration.receiptAcknowledged
  );
}
