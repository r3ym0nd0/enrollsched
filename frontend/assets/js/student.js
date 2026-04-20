document.addEventListener("DOMContentLoaded", () => {
  checkStudentSession();
  initStudentSidebar();
  initPreRegistration();
  setStudentDatePill();

  const logoutBtn = document.getElementById("studentLogoutBtn");
  const startRegistrationBtn = document.getElementById("startRegistrationBtn");
  const logoutModalOverlay = document.getElementById("logoutModalOverlay");
  const confirmLogoutBtn = document.querySelector("[data-confirm-logout]");
  const cancelLogoutBtn = document.querySelector("[data-cancel-logout]");
  const sectionLinks = document.querySelectorAll("[data-student-section-link]");

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
      showStudentView("#preRegistrationSection");
      setActiveStudentSectionLink(document.querySelector('[href="#preRegistrationSection"]'));
    });
  }

  sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showStudentView(link.getAttribute("href"));
      setActiveStudentSectionLink(link);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLogoutModal();
    }
  });

  document.addEventListener("click", (event) => {
    const overviewAction = event.target.closest("[data-student-overview-action]");

    if (overviewAction) {
      showStudentView("#preRegistrationSection");
      setActiveStudentSectionLink(document.querySelector('[href="#preRegistrationSection"]'));
    }
  });
});

let availableSlots = [];
let currentRegistration = null;

function initStudentSidebar() {
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  const closeBtn = document.getElementById("sidebarCloseBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    toggleBtn?.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    toggleBtn?.setAttribute("aria-expanded", "false");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", openSidebar);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeSidebar);
  }

  overlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });
}

function showStudentView(targetSelector) {
  const targetView = document.querySelector(targetSelector);

  if (!targetView) return;

  document.querySelectorAll(".student-view").forEach((view) => {
    const isActive = view === targetView;
    view.hidden = !isActive;
    view.classList.toggle("active", isActive);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function setActiveStudentSectionLink(activeLink) {
  if (!activeLink) return;

  document.querySelectorAll("[data-student-section-link]").forEach((link) => {
    link.classList.toggle("active", link === activeLink);
  });
}

function setStudentDatePill() {
  const datePill = document.getElementById("studentDatePill");

  if (!datePill) return;

  datePill.textContent = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
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

  try {
    const response = await apiFetch("/api/time-slots");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load time slots.");
    }

    availableSlots = data.slots || [];

    renderTimeSlotSelect(slotSelect, availableSlots);
    renderTimeSlotCards(slotGrid, availableSlots);
    renderStudentOverview();
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

    renderStudentOverview();
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
          <div class="timeslot-card student-timeslot-card timeslot-break-card">
            <div class="timeslot-card-header">
              <div>
                <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
                <div class="timeslot-count">Staff lunch break. Booking resumes at 1:00 PM.</div>
              </div>
              <span class="status-badge status-break">Break</span>
            </div>
            <div class="timeslot-break-note">This period is blocked so staff can resume processing students after lunch.</div>
          </div>
        `;
      }

      const isFull = Boolean(slot.isFull);
      const statusText = isFull ? "Full" : "Available";
      const statusClass = isFull ? "status-pending" : "status-approved";
      const capacity = Number(slot.capacity || 0);
      const bookedCount = Number(slot.bookedCount || 0);
      const remainingSlots = Number(slot.remainingSlots || Math.max(capacity - bookedCount, 0));
      const fillPercentage = capacity > 0 ? Math.min(Math.round((bookedCount / capacity) * 100), 100) : 0;

      return `
        <div class="timeslot-card student-timeslot-card ${isFull ? "is-full" : ""}">
          <div class="timeslot-card-header">
            <div>
              <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
              <div class="timeslot-count">${remainingSlots} seat${remainingSlots === 1 ? "" : "s"} remaining</div>
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="timeslot-meter" aria-hidden="true">
            <span style="width: ${fillPercentage}%"></span>
          </div>
          <div class="student-slot-meta">
            <span>${bookedCount} booked</span>
            <span>${capacity} capacity</span>
          </div>
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
      throw new Error(data.message || "Unable to load registration request.");
    }

    if (data.registration) {
      currentRegistration = data.registration;
      prefillPreRegistrationForm(data.registration);
      renderConfirmation(data.registration);
      setFormMode("update");
    }

    renderStudentOverview();
  } catch (error) {
    setPreRegistrationMessage(error.message, "error");
    renderStudentOverview();
  }
}

async function submitPreRegistration(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const payload = new FormData(form);

  setPreRegistrationMessage("");

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    const isUpdate = Boolean(currentRegistration);
    const response = await apiFetch(isUpdate ? "/api/pre-registrations/me" : "/api/pre-registrations", {
      method: isUpdate ? "PUT" : "POST",
      body: payload
    });
    const data = await response.json();

    if (!response.ok) {
      const suggestion = formatSuggestedSlots(data.suggestedSlots);
      throw new Error(`${data.message || "Unable to submit registration request."}${suggestion}`);
    }

    renderConfirmation(data.registration);
    currentRegistration = data.registration;
    setFormMode("update");
    await loadTimeSlots();
    prefillPreRegistrationForm(data.registration);
    renderStudentOverview();
    setPreRegistrationMessage(
      isUpdate
        ? "Registration request updated and sent back for admin review."
        : "Registration request submitted for admin review.",
      "success"
    );
  } catch (error) {
    setPreRegistrationMessage(error.message, "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = currentRegistration
        ? "Update Register"
        : "Submit Register";
    }
  }
}

function renderStudentOverview() {
  renderStudentOverviewRegistration();
  renderStudentOverviewSlots();
  renderStudentOverviewReminder();
}

function renderStudentOverviewRegistration() {
  const container = document.getElementById("studentOverviewRegistration");

  if (!container) return;

  if (!currentRegistration) {
    container.innerHTML = `
      <button class="overview-list-item" type="button" data-student-overview-action="pre-registration">
        <span>
          <strong>Registration not started</strong>
          <small>Submit your details to reserve an enrollment visit slot.</small>
        </span>
        <span class="overview-slot-count">Start</span>
      </button>
    `;
    return;
  }

  container.innerHTML = `
    <button class="overview-list-item" type="button" data-student-overview-action="pre-registration">
      <span>
        <strong>${escapeHtml(formatStatus(currentRegistration.status || "pending"))}</strong>
        <small>${escapeHtml(currentRegistration.course || "Course pending")} · ${escapeHtml(currentRegistration.yearLevel || "Year pending")}</small>
      </span>
      <span class="overview-slot-count">${escapeHtml(currentRegistration.preferredTimeSlot || currentRegistration.slotLabel || "View")}</span>
    </button>
  `;
}

function renderStudentOverviewSlots() {
  const container = document.getElementById("studentOverviewSlots");

  if (!container) return;

  const openSlots = availableSlots
    .filter((slot) => Boolean(slot.isActive) && !Boolean(slot.isBreak) && !Boolean(slot.isFull))
    .slice(0, 4);

  if (openSlots.length === 0) {
    container.innerHTML = '<div class="overview-empty">No open slots right now.</div>';
    return;
  }

  container.innerHTML = openSlots
    .map((slot) => `
      <div class="overview-list-item">
        <span>
          <strong>${escapeHtml(slot.slotLabel)}</strong>
          <small>${slot.bookedCount} / ${slot.capacity} students booked</small>
        </span>
        <span class="overview-slot-count">${slot.remainingSlots} left</span>
      </div>
    `)
    .join("");
}

function renderStudentOverviewReminder() {
  const container = document.getElementById("studentOverviewReminder");

  if (!container) return;

  const schedule = currentRegistration?.preferredTimeSlot || currentRegistration?.slotLabel || "your selected slot";

  container.innerHTML = `
    <div class="overview-list-item">
      <span>
        <strong>Arrive on time</strong>
        <small>Visit the enrollment area during ${escapeHtml(schedule)}.</small>
      </span>
    </div>
    <div class="overview-list-item">
      <span>
        <strong>Bring proof</strong>
        <small>Prepare your COM, receipt, and onsite payment.</small>
      </span>
    </div>
    <div class="overview-list-item">
      <span>
        <strong>After processing</strong>
        <small>Claim your updated COM from the staff.</small>
      </span>
    </div>
  `;
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
  const confirmationCard = document.getElementById("confirmationCard");
  const emptyConfirmation = document.getElementById("emptyConfirmation");
  const confirmationDetails = document.getElementById("confirmationDetails");
  const confirmationStatus = document.getElementById("confirmationStatus");
  const rejectionReasonRow = document.getElementById("rejectionReasonRow");
  const confirmationRejectionReason = document.getElementById("confirmationRejectionReason");
  const confirmationCourse = document.getElementById("confirmationCourse");
  const confirmationYearLevel = document.getElementById("confirmationYearLevel");
  const confirmationSchedule = document.getElementById("confirmationSchedule");
  const confirmationReference = document.getElementById("confirmationReference");
  const confirmationFeeNotice = document.getElementById("confirmationFeeNotice");
  const confirmationExpectedPayment = document.getElementById("confirmationExpectedPayment");
  const confirmationRequirements = document.getElementById("confirmationRequirements");

  if (emptyConfirmation) {
    emptyConfirmation.hidden = true;
  }

  if (confirmationDetails) {
    confirmationDetails.hidden = false;
  }

  if (confirmationCard) {
    confirmationCard.dataset.status = registration.status || "pending";
  }

  if (confirmationStatus) {
    const status = registration.status || "pending";
    confirmationStatus.textContent = formatStatus(status);
    confirmationStatus.className = `student-confirmation-status is-${status}`;
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

  if (confirmationReference) {
    confirmationReference.textContent = registration.id
      ? `PR-${String(registration.id).padStart(5, "0")}`
      : "Pending";
  }

  if (confirmationFeeNotice) {
    confirmationFeeNotice.textContent = registration.feeAcknowledged
      ? "Acknowledged - prepare at least ₱500"
      : "Not acknowledged";
  }

  if (confirmationFeeNotice && registration.feeAcknowledged) {
    confirmationFeeNotice.textContent = "Acknowledged - prepare at least PHP 500";
  }

  if (confirmationExpectedPayment) {
    confirmationExpectedPayment.textContent = formatPeso(registration.expectedPaymentAmount || 500);
  }

  if (confirmationRequirements) {
    confirmationRequirements.textContent = hasCompleteRequirements(registration)
      ? "Ready - COM, receipt, and cashier reminders acknowledged"
      : "Incomplete";
  }

}

function setFormMode(mode) {
  const form = document.getElementById("preRegistrationForm");

  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.textContent = mode === "update"
      ? "Update Register"
      : "Submit Register";
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
