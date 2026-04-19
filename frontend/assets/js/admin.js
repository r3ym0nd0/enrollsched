let adminRegistrations = [];
let selectedRegistrationId = null;

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

    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const reviewOverlay = document.getElementById('reviewModalOverlay');

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', openSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', closeSidebar);
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-save-capacity]');

        if (button) {
            saveSlotCapacity(button);
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

    if (reviewOverlay) {
        reviewOverlay.addEventListener('click', closeReviewPanel);
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
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
        const response = await fetch('/api/auth/admin/me');

        if (!response.ok) {
            window.location.href = 'admin-login.html';
            return;
        }

        const data = await response.json();
        const adminName = document.getElementById('adminName');

        if (adminName && data.admin && data.admin.fullName) {
            adminName.textContent = data.admin.fullName;
        }
    } catch (error) {
        window.location.href = 'admin-login.html';
    }
}

async function logoutAdmin() {
    await fetch('/api/auth/admin/logout', {
        method: 'POST'
    });

    window.location.href = 'admin-login.html';
}

async function loadAdminDashboard() {
    try {
        const response = await fetch('/api/admin/dashboard');

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'admin-login.html';
                return;
            }

            throw new Error('Unable to load dashboard data.');
        }

        const data = await response.json();

        adminRegistrations = data.registrations || [];
        renderAdminStats(data.stats);
        renderRegistrations(adminRegistrations);
        renderTimeSlots(data.timeSlots);

        if (selectedRegistrationId) {
            openReviewPanel(selectedRegistrationId);
        }
    } catch (error) {
        renderRegistrations([]);
        renderTimeSlots([]);
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

    if (registrations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8">No pre-registrations yet.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = registrations
        .map(registration => `
            <tr class="clickable-row" data-review-row="${registration.id}" tabindex="0">
                <td>
                    <strong>${escapeHtml(registration.studentName)}</strong>
                    <div class="table-muted">${escapeHtml(registration.studentId)}</div>
                    <span class="link-button" data-open-review="${registration.id}">Review details</span>
                </td>
                <td>${escapeHtml(registration.course)}</td>
                <td>${escapeHtml(registration.yearLevel)}</td>
                <td>${escapeHtml(registration.selectedTimeSlot)}</td>
                <td>${formatPeso(registration.expectedPaymentAmount || 500)}</td>
                <td>
                    <span class="status-badge ${hasCompleteRequirements(registration) ? 'status-approved' : 'status-pending'}">
                        ${hasCompleteRequirements(registration) ? 'Ready' : 'Incomplete'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${registration.feeAcknowledged ? 'status-approved' : 'status-pending'}">
                        ${registration.feeAcknowledged ? 'Acknowledged' : 'Pending'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${getStatusClass(registration.status)}">
                        ${formatStatus(registration.status)}
                    </span>
                </td>
            </tr>
        `)
        .join('');
}

function renderTimeSlots(timeSlots = []) {
    const slotGrid = document.getElementById('adminTimeSlotGrid');

    if (!slotGrid) return;

    if (timeSlots.length === 0) {
        slotGrid.innerHTML = `
            <div class="timeslot-card">
                <div class="timeslot-time">No time slots found</div>
                <div class="timeslot-count">Import the database schema to seed slots.</div>
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
                        <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
                        <div class="timeslot-count">Staff lunch break. No student appointments.</div>
                        <div class="timeslot-actions">
                            <span class="status-badge status-break">Break</span>
                            <span class="table-muted">12 PM - 1 PM</span>
                        </div>
                    </div>
                `;
            }

            const isFull = Boolean(slot.isFull);
            const statusText = isFull ? 'Full' : 'Available';
            const statusClass = isFull ? 'status-pending' : 'status-approved';

            return `
                <div class="timeslot-card ${isFull ? 'is-full' : ''}">
                    <div class="timeslot-time">${escapeHtml(slot.slotLabel)}</div>
                    <div class="timeslot-count">${slot.bookedCount} / ${slot.capacity} students</div>
                    <div class="capacity-editor">
                        <label for="slotCapacity${slot.id}">Capacity</label>
                        <input id="slotCapacity${slot.id}" type="number" min="${slot.bookedCount}" max="200" value="${slot.capacity}" data-capacity-input="${slot.id}">
                        <button class="btn btn-outline btn-sm" type="button" data-save-capacity="${slot.id}">Save</button>
                    </div>
                    <div class="timeslot-actions">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <span class="table-muted">${slot.remainingSlots} remaining</span>
                    </div>
                </div>
            `;
        })
        .join('');
}

async function saveSlotCapacity(button) {
    const slotId = button.getAttribute('data-save-capacity');
    const input = document.querySelector(`[data-capacity-input="${slotId}"]`);

    if (!input) return;

    const capacity = Number(input.value);
    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = 'Saving...';

        const response = await fetch(`/api/admin/time-slots/${slotId}/capacity`, {
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
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
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

    panel.innerHTML = `
        <div class="review-panel-card">
            <div class="review-panel-header">
                <div>
                    <span class="review-panel-kicker">Admin Review</span>
                    <h3>${escapeHtml(registration.studentName)}</h3>
                    <p>${escapeHtml(registration.studentId)}</p>
                </div>
                <button class="review-close-btn" type="button" data-close-review aria-label="Close review">&times;</button>
                <span class="status-badge ${getStatusClass(registration.status)}">${formatStatus(registration.status)}</span>
            </div>

            <div class="review-detail-grid">
                <div><span>Course</span><strong>${escapeHtml(registration.course)}</strong></div>
                <div><span>Year Level</span><strong>${escapeHtml(registration.yearLevel)}</strong></div>
                <div><span>Slot</span><strong>${escapeHtml(registration.selectedTimeSlot)}</strong></div>
                <div><span>Expected Amount</span><strong>${formatPeso(registration.expectedPaymentAmount || 500)}</strong></div>
                <div><span>Requirements</span><strong>${hasCompleteRequirements(registration) ? 'Ready' : 'Incomplete'}</strong></div>
                <div><span>Fee Notice</span><strong>${registration.feeAcknowledged ? 'Acknowledged' : 'Pending'}</strong></div>
            </div>

            ${registration.rejectionReason ? `<div class="review-note"><span>Latest Review Note</span><p>${escapeHtml(registration.rejectionReason)}</p></div>` : ''}

            <div class="review-reject-box">
                <span>Quick Reject Reasons</span>
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
                <button class="btn btn-primary btn-sm" type="button" data-review-status="approved" data-registration-id="${registration.id}" ${isReviewed ? 'disabled' : ''}>
                    ${isReviewed ? 'Approved' : 'Approve'}
                </button>
                <button class="btn btn-outline btn-sm" type="button" data-review-status="rejected" data-registration-id="${registration.id}" ${isRejected ? 'disabled' : ''}>
                    ${isRejected ? 'Rejected' : 'Reject'}
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

        const response = await fetch(`/api/admin/pre-registrations/${registrationId}/status`, {
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
    } catch (error) {
        alert(error.message);
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
        alert('Choose at least one rejection reason or add a custom note.');
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

function getStatusClass(status = '') {
    if (status === 'approved' || status === 'confirmed') return 'status-approved';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
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
