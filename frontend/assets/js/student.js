document.addEventListener("DOMContentLoaded", () => {
  checkStudentSession();
  initStudentSidebar();
  initStudentNotifications();
  initStudentSearch();
  initPreRegistration();
  setStudentDatePill();

async function initStudentHistory() {
  const historyList = document.getElementById("studentHistoryList");
  const historyCount = document.getElementById("historyRecordCount");

  if (!historyList) return;

  try {
    const res = await apiFetch("/api/pre-registrations/history");
    const result = await readJsonResponse(res, "Registration history API is not available.");

    if (!res.ok) {
      throw new Error(result.message || "Unable to load registration history.");
    }

    if (!result.success || !result.data || result.data.length === 0) {
      historyList.innerHTML = `<div class="overview-empty">No registration history found</div>`;
      if (historyCount) historyCount.textContent = "0 entries";
      return;
    }

    if (historyCount) historyCount.textContent = `${result.data.length} entries`;

    historyList.innerHTML = result.data.map((reg, index) => {
      const status = reg.status || "pending";
      const slot = reg.timeSlotLabel || reg.preferredTimeSlot || "Not selected";
      const payment = formatPeso(reg.expectedPaymentAmount || 500);
      const notes = reg.adminNotes || reg.rejectionReason || "";

      return `
        <article class="student-history-card">
          <div class="student-history-card-header">
            <div class="student-history-title-group">
              <span class="student-history-icon" aria-hidden="true">#${index + 1}</span>
              <div>
                <strong>${escapeHtml(reg.course || "Course pending")}</strong>
                <small>${escapeHtml(reg.yearLevel || "Year pending")} - ${escapeHtml(formatHistoryDate(reg.createdAt))}</small>
              </div>
            </div>
            <span class="student-history-status status-${escapeHtml(status)}">${escapeHtml(formatStatus(status))}</span>
          </div>
          <div class="student-history-details">
            <div>
              <span>Time Slot</span>
              <strong>${escapeHtml(slot)}</strong>
            </div>
            <div>
              <span>Expected Payment</span>
              <strong>${escapeHtml(payment)}</strong>
            </div>
          </div>
          ${notes ? `<div class="student-history-notes"><span>Admin note</span>${escapeHtml(notes)}</div>` : ""}
        </article>
      `;
    }).join("");
    return;

    historyList.innerHTML = result.data.map(reg => `
      <div class="overview-card student-history-card">
        <div class="student-history-header">
          <div>
            <strong>${reg.course} - ${reg.yearLevel}</strong>
            <small>${new Date(reg.createdAt).toLocaleString()}</small>
          </div>
          <span class="student-history-status status-${reg.status || 'pending'}">${reg.status || 'Pending'}</span>
        </div>
        <div class="student-history-details">
          <div><span>Slot:</span> ${reg.timeSlotLabel || 'Not selected'}</div>
          <div><span>Payment:</span> ₱${reg.expectedPaymentAmount}</div>
        </div>
        ${reg.adminNotes ? `<div class="student-history-notes">${reg.adminNotes}</div>` : ''}
      </div>
    `).join('');

  } catch (err) {
    console.error("History load error:", err);
    historyList.innerHTML = `<div class="overview-empty">${escapeHtml(err.message || "Failed to load history. Refresh page.")}</div>`;
  }
}

initStudentHistory();

  const logoutBtn = document.getElementById("studentLogoutBtn");
  const startRegistrationBtn = document.getElementById("startRegistrationBtn");
  const logoutModalOverlay = document.getElementById("logoutModalOverlay");
  const confirmLogoutBtn = document.querySelector("[data-confirm-logout]");
  const cancelLogoutBtn = document.querySelector("[data-cancel-logout]");
  const closeDecisionBtn = document.querySelector("[data-close-decision]");
  const decisionActionBtn = document.querySelector("[data-decision-action]");
  const decisionModalOverlay = document.getElementById("decisionModalOverlay");
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

  if (closeDecisionBtn) {
    closeDecisionBtn.addEventListener("click", closeDecisionModal);
  }

  if (decisionActionBtn) {
    decisionActionBtn.addEventListener("click", handleDecisionModalAction);
  }

  if (decisionModalOverlay) {
    decisionModalOverlay.addEventListener("click", closeDecisionModal);
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
      closeDecisionModal();
      closeStudentNotifications();
      closeStudentSearch();
    }
  });

  document.addEventListener("click", (event) => {
    const overviewAction = event.target.closest("[data-student-overview-action]");

    if (overviewAction) {
      showStudentView("#preRegistrationSection");
      setActiveStudentSectionLink(document.querySelector('[href="#preRegistrationSection"]'));
    }
  });

  window.addEventListener("focus", refreshStudentRegistrationDecision);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshStudentRegistrationDecision();
    }
  });
  setInterval(refreshStudentRegistrationDecision, 30000);
});

let availableSlots = [];
let currentRegistration = null;
let studentNotifications = [];
const studentNotificationsSeenKey = "enrollsched.studentNotifications.seen";
const studentDecisionSeenKey = "enrollsched.studentDecision.seen";

const studentSearchItems = [
  {
    title: "Overview",
    description: "View your status, stats, reminders, and quick actions.",
    keywords: ["overview", "home", "dashboard", "status", "stats", "reminder"],
    target: "#studentOverviewSection"
  },
  {
    title: "Register",
    description: "Submit or update your enrollment visit request.",
    keywords: ["register", "registration", "form", "com", "receipt", "payment", "evidence", "requirements"],
    target: "#preRegistrationSection"
  },
  {
    title: "Schedule",
    description: "Check available time slots and slot capacity.",
    keywords: ["schedule", "slot", "time", "available", "availability", "full", "capacity", "seat"],
    target: "#studentScheduleSection"
  },
  {
    title: "History",
    description: "Review previous registration submissions and statuses.",
    keywords: ["history", "records", "record", "previous", "approved", "rejected", "pending"],
    target: "#studentHistorySection"
  },
  {
    title: "Notifications",
    description: "Open registration updates and reminders.",
    keywords: ["notification", "notifications", "update", "updates", "bell", "alert"],
    action: "notifications"
  }
];

function initStudentNotifications() {
  const button = document.getElementById("studentNotificationBtn");
  const panel = document.getElementById("studentNotificationPanel");
  const list = panel?.querySelector(".student-notification-list");

  if (!button || !panel) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeStudentSearch();
    renderStudentNotifications();
    const isOpen = panel.classList.toggle("active");
    panel.setAttribute("aria-hidden", String(!isOpen));
    button.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      markStudentNotificationsSeen();
      renderStudentNotifications();
    }
  });

  list?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-student-notification-index]");

    if (!item) return;

    executeStudentNotification(studentNotifications[Number(item.dataset.studentNotificationIndex)]);
  });

  panel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  renderStudentNotifications();
  document.addEventListener("click", closeStudentNotifications);
}

function closeStudentNotifications() {
  const button = document.getElementById("studentNotificationBtn");
  const panel = document.getElementById("studentNotificationPanel");

  if (!button || !panel || !panel.classList.contains("active")) return;

  panel.classList.remove("active");
  panel.setAttribute("aria-hidden", "true");
  button.setAttribute("aria-expanded", "false");
}

function getStudentNotifications() {
  const notifications = [];
  const bookableSlots = availableSlots.filter((slot) => Boolean(slot.isActive) && !Boolean(slot.isBreak));
  const openSlots = bookableSlots.filter((slot) => !Boolean(slot.isFull));
  const uploadedProofs = [
    currentRegistration?.comEvidencePath,
    currentRegistration?.receiptEvidencePath
  ].filter(Boolean).length;

  if (!currentRegistration) {
    notifications.push({
      title: "Start your registration",
      message: "Submit your details and choose an enrollment visit slot.",
      meta: "Action needed",
      target: "#preRegistrationSection",
      unread: true
    });
  } else if (currentRegistration.status === "rejected") {
    notifications.push({
      title: "Registration needs update",
      message: currentRegistration.rejectionReason || "Your request was rejected. Review and resubmit your details.",
      meta: "Admin review",
      target: "#preRegistrationSection",
      unread: true
    });
  } else if (["approved", "confirmed"].includes(currentRegistration.status)) {
    notifications.push({
      title: "Registration approved",
      message: `Prepare for your scheduled visit: ${currentRegistration.preferredTimeSlot || currentRegistration.slotLabel || "selected slot"}.`,
      meta: "Approved",
      target: "#studentScheduleSection",
      unread: true
    });
  } else {
    notifications.push({
      title: "Registration under review",
      message: "Your request is waiting for admin checking.",
      meta: "Pending",
      target: "#preRegistrationSection",
      unread: true
    });
  }

  if (currentRegistration && uploadedProofs < 2) {
    notifications.push({
      title: "Evidence upload reminder",
      message: "Add COM and receipt images if available to help staff review faster.",
      meta: `${uploadedProofs}/2 uploaded`,
      target: "#preRegistrationSection",
      unread: uploadedProofs === 0
    });
  }

  if (openSlots.length > 0) {
    const seatsLeft = openSlots.reduce((total, slot) => total + Number(slot.remainingSlots || 0), 0);

    notifications.push({
      title: "Slots are available",
      message: `${openSlots.length} slot${openSlots.length === 1 ? "" : "s"} open with ${seatsLeft} total seat${seatsLeft === 1 ? "" : "s"} left.`,
      meta: "Schedule",
      target: "#studentScheduleSection",
      unread: false
    });
  }

  return notifications;
}

function renderStudentNotifications() {
  const panel = document.getElementById("studentNotificationPanel");
  const badge = document.querySelector(".student-notification-badge");
  const headerMeta = panel?.querySelector(".student-notification-header small");
  const list = panel?.querySelector(".student-notification-list");

  if (!panel || !list) return;

  studentNotifications = getStudentNotifications();
  const unseenCount = getUnseenStudentNotificationCount(studentNotifications);

  if (badge) {
    badge.textContent = String(unseenCount);
    badge.hidden = unseenCount === 0;
  }

  if (headerMeta) {
    headerMeta.textContent = studentNotifications.length
      ? `${studentNotifications.length} update${studentNotifications.length === 1 ? "" : "s"}`
      : "Clear";
  }

  if (studentNotifications.length === 0) {
    list.innerHTML = `
      <div class="student-notification-empty">
        <strong>No updates right now</strong>
        <p>Important registration and schedule updates will appear here.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = studentNotifications
    .map((notification, index) => `
      <button class="student-notification-item ${notification.unread && unseenCount > 0 ? "is-unread" : ""}" type="button" data-student-notification-index="${index}">
        <span></span>
        <div>
          <strong>${escapeHtml(notification.title)}</strong>
          <p>${escapeHtml(notification.message)}</p>
          <small>${escapeHtml(notification.meta)}</small>
        </div>
      </button>
    `)
    .join("");
}

function getStudentNotificationSignature(notifications = studentNotifications) {
  return notifications
    .map((notification) => `${notification.title}|${notification.message}|${notification.meta}`)
    .join("::");
}

function getUnseenStudentNotificationCount(notifications = studentNotifications) {
  if (notifications.length === 0) return 0;

  const signature = getStudentNotificationSignature(notifications);

  if (localStorage.getItem(studentNotificationsSeenKey) === signature) {
    return 0;
  }

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  return unreadCount || notifications.length;
}

function markStudentNotificationsSeen() {
  if (studentNotifications.length === 0) return;

  localStorage.setItem(
    studentNotificationsSeenKey,
    getStudentNotificationSignature(studentNotifications)
  );
}

function executeStudentNotification(notification) {
  if (!notification?.target) return;

  showStudentView(notification.target);
  setActiveStudentSectionLink(document.querySelector(`[href="${notification.target}"]`));
  closeStudentNotifications();
}

function initStudentSearch() {
  const wrapper = document.getElementById("studentSearchWrapper");
  const toggle = document.getElementById("studentSearchToggle");
  const input = document.getElementById("studentPortalSearch");
  const resultsPanel = document.getElementById("studentSearchResults");

  if (!wrapper || !toggle || !input || !resultsPanel) return;

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = wrapper.classList.toggle("active");
    toggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      closeStudentNotifications();
      setTimeout(() => input.focus(), 0);
    } else {
      clearStudentSearchResults();
    }
  });

  wrapper.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", closeStudentSearch);

  input.addEventListener("input", () => {
    renderStudentSearchResults(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleStudentSearch(input.value);
  });
}

function closeStudentSearch() {
  const wrapper = document.getElementById("studentSearchWrapper");
  const toggle = document.getElementById("studentSearchToggle");
  const resultsPanel = document.getElementById("studentSearchResults");

  if (!wrapper || !toggle) return;

  wrapper.classList.remove("active");
  toggle.setAttribute("aria-expanded", "false");

  if (resultsPanel) {
    clearStudentSearchResults();
  }
}

function handleStudentSearch(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) return;

  const [bestResult] = getStudentSearchResults(normalizedQuery);

  if (bestResult) {
    executeStudentSearchResult(bestResult);
    return;
  }

  renderStudentSearchResults(normalizedQuery, true);
}

function getStudentSearchResults(query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return studentSearchItems.slice(0, 4);
  }

  return studentSearchItems
    .map((item) => {
      const haystack = [item.title, item.description, ...(item.keywords || [])]
        .join(" ")
        .toLowerCase();
      const startsWithTitle = item.title.toLowerCase().startsWith(normalizedQuery);
      const keywordMatch = item.keywords?.some((keyword) => keyword.includes(normalizedQuery));
      const textMatch = haystack.includes(normalizedQuery);

      if (!startsWithTitle && !keywordMatch && !textMatch) return null;

      return {
        ...item,
        score: Number(startsWithTitle) * 3 + Number(keywordMatch) * 2 + Number(textMatch)
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);
}

function renderStudentSearchResults(query = "", showNoResults = false) {
  const resultsPanel = document.getElementById("studentSearchResults");

  if (!resultsPanel) return;

  if (!String(query || "").trim()) {
    clearStudentSearchResults();
    return;
  }

  const results = getStudentSearchResults(query);

  if (results.length === 0 && showNoResults) {
    resultsPanel.innerHTML = `
      <div class="student-search-empty">
        <strong>No result found</strong>
        <span>Try searching register, schedule, history, COM, receipt, or payment.</span>
      </div>
    `;
    resultsPanel.classList.add("active");
    return;
  }

  if (results.length === 0) {
    resultsPanel.classList.remove("active");
    resultsPanel.innerHTML = "";
    return;
  }

  resultsPanel.innerHTML = results
    .map((result, index) => `
      <button class="student-search-result" type="button" data-student-search-index="${index}">
        <span>${escapeHtml(result.title)}</span>
      </button>
    `)
    .join("");
  resultsPanel.classList.add("active");

  resultsPanel.querySelectorAll("[data-student-search-index]").forEach((button) => {
    button.addEventListener("click", () => {
      executeStudentSearchResult(results[Number(button.dataset.studentSearchIndex)]);
    });
  });
}

function clearStudentSearchResults() {
  const resultsPanel = document.getElementById("studentSearchResults");

  if (!resultsPanel) return;

  resultsPanel.classList.remove("active");
  resultsPanel.innerHTML = "";
}

function executeStudentSearchResult(result) {
  if (!result) return;

  if (result.action === "notifications") {
    closeStudentSearch();
    document.getElementById("studentNotificationBtn")?.click();
    return;
  }

  if (result.target) {
    showStudentView(result.target);
    setActiveStudentSectionLink(document.querySelector(`[href="${result.target}"]`));
  }

  closeStudentSearch();
}

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

function maybeShowRegistrationDecision(registration) {
  if (!registration || !["approved", "confirmed", "rejected"].includes(registration.status)) return;

  const decisionKey = getRegistrationDecisionKey(registration);

  if (localStorage.getItem(studentDecisionSeenKey) === decisionKey) return;

  openDecisionModal(registration);
}

function getRegistrationDecisionKey(registration) {
  return [
    registration.id,
    registration.status,
    registration.rejectionReason || "",
    registration.preferredTimeSlot || registration.slotLabel || ""
  ].join("|");
}

function openDecisionModal(registration) {
  const modal = document.getElementById("decisionModal");
  const overlay = document.getElementById("decisionModalOverlay");
  const icon = document.getElementById("decisionModalIcon");
  const kicker = document.getElementById("decisionModalKicker");
  const title = document.getElementById("decisionModalTitle");
  const message = document.getElementById("decisionModalMessage");
  const details = document.getElementById("decisionModalDetails");
  const actionButton = document.querySelector("[data-decision-action]");

  if (!modal || !overlay || !title || !message || !details || !actionButton) return;

  const isRejected = registration.status === "rejected";
  const schedule = registration.preferredTimeSlot || registration.slotLabel || "your selected slot";

  modal.dataset.registrationDecisionKey = getRegistrationDecisionKey(registration);
  modal.dataset.decisionTarget = isRejected ? "#preRegistrationSection" : "#studentScheduleSection";
  modal.classList.toggle("is-rejected", isRejected);
  modal.classList.toggle("is-approved", !isRejected);

  if (kicker) kicker.textContent = isRejected ? "Needs update" : "Approved request";
  title.textContent = isRejected ? "Your registration needs an update" : "Your registration was approved";
  message.textContent = isRejected
    ? "Please review the admin feedback and update your registration request."
    : "Your enrollment visit request has been approved. Please arrive during your selected schedule.";
  details.innerHTML = isRejected
    ? `<span>Reason</span><strong>${escapeHtml(registration.rejectionReason || "Please review your submitted details.")}</strong>`
    : `<span>Schedule</span><strong>${escapeHtml(schedule)}</strong>`;
  actionButton.textContent = isRejected ? "Update Register" : "View Schedule";

  icon?.setAttribute("aria-label", isRejected ? "Rejected registration" : "Approved registration");
  modal.classList.add("active");
  overlay.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDecisionModal() {
  const modal = document.getElementById("decisionModal");
  const overlay = document.getElementById("decisionModalOverlay");

  if (!modal || !overlay || !modal.classList.contains("active")) return;

  if (modal.dataset.registrationDecisionKey) {
    localStorage.setItem(studentDecisionSeenKey, modal.dataset.registrationDecisionKey);
  }

  modal.classList.remove("active");
  overlay.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function handleDecisionModalAction() {
  const modal = document.getElementById("decisionModal");
  const target = modal?.dataset.decisionTarget;

  closeDecisionModal();

  if (!target) return;

  showStudentView(target);
  setActiveStudentSectionLink(document.querySelector(`[href="${target}"]`));
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
    renderStudentNotifications();
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
    renderStudentNotifications();
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

      const isActive = Boolean(slot.isActive);
      const isFull = Boolean(slot.isFull);
      const statusText = !isActive ? "Unavailable" : isFull ? "Full" : "Available";
      const statusClass = !isActive ? "status-unavailable" : isFull ? "status-pending" : "status-approved";
      const capacity = Number(slot.capacity || 0);
      const bookedCount = Number(slot.bookedCount || 0);
      const remainingSlots = Number(slot.remainingSlots || Math.max(capacity - bookedCount, 0));
      const countText = !isActive
        ? "Temporarily closed by staff"
        : `${remainingSlots} seat${remainingSlots === 1 ? "" : "s"} remaining`;
      const fillPercentage = capacity > 0 ? Math.min(Math.round((bookedCount / capacity) * 100), 100) : 0;

      return `
        <div class="timeslot-card student-timeslot-card ${isFull ? "is-full" : ""} ${!isActive ? "is-unavailable" : ""}">
          <div class="timeslot-card-header">
            <div>
              <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
              <div class="timeslot-count">${escapeHtml(countText)}</div>
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

async function loadMyPreRegistration({ silent = false } = {}) {
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
    } else {
      currentRegistration = null;
    }

    renderStudentOverview();
    renderStudentNotifications();
    maybeShowRegistrationDecision(data.registration);
  } catch (error) {
    if (!silent) {
      setPreRegistrationMessage(error.message, "error");
    }
    renderStudentOverview();
    renderStudentNotifications();
  }
}

async function refreshStudentRegistrationDecision() {
  await loadMyPreRegistration({ silent: true });
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
    renderStudentNotifications();
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
  renderStudentOverviewStats();
  renderStudentOverviewRegistration();
  renderStudentOverviewSlots();
  renderStudentOverviewReminder();
}

function renderStudentOverviewStats() {
  const openSlotsCount = document.getElementById("studentOpenSlotsCount");
  const seatsLeftCount = document.getElementById("studentSeatsLeftCount");
  const minimumFeeCount = document.getElementById("studentMinimumFeeCount");
  const proofsUploadedCount = document.getElementById("studentProofsUploadedCount");

  const bookableSlots = availableSlots.filter((slot) => Boolean(slot.isActive) && !Boolean(slot.isBreak));
  const openSlots = bookableSlots.filter((slot) => !Boolean(slot.isFull));
  const seatsLeft = bookableSlots.reduce((total, slot) => total + Number(slot.remainingSlots || 0), 0);
  const uploadedProofs = [currentRegistration?.comEvidencePath, currentRegistration?.receiptEvidencePath]
    .filter(Boolean)
    .length;

  if (openSlotsCount) openSlotsCount.textContent = String(openSlots.length);
  if (seatsLeftCount) seatsLeftCount.textContent = String(seatsLeft);
  if (minimumFeeCount) minimumFeeCount.textContent = "500";
  if (proofsUploadedCount) proofsUploadedCount.textContent = String(uploadedProofs);
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

async function readJsonResponse(response, fallbackMessage = "Request failed.") {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  await response.text();
  throw new Error(fallbackMessage);
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatus(value) {
  if (value === "confirmed") return "Approved";
  return titleCase(value);
}

function formatHistoryDate(value) {
  if (!value) return "Date pending";

  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
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
