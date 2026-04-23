let adminRegistrations = [];
let selectedRegistrationId = null;
let registrationSearchTerm = '';
let registrationSortMode = 'newest';
let recordsStatusFilter = 'all';
let recordsSearchTerm = '';
let recordsSortMode = 'newest';
let studentSearchTerm = '';
let studentCourseFilter = 'all';
let studentYearFilter = 'all';
let dashboardLoadFailed = false;

const rejectionReasons = [
    'Unpaid tuition/installment balance',
    'Missing COM',
    'Invalid or missing receipt',
    'Payment below minimum',
    'ID number not found',
    'Other issue'
];

document.addEventListener('DOMContentLoaded', function() {
    checkAdminSession();
    loadAdminDashboard();
    setAdminDatePill();

    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const logoutModalOverlay = document.getElementById('logoutModalOverlay');
    const confirmLogoutBtn = document.querySelector('[data-confirm-logout]');
    const cancelLogoutBtn = document.querySelector('[data-cancel-logout]');
    const reviewOverlay = document.getElementById('reviewModalOverlay');
    const registrationSearchInput = document.getElementById('registrationSearchInput');
    const registrationSortSelect = document.getElementById('registrationSortSelect');
    const recordsSearchInput = document.getElementById('recordsSearchInput');
    const recordsSortSelect = document.getElementById('recordsSortSelect');
    const studentSearchInput = document.getElementById('studentSearchInput');
    const studentCourseSelect = document.getElementById('studentCourseFilter');
    const studentYearSelect = document.getElementById('studentYearFilter');
    const recordsStatusSelect = document.getElementById('recordsStatusFilter');
    const sectionLinks = document.querySelectorAll('[data-section-link]');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', openSidebar);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    sectionLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            setActiveSectionLink(link);
            showAdminView(link.getAttribute('href'));
            closeSidebar();
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', openLogoutModal);
    }

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', logoutAdmin);
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', closeLogoutModal);
    }

    if (logoutModalOverlay) {
        logoutModalOverlay.addEventListener('click', closeLogoutModal);
    }

    if (registrationSearchInput) {
        registrationSearchInput.addEventListener('input', event => {
            registrationSearchTerm = event.target.value;
            renderRegistrations(getFilteredPendingRegistrations());
        });
    }

    if (registrationSortSelect) {
        registrationSortSelect.addEventListener('change', event => {
            registrationSortMode = event.target.value;
            renderRegistrations(getFilteredPendingRegistrations());
        });
    }

    if (studentSearchInput) {
        studentSearchInput.addEventListener('input', event => {
            studentSearchTerm = event.target.value;
            renderStudents(adminRegistrations);
        });
    }

    if (studentCourseSelect) {
        studentCourseSelect.addEventListener('change', event => {
            studentCourseFilter = event.target.value;
            renderStudents(adminRegistrations);
        });
    }

    if (studentYearSelect) {
        studentYearSelect.addEventListener('change', event => {
            studentYearFilter = event.target.value;
            renderStudents(adminRegistrations);
        });
    }

    if (recordsSearchInput) {
        recordsSearchInput.addEventListener('input', event => {
            recordsSearchTerm = event.target.value;
            renderRecords(getFilteredRecords());
        });
    }

    if (recordsStatusSelect) {
        recordsStatusSelect.addEventListener('change', event => {
            recordsStatusFilter = event.target.value;
            renderRecords(getFilteredRecords());
        });
    }

    if (recordsSortSelect) {
        recordsSortSelect.addEventListener('change', event => {
            recordsSortMode = event.target.value;
            renderRecords(getFilteredRecords());
        });
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-save-capacity]');

        if (button) {
            saveSlotCapacity(button);
        }

        const availabilityButton = event.target.closest('[data-toggle-slot-availability]');

        if (availabilityButton) {
            toggleSlotAvailability(availabilityButton);
        }

        const reviewButton = event.target.closest('[data-review-status]');

        if (reviewButton) {
            updateRegistrationStatus(reviewButton);
        }

        const openReviewButton = event.target.closest('[data-open-review]');

        if (openReviewButton) {
            openReviewPanel(Number(openReviewButton.getAttribute('data-open-review')));
        }

        const reviewRow = event.target.closest('[data-review-row]');

        if (reviewRow && !event.target.closest('button, a, input, textarea, label')) {
            openReviewPanel(Number(reviewRow.getAttribute('data-review-row')));
        }

        const closeReviewButton = event.target.closest('[data-close-review]');

        if (closeReviewButton) {
            closeReviewPanel();
        }
    });

    document.addEventListener('input', event => {
        const capacityInput = event.target.closest('[data-capacity-input]');

        if (capacityInput) {
            clearCapacityError(capacityInput.getAttribute('data-capacity-input'));
        }
    });

    if (reviewOverlay) {
        reviewOverlay.addEventListener('click', closeReviewPanel);
    }

    document.addEventListener('keydown', event => {
        const capacityInput = event.target.closest('[data-capacity-input]');

        if (event.key === 'Enter' && capacityInput) {
            event.preventDefault();
            const slotId = capacityInput.getAttribute('data-capacity-input');
            const saveButton = document.querySelector(`[data-save-capacity="${slotId}"]`);

            if (saveButton && !saveButton.disabled) {
                saveSlotCapacity(saveButton);
            }

            return;
        }

        if (event.key === 'Escape') {
            closeLogoutModal();
            closeReviewPanel();
        }

        if (event.key === 'Enter') {
            const reviewRow = event.target.closest('[data-review-row]');

            if (reviewRow) {
                openReviewPanel(Number(reviewRow.getAttribute('data-review-row')));
            }
        }
    });
});

async function checkAdminSession() {
    try {
        const response = await apiFetch('/api/auth/admin/me');

        if (!response.ok) {
            window.location.href = '/admin-login';
            return;
        }

        const data = await response.json();
        const adminName = document.getElementById('adminName');

        if (adminName && data.admin && data.admin.fullName) {
            adminName.textContent = data.admin.fullName;
        }
    } catch (error) {
        window.location.href = '/admin-login';
    }
}

async function logoutAdmin() {
    await apiFetch('/api/auth/admin/logout', {
        method: 'POST'
    });

    window.location.href = '/admin-login';
}

function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    const overlay = document.getElementById('logoutModalOverlay');
    const confirmButton = document.querySelector('[data-confirm-logout]');

    if (!modal || !overlay) return;

    modal.classList.add('active');
    overlay.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (confirmButton) {
        confirmButton.focus();
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    const overlay = document.getElementById('logoutModalOverlay');

    if (!modal || !overlay || !modal.classList.contains('active')) return;

    modal.classList.remove('active');
    overlay.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

async function loadAdminDashboard() {
    try {
        const response = await apiFetch('/api/admin/dashboard');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin-login';
                return;
            }

            throw new Error('Unable to load dashboard data.');
        }

        const data = await response.json();

        dashboardLoadFailed = false;
        adminRegistrations = data.registrations || [];
        renderAdminStats(data.stats);
        renderRegistrations(getFilteredPendingRegistrations());
        renderRecords(getFilteredRecords());
        renderStudentFilterOptions(adminRegistrations);
        renderStudents(adminRegistrations);
        renderTimeSlots(data.timeSlots);
        renderOverview(adminRegistrations, data.timeSlots || []);

        if (selectedRegistrationId) {
            openReviewPanel(selectedRegistrationId);
        }
    } catch (error) {
        dashboardLoadFailed = true;
        renderRegistrations([]);
        renderRecords([]);
        renderStudentFilterOptions([]);
        renderStudents([]);
        renderTimeSlots([]);
        renderOverview([], []);
    }
}

function renderAdminStats(stats = {}) {
    setText('totalStudentsStat', stats.totalStudents ?? 0);
    setText('totalPreRegistrationsStat', stats.totalPreRegistrations ?? 0);
    setText('availableSlotsStat', stats.availableSlots ?? 0);
    setText('fullSlotsStat', stats.fullSlots ?? 0);
}

function renderRegistrations(registrations = []) {
    const tableBody = document.getElementById('registrationsTableBody');

    if (!tableBody) return;

    updatePendingRequestsCount();

    if (registrations.length === 0) {
        tableBody.innerHTML = renderTableState({
            colspan: 7,
            title: getPreRegistrationEmptyTitle(),
            message: getPreRegistrationEmptyMessage(),
            type: dashboardLoadFailed ? 'error' : 'empty'
        });
        return;
    }

    tableBody.innerHTML = registrations
        .map(registration => `
            <tr class="clickable-row" data-review-row="${registration.id}" tabindex="0">
                <td>
                    <strong>${escapeHtml(registration.studentName)}</strong>
                </td>
                <td>${escapeHtml(registration.studentId)}</td>
                <td title="${escapeHtml(registration.course)}">${escapeHtml(formatCourseCode(registration.course))}</td>
                <td>${escapeHtml(registration.yearLevel)}</td>
                <td>${escapeHtml(registration.selectedTimeSlot)}</td>
                <td>${formatPeso(registration.expectedPaymentAmount || 500)}</td>
                <td>
                    <span class="status-badge ${getStatusClass(registration.status)}">
                        ${formatStatus(registration.status)}
                    </span>
                </td>
            </tr>
        `)
        .join('');
}

function renderRecords(records = []) {
    const tableBody = document.getElementById('recordsTableBody');

    if (!tableBody) return;

    updateRecordsShownCount(records.length);

    if (records.length === 0) {
        tableBody.innerHTML = renderTableState({
            colspan: 7,
            title: dashboardLoadFailed ? 'Unable to load records' : 'No records to show',
            message: dashboardLoadFailed ? 'Please check the backend connection, then refresh the dashboard.' : 'Approved, rejected, and cancelled requests will appear here.',
            type: dashboardLoadFailed ? 'error' : 'empty'
        });
        return;
    }

    tableBody.innerHTML = records
        .map(registration => `
            <tr class="clickable-row" data-review-row="${registration.id}" tabindex="0">
                <td>
                    <strong>${escapeHtml(registration.studentName)}</strong>
                </td>
                <td>${escapeHtml(registration.studentId)}</td>
                <td title="${escapeHtml(registration.course)}">${escapeHtml(formatCourseCode(registration.course))}</td>
                <td>${escapeHtml(registration.yearLevel)}</td>
                <td>${escapeHtml(registration.selectedTimeSlot)}</td>
                <td>${formatPeso(registration.expectedPaymentAmount || 500)}</td>
                <td>
                    <span class="status-badge ${getStatusClass(registration.status)}">
                        ${formatStatus(registration.status)}
                    </span>
                </td>
            </tr>
        `)
        .join('');
}

function getFilteredPendingRegistrations() {
    const searchTerm = registrationSearchTerm.trim().toLowerCase();

    return adminRegistrations.filter(registration => {
        const status = normalizeStatus(registration.status);

        if (status !== 'pending') {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const searchableText = [
            registration.studentName,
            registration.studentId,
            registration.course,
            formatCourseCode(registration.course),
            registration.yearLevel,
            registration.selectedTimeSlot,
            formatStatus(registration.status)
        ].join(' ').toLowerCase();

        return searchableText.includes(searchTerm);
    }).sort(sortPendingRegistrations);
}

function sortPendingRegistrations(firstRegistration, secondRegistration) {
    if (registrationSortMode === 'oldest') {
        return getRegistrationTimestamp(firstRegistration) - getRegistrationTimestamp(secondRegistration);
    }

    if (registrationSortMode === 'slot') {
        return getSlotSortValue(firstRegistration.selectedTimeSlot) - getSlotSortValue(secondRegistration.selectedTimeSlot);
    }

    return getRegistrationTimestamp(secondRegistration) - getRegistrationTimestamp(firstRegistration);
}

function updatePendingRequestsCount() {
    const countElement = document.getElementById('pendingRequestsCount');

    if (!countElement) return;

    const pendingCount = adminRegistrations.filter(registration => normalizeStatus(registration.status) === 'pending').length;
    countElement.textContent = pendingCount;
}

function getRegistrationTimestamp(registration) {
    const createdAt = Date.parse(registration.createdAt || '');
    return Number.isNaN(createdAt) ? 0 : createdAt;
}

function getSlotSortValue(slotLabel = '') {
    const timeMatch = String(slotLabel).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

    if (!timeMatch) {
        return Number.MAX_SAFE_INTEGER;
    }

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();

    if (meridiem === 'PM' && hours !== 12) {
        hours += 12;
    }

    if (meridiem === 'AM' && hours === 12) {
        hours = 0;
    }

    return (hours * 60) + minutes;
}

function getFilteredRecords() {
    const statusFilter = recordsStatusFilter.toLowerCase();
    const searchTerm = recordsSearchTerm.trim().toLowerCase();
    const processedStatuses = ['approved', 'rejected', 'cancelled'];

    return adminRegistrations.filter(registration => {
        const status = normalizeStatus(registration.status);
        const isProcessed = processedStatuses.includes(status);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        if (!isProcessed || !matchesStatus) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const searchableText = [
            registration.studentName,
            registration.studentId,
            registration.course,
            formatCourseCode(registration.course),
            registration.yearLevel,
            registration.selectedTimeSlot,
            formatStatus(registration.status)
        ].join(' ').toLowerCase();

        return searchableText.includes(searchTerm);
    }).sort(sortRecords);
}

function sortRecords(firstRegistration, secondRegistration) {
    if (recordsSortMode === 'oldest') {
        return getRegistrationTimestamp(firstRegistration) - getRegistrationTimestamp(secondRegistration);
    }

    if (recordsSortMode === 'slot') {
        return getSlotSortValue(firstRegistration.selectedTimeSlot) - getSlotSortValue(secondRegistration.selectedTimeSlot);
    }

    return getRegistrationTimestamp(secondRegistration) - getRegistrationTimestamp(firstRegistration);
}

function updateRecordsShownCount(count) {
    const countElement = document.getElementById('recordsShownCount');

    if (!countElement) return;

    countElement.textContent = count;
}

function renderStudents(registrations = []) {
    const tableBody = document.getElementById('studentsTableBody');

    if (!tableBody) return;

    const students = getFilteredStudents(getUniqueStudents(registrations));
    updateStudentsShownCount(students.length);

    if (students.length === 0) {
        tableBody.innerHTML = renderTableState({
            colspan: 5,
            title: getStudentsEmptyTitle(),
            message: getStudentsEmptyMessage(),
            type: dashboardLoadFailed ? 'error' : 'empty'
        });
        return;
    }

    tableBody.innerHTML = students
        .map(student => `
            <tr class="clickable-row" data-review-row="${student.registrationId}" tabindex="0">
                <td><strong>${escapeHtml(student.studentName)}</strong></td>
                <td>${escapeHtml(student.studentId)}</td>
                <td title="${escapeHtml(student.course)}">${escapeHtml(formatCourseCode(student.course))}</td>
                <td>${escapeHtml(student.yearLevel)}</td>
                <td>${escapeHtml(student.selectedTimeSlot)}</td>
            </tr>
        `)
        .join('');
}

function getUniqueStudents(registrations = []) {
    const studentMap = new Map();

    registrations.forEach(registration => {
        const key = registration.studentId || registration.studentName;

        if (!studentMap.has(key)) {
            studentMap.set(key, {
                registrationId: registration.id,
                studentName: registration.studentName,
                studentId: registration.studentId,
                course: registration.course,
                yearLevel: registration.yearLevel,
                selectedTimeSlot: registration.selectedTimeSlot
            });
        }
    });

    return Array.from(studentMap.values());
}

function renderStudentFilterOptions(registrations = []) {
    const courseSelect = document.getElementById('studentCourseFilter');
    const yearSelect = document.getElementById('studentYearFilter');
    const students = getUniqueStudents(registrations);

    if (courseSelect) {
        const courses = [...new Set(students.map(student => student.course).filter(Boolean))]
            .sort((firstCourse, secondCourse) => formatCourseCode(firstCourse).localeCompare(formatCourseCode(secondCourse)));
        const currentValue = courseSelect.value || studentCourseFilter;

        courseSelect.innerHTML = `
            <option value="all">All courses</option>
            ${courses.map(course => `<option value="${escapeHtml(course)}">${escapeHtml(formatCourseCode(course))}</option>`).join('')}
        `;

        if (courses.includes(currentValue)) {
            courseSelect.value = currentValue;
        } else {
            courseSelect.value = 'all';
            studentCourseFilter = 'all';
        }
    }

    if (yearSelect) {
        const years = [...new Set(students.map(student => student.yearLevel).filter(Boolean))]
            .sort((firstYear, secondYear) => String(firstYear).localeCompare(String(secondYear)));
        const currentValue = yearSelect.value || studentYearFilter;

        yearSelect.innerHTML = `
            <option value="all">All years</option>
            ${years.map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('')}
        `;

        if (years.includes(currentValue)) {
            yearSelect.value = currentValue;
        } else {
            yearSelect.value = 'all';
            studentYearFilter = 'all';
        }
    }
}

function getFilteredStudents(students = []) {
    const searchTerm = studentSearchTerm.trim().toLowerCase();

    return students.filter(student => {
        const matchesCourse = studentCourseFilter === 'all' || student.course === studentCourseFilter;
        const matchesYear = studentYearFilter === 'all' || student.yearLevel === studentYearFilter;

        if (!matchesCourse || !matchesYear) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const searchableText = [
            student.studentName,
            student.studentId,
            student.course,
            formatCourseCode(student.course),
            student.yearLevel,
            student.selectedTimeSlot
        ].join(' ').toLowerCase();

        return searchableText.includes(searchTerm);
    });
}

function updateStudentsShownCount(count) {
    const countElement = document.getElementById('studentsShownCount');

    if (!countElement) return;

    countElement.textContent = count;
}

function renderTableState({ colspan, title, message, type = 'empty' }) {
    return `
        <tr>
            <td class="table-state-cell" colspan="${colspan}">
                <div class="table-state is-${type}">
                    <span class="table-state-icon">${type === 'error' ? '!' : ''}</span>
                    <strong>${escapeHtml(title)}</strong>
                    <p>${escapeHtml(message)}</p>
                </div>
            </td>
        </tr>
    `;
}

function getPreRegistrationEmptyTitle() {
    if (dashboardLoadFailed) return 'Unable to load requests';
    if (adminRegistrations.length === 0) return 'No requests yet';
    return 'No matching pending requests';
}

function getPreRegistrationEmptyMessage() {
    if (dashboardLoadFailed) return 'Please check the backend connection, then refresh the dashboard.';
    if (adminRegistrations.length === 0) return 'Student requests will appear here once they submit the registration form.';
    return 'Try adjusting the search term or sort option to find another pending request.';
}

function getStudentsEmptyTitle() {
    if (dashboardLoadFailed) return 'Unable to load students';
    if (adminRegistrations.length === 0) return 'No students yet';
    return 'No matching students';
}

function getStudentsEmptyMessage() {
    if (dashboardLoadFailed) return 'Please check the backend connection, then refresh the dashboard.';
    if (adminRegistrations.length === 0) return 'Students will appear here after they submit at least one request.';
    return 'Try changing the search, course, or year level filters.';
}

function renderOverview(registrations = [], timeSlots = []) {
    renderOverviewRecentActivity(registrations);
    renderOverviewAvailableSlots(timeSlots);
    renderOverviewQueueSummary(registrations, timeSlots);
    renderOverviewReadiness(registrations);
}

function renderOverviewRecentActivity(registrations = []) {
    const container = document.getElementById('overviewRecentActivity');

    if (!container) return;

    const recentRegistrations = registrations.slice(0, 5);

    if (recentRegistrations.length === 0) {
        container.innerHTML = '<div class="overview-empty">No request activity yet.</div>';
        return;
    }

    container.innerHTML = recentRegistrations
        .map(registration => `
            <button class="overview-list-item" type="button" data-open-review="${registration.id}">
                <span>
                    <strong>${escapeHtml(registration.studentName)}</strong>
                    <small>${escapeHtml(registration.studentId)} · ${escapeHtml(formatCourseCode(registration.course))}</small>
                </span>
                <span class="status-badge ${getStatusClass(registration.status)}">${formatStatus(registration.status)}</span>
            </button>
        `)
        .join('');
}

function renderOverviewAvailableSlots(timeSlots = []) {
    const container = document.getElementById('overviewAvailableSlots');

    if (!container) return;

    const availableSlots = timeSlots
        .filter(slot => slot.isActive && !slot.isBreak && !slot.isFull && Number(slot.remainingSlots) > 0)
        .slice(0, 4);

    if (availableSlots.length === 0) {
        container.innerHTML = '<div class="overview-empty">No available slots right now.</div>';
        return;
    }

    container.innerHTML = availableSlots
        .map(slot => `
            <div class="overview-list-item">
                <span>
                    <strong>${escapeHtml(slot.slotLabel)}</strong>
                    <small>${slot.bookedCount} / ${slot.capacity} students booked</small>
                </span>
                <span class="overview-slot-count">${slot.remainingSlots} left</span>
            </div>
        `)
        .join('');
}

function renderOverviewQueueSummary(registrations = [], timeSlots = []) {
    const container = document.getElementById('overviewQueueSummary');

    if (!container) return;

    const pendingCount = registrations.filter(registration => normalizeStatus(registration.status) === 'pending').length;
    const approvedCount = registrations.filter(registration => normalizeStatus(registration.status) === 'approved').length;
    const fullSlotCount = timeSlots.filter(slot => slot.isActive && !slot.isBreak && slot.isFull).length;
    const availableSlotCount = timeSlots.filter(slot => slot.isActive && !slot.isBreak && !slot.isFull && Number(slot.remainingSlots) > 0).length;

    container.innerHTML = `
        <div class="queue-summary-item">
            <span>Needs Review</span>
            <strong>${pendingCount}</strong>
        </div>
        <div class="queue-summary-item">
            <span>Ready Students</span>
            <strong>${approvedCount}</strong>
        </div>
        <div class="queue-summary-item">
            <span>Available Slots</span>
            <strong>${availableSlotCount}</strong>
        </div>
        <div class="queue-summary-item">
            <span>Full Slots</span>
            <strong>${fullSlotCount}</strong>
        </div>
    `;
}

function renderOverviewReadiness(registrations = []) {
    const container = document.getElementById('overviewReadiness');

    if (!container) return;

    const totalCount = registrations.length;
    const readyCount = registrations.filter(registration => hasCompleteRequirements(registration) && registration.feeAcknowledged).length;
    const incompleteCount = Math.max(totalCount - readyCount, 0);
    const readyRate = totalCount === 0 ? 0 : Math.round((readyCount / totalCount) * 100);

    container.innerHTML = `
        <div class="readiness-meter">
            <div class="readiness-meter-header">
                <span>Ready Rate</span>
                <strong>${readyRate}%</strong>
            </div>
            <div class="readiness-track">
                <span style="width: ${readyRate}%"></span>
            </div>
        </div>
        <div class="queue-summary-list readiness-list">
            <div class="queue-summary-item">
                <span>Ready</span>
                <strong>${readyCount}</strong>
            </div>
            <div class="queue-summary-item">
                <span>Incomplete</span>
                <strong>${incompleteCount}</strong>
            </div>
        </div>
    `;
}

function setActiveSectionLink(activeLink) {
    document.querySelectorAll('[data-section-link]').forEach(link => {
        link.classList.toggle('active', link === activeLink);
    });

    const currentView = document.querySelector('#adminCurrentView span:last-child');

    if (currentView) {
        currentView.textContent = activeLink.textContent.trim();
    }
}

function setAdminDatePill() {
    const datePill = document.getElementById('adminDatePill');

    if (!datePill) return;

    datePill.textContent = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date());
}

function showAdminView(targetSelector) {
    const targetView = document.querySelector(targetSelector);

    if (!targetView) return;

    document.querySelectorAll('.admin-view').forEach(view => {
        const isActive = view === targetView;
        view.hidden = !isActive;
        view.classList.toggle('active', isActive);
    });

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function formatCourseCode(course = '') {
    const normalizedCourse = course.trim().toLowerCase();
    const courseCodes = {
        'bachelor of science in information systems': 'BSIS',
        'bachelor science of information system': 'BSIS',
        'bachelor of science in information system': 'BSIS',
        'bachelor of science in information technology': 'BSIT',
        'bachelor of science in computer science': 'BSCS',
        'bachelor of science in business administration': 'BSBA',
        'bachelor of science in accounting information system': 'BSAIS',
        'bachelor of secondary education': 'BSEd',
        'bachelor of elementary education': 'BEEd'
    };

    if (courseCodes[normalizedCourse]) {
        return courseCodes[normalizedCourse];
    }

    const acronym = course
        .replace(/\([^)]*\)/g, '')
        .split(/\s+/)
        .filter(word => !['of', 'in', 'and', 'the'].includes(word.toLowerCase()))
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    return acronym || course;
}

function renderTimeSlots(timeSlots = []) {
    const slotGrid = document.getElementById('adminTimeSlotGrid');

    if (!slotGrid) return;

    if (timeSlots.length === 0) {
        slotGrid.innerHTML = `
            <div class="timeslot-card timeslot-empty-card">
                <div class="table-state is-${dashboardLoadFailed ? 'error' : 'empty'}">
                    <span class="table-state-icon">${dashboardLoadFailed ? '!' : ''}</span>
                    <strong>${dashboardLoadFailed ? 'Unable to load time slots' : 'No time slots found'}</strong>
                    <p>${dashboardLoadFailed ? 'Please check the backend connection, then refresh the dashboard.' : 'Import the database schema to seed the enrollment schedule.'}</p>
                </div>
            </div>
        `;
        return;
    }

    slotGrid.innerHTML = timeSlots
        .map(slot => {
            const isBreak = Boolean(slot.isBreak);

            if (isBreak) {
                return `
                    <div class="timeslot-card timeslot-break-card">
                        <div class="timeslot-card-header">
                            <div>
                                <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
                                <div class="timeslot-count">Staff lunch break. No student appointments.</div>
                            </div>
                            <span class="status-badge status-break">Break</span>
                        </div>
                        <div class="timeslot-break-note">Students cannot book this hour so staff can reset the queue before afternoon enrollment resumes.</div>
                        <div class="timeslot-actions">
                            <span class="table-muted">12 PM - 1 PM</span>
                        </div>
                    </div>
                `;
            }

            const isActive = Boolean(slot.isActive);
            const isFull = Boolean(slot.isFull);
            const statusText = !isActive ? 'Unavailable' : isFull ? 'Full' : 'Available';
            const statusClass = !isActive ? 'status-unavailable' : isFull ? 'status-pending' : 'status-approved';
            const bookedCount = Number(slot.bookedCount || 0);
            const capacity = Number(slot.capacity || 0);
            const occupancyRate = capacity === 0 ? 0 : Math.min(Math.round((bookedCount / capacity) * 100), 100);
            const availabilityAction = isActive ? 'Disable' : 'Enable';
            const countText = isActive
                ? `${bookedCount} / ${capacity} students booked`
                : `${bookedCount} booked - hidden from student booking`;

            return `
                <div class="timeslot-card ${isFull ? 'is-full' : ''} ${!isActive ? 'is-unavailable' : ''}">
                    <div class="timeslot-card-header">
                        <div>
                            <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
                            <div class="timeslot-count">${escapeHtml(countText)}</div>
                        </div>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="timeslot-meter" aria-label="${occupancyRate}% occupied">
                        <span style="width: ${occupancyRate}%"></span>
                    </div>
                    <div class="capacity-editor">
                        <label for="slotCapacity${slot.id}">Capacity</label>
                        <input id="slotCapacity${slot.id}" type="number" min="${bookedCount}" max="200" value="${capacity}" data-capacity-input="${slot.id}">
                        <button class="btn btn-outline btn-sm" type="button" data-save-capacity="${slot.id}">Save</button>
                        <small class="capacity-error" data-capacity-error="${slot.id}"></small>
                    </div>
                    <div class="timeslot-actions">
                        <span class="table-muted">${slot.remainingSlots} remaining</span>
                        <span class="table-muted">${occupancyRate}% occupied</span>
                    </div>
                    <button class="btn btn-outline btn-sm timeslot-availability-btn" type="button" data-toggle-slot-availability="${slot.id}" data-slot-active="${isActive}">
                        ${availabilityAction} Slot
                    </button>
                </div>
            `;
        })
        .join('');
}

async function toggleSlotAvailability(button) {
    const slotId = button.getAttribute('data-toggle-slot-availability');
    const currentlyActive = button.getAttribute('data-slot-active') === 'true';
    const nextIsActive = !currentlyActive;
    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = nextIsActive ? 'Enabling...' : 'Disabling...';

        const response = await apiFetch(`/api/admin/time-slots/${slotId}/availability`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: nextIsActive })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to update slot availability.');
        }

        await loadAdminDashboard();
        showAdminToast(`Slot ${nextIsActive ? 'enabled' : 'disabled'}.`, 'success');
    } catch (error) {
        showAdminToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function saveSlotCapacity(button) {
    const slotId = button.getAttribute('data-save-capacity');
    const input = document.querySelector(`[data-capacity-input="${slotId}"]`);

    if (!input) return;

    const capacity = Number(input.value);
    const minimumCapacity = Number(input.min || 1);
    const originalText = button.textContent;
    const validationMessage = getCapacityValidationMessage(capacity, minimumCapacity);

    clearCapacityError(slotId);

    if (validationMessage) {
        showCapacityError(slotId, validationMessage);
        showAdminToast(validationMessage, 'error');
        return;
    }

    try {
        button.disabled = true;
        button.textContent = 'Saving...';

        const response = await apiFetch(`/api/admin/time-slots/${slotId}/capacity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ capacity })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to update capacity.');
        }

        await loadAdminDashboard();
        showAdminToast('Slot capacity updated.', 'success');
    } catch (error) {
        showCapacityError(slotId, error.message);
        showAdminToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function getCapacityValidationMessage(capacity, minimumCapacity) {
    if (!Number.isInteger(capacity)) {
        return 'Capacity must be a whole number.';
    }

    if (capacity < minimumCapacity) {
        return `Capacity cannot be lower than ${minimumCapacity} because students are already booked.`;
    }

    if (capacity > 200) {
        return 'Capacity must be between 1 and 200.';
    }

    return '';
}

function showCapacityError(slotId, message) {
    const input = document.querySelector(`[data-capacity-input="${slotId}"]`);
    const errorText = document.querySelector(`[data-capacity-error="${slotId}"]`);

    if (input) {
        input.classList.add('is-invalid');
    }

    if (errorText) {
        errorText.textContent = message;
    }
}

function clearCapacityError(slotId) {
    const input = document.querySelector(`[data-capacity-input="${slotId}"]`);
    const errorText = document.querySelector(`[data-capacity-error="${slotId}"]`);

    if (input) {
        input.classList.remove('is-invalid');
    }

    if (errorText) {
        errorText.textContent = '';
    }
}

function openReviewPanel(registrationId) {
    selectedRegistrationId = registrationId;
    const panel = document.getElementById('reviewPanel');
    const overlay = document.getElementById('reviewModalOverlay');
    const registration = adminRegistrations.find(item => Number(item.id) === Number(registrationId));

    if (!panel || !registration) return;

    const isReviewed = registration.status === 'approved' || registration.status === 'confirmed';
    const isRejected = registration.status === 'rejected';
    const requirementsReady = hasCompleteRequirements(registration);
    const feeAcknowledged = Boolean(registration.feeAcknowledged);
    const evidenceLinks = getEvidenceLinks(registration);

    panel.innerHTML = `
        <div class="review-panel-card">
            <div class="review-panel-header">
                <div class="review-panel-title">
                    <span class="review-panel-kicker">Admin Review</span>
                    <h3>${escapeHtml(registration.studentName)}</h3>
                    <p>Student ID: ${escapeHtml(registration.studentId)}</p>
                </div>
                <div class="review-panel-header-actions">
                    <span class="status-badge ${getStatusClass(registration.status)}">${formatStatus(registration.status)}</span>
                    <button class="review-close-btn" type="button" data-close-review aria-label="Close review">&times;</button>
                </div>
            </div>

            <div class="review-summary-band">
                <div>
                    <span>Selected Slot</span>
                    <strong>${escapeHtml(registration.selectedTimeSlot)}</strong>
                </div>
                <div>
                    <span>Expected Payment</span>
                    <strong>${formatPeso(registration.expectedPaymentAmount || 500)}</strong>
                </div>
            </div>

            <div class="review-section">
                <div class="review-section-header">
                    <span>Student Details</span>
                    <p>Basic information submitted by the student.</p>
                </div>
                <div class="review-detail-grid">
                    <div><span>Course</span><strong>${escapeHtml(registration.course)}</strong></div>
                    <div><span>Year Level</span><strong>${escapeHtml(registration.yearLevel)}</strong></div>
                    <div><span>Requirements</span><strong>${requirementsReady ? 'Ready' : 'Incomplete'}</strong></div>
                    <div><span>Fee Notice</span><strong>${feeAcknowledged ? 'Acknowledged' : 'Pending'}</strong></div>
                </div>
            </div>

            ${registration.rejectionReason ? `
                <div class="review-note">
                    <span>Latest Review Note</span>
                    <p>${escapeHtml(registration.rejectionReason)}</p>
                </div>
            ` : ''}

            <div class="review-section">
                <div class="review-section-header">
                    <span>Evidence Uploads</span>
                    <p>Optional COM and receipt images submitted by the student for pre-checking.</p>
                </div>
                <div class="review-evidence-grid">
                    ${evidenceLinks}
                </div>
            </div>

            <div class="review-section review-reject-box">
                <div class="review-section-header">
                    <span>Reject Reason</span>
                    <p>Choose common reasons, or add a short custom note.</p>
                </div>
                <div class="reason-chip-grid">
                    ${rejectionReasons.map(reason => `
                        <label class="reason-chip">
                            <input type="checkbox" value="${escapeHtml(reason)}" data-rejection-reason>
                            <span>${escapeHtml(reason)}</span>
                        </label>
                    `).join('')}
                </div>
                <label class="review-custom-note">
                    Additional note
                    <textarea id="reviewCustomNote" rows="3" placeholder="Optional details for the student or staff..."></textarea>
                </label>
            </div>

            <div class="review-panel-actions">
                <button class="btn btn-outline btn-sm" type="button" data-review-status="rejected" data-registration-id="${registration.id}" ${isRejected ? 'disabled' : ''}>
                    ${isRejected ? 'Rejected' : 'Reject Request'}
                </button>
                <button class="btn btn-primary btn-sm" type="button" data-review-status="approved" data-registration-id="${registration.id}" ${isReviewed ? 'disabled' : ''}>
                    ${isReviewed ? 'Approved' : 'Approve'}
                </button>
            </div>
        </div>
    `;

    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');

    if (overlay) {
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
    }

    document.body.style.overflow = 'hidden';
}

function getEvidenceLinks(registration) {
    const evidenceItems = [
        {
            label: 'COM Image',
            path: registration.comEvidencePath
        },
        {
            label: 'Receipt Image',
            path: registration.receiptEvidencePath
        }
    ];

    return evidenceItems
        .map(item => {
            if (!item.path) {
                return `
                    <div class="review-evidence-item is-empty">
                        <span>${escapeHtml(item.label)}</span>
                        <strong>Not uploaded</strong>
                    </div>
                `;
            }

            const evidenceUrl = typeof window.buildApiUrl === 'function'
                ? window.buildApiUrl(item.path)
                : item.path;

            return `
                <a class="review-evidence-item" href="${escapeHtml(evidenceUrl)}" target="_blank" rel="noopener">
                    <span>${escapeHtml(item.label)}</span>
                    <strong>View image</strong>
                </a>
            `;
        })
        .join('');
}

function closeReviewPanel() {
    const panel = document.getElementById('reviewPanel');
    const overlay = document.getElementById('reviewModalOverlay');

    selectedRegistrationId = null;

    if (panel) {
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
    }

    if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
    }

    document.body.style.overflow = '';
}

async function updateRegistrationStatus(button) {
    const registrationId = button.getAttribute('data-registration-id');
    const status = button.getAttribute('data-review-status');
    let rejectionReason = '';

    if (status === 'rejected') {
        rejectionReason = getReviewRejectionReason();

        if (!rejectionReason) return;
    }

    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = 'Saving...';

        const response = await apiFetch(`/api/admin/pre-registrations/${registrationId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status, rejectionReason })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to update review status.');
        }

        await loadAdminDashboard();
        showAdminToast(`Request ${status === 'approved' ? 'approved' : 'rejected'}.`, 'success');
    } catch (error) {
        showAdminToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function getReviewRejectionReason() {
    const selectedReasons = Array.from(document.querySelectorAll('[data-rejection-reason]:checked'))
        .map(input => input.value);
    const customNote = document.getElementById('reviewCustomNote')?.value.trim();
    const combinedReasons = [...selectedReasons];

    if (customNote) {
        combinedReasons.push(customNote);
    }

    if (combinedReasons.length === 0) {
        showAdminToast('Choose at least one rejection reason or add a custom note.', 'error');
        return '';
    }

    return combinedReasons.join('; ');
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function showAdminToast(message, type = 'info') {
    let toastStack = document.getElementById('adminToastStack');

    if (!toastStack) {
        toastStack = document.createElement('div');
        toastStack.id = 'adminToastStack';
        toastStack.className = 'admin-toast-stack';
        toastStack.setAttribute('aria-live', 'polite');
        document.body.appendChild(toastStack);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'error' ? '!' : ''}</span>
        <p>${escapeHtml(message)}</p>
    `;

    toastStack.appendChild(toast);

    window.setTimeout(() => {
        toast.classList.add('is-hiding');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3200);
}

function getStatusClass(status = '') {
    if (status === 'approved' || status === 'confirmed') return 'status-approved';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
}

function normalizeStatus(status = '') {
    if (status === 'confirmed') return 'approved';
    return status;
}

function formatStatus(value = '') {
    if (!value) return '';

    if (value === 'confirmed') return 'Approved';

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatPeso(value) {
    return `PHP ${Number(value).toLocaleString('en-PH', {
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
