CREATE DATABASE IF NOT EXISTS enrollsched_db;
USE enrollsched_db;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_label VARCHAR(50) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pre_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    time_slot_id INT NULL,
    course VARCHAR(100) NOT NULL,
    year_level VARCHAR(30) NOT NULL,
    preferred_time_slot VARCHAR(50) NOT NULL,
    expected_payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    fee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    com_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    balance_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    receipt_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'confirmed') DEFAULT 'pending',
    rejection_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pre_registrations_student
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_pre_registrations_time_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL
);

SET @time_slot_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'time_slot_id'
);

SET @add_time_slot_column_sql = IF(
    @time_slot_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN time_slot_id INT NULL AFTER student_id',
    'SELECT "time_slot_id column already exists"'
);

PREPARE add_time_slot_column_stmt FROM @add_time_slot_column_sql;
EXECUTE add_time_slot_column_stmt;
DEALLOCATE PREPARE add_time_slot_column_stmt;

SET @time_slot_fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND CONSTRAINT_NAME = 'fk_pre_registrations_time_slot'
);

SET @add_time_slot_fk_sql = IF(
    @time_slot_fk_exists = 0,
    'ALTER TABLE pre_registrations ADD CONSTRAINT fk_pre_registrations_time_slot FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL',
    'SELECT "time_slot_id foreign key already exists"'
);

PREPARE add_time_slot_fk_stmt FROM @add_time_slot_fk_sql;
EXECUTE add_time_slot_fk_stmt;
DEALLOCATE PREPARE add_time_slot_fk_stmt;

SET @fee_acknowledged_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'fee_acknowledged'
);

SET @add_fee_acknowledged_column_sql = IF(
    @fee_acknowledged_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN fee_acknowledged BOOLEAN NOT NULL DEFAULT FALSE AFTER preferred_time_slot',
    'SELECT "fee_acknowledged column already exists"'
);

PREPARE add_fee_acknowledged_column_stmt FROM @add_fee_acknowledged_column_sql;
EXECUTE add_fee_acknowledged_column_stmt;
DEALLOCATE PREPARE add_fee_acknowledged_column_stmt;

SET @expected_payment_amount_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'expected_payment_amount'
);

SET @add_expected_payment_amount_column_sql = IF(
    @expected_payment_amount_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN expected_payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 500.00 AFTER preferred_time_slot',
    'SELECT "expected_payment_amount column already exists"'
);

PREPARE add_expected_payment_amount_column_stmt FROM @add_expected_payment_amount_column_sql;
EXECUTE add_expected_payment_amount_column_stmt;
DEALLOCATE PREPARE add_expected_payment_amount_column_stmt;

SET @com_acknowledged_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'com_acknowledged'
);

SET @add_com_acknowledged_column_sql = IF(
    @com_acknowledged_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN com_acknowledged BOOLEAN NOT NULL DEFAULT FALSE AFTER fee_acknowledged',
    'SELECT "com_acknowledged column already exists"'
);

PREPARE add_com_acknowledged_column_stmt FROM @add_com_acknowledged_column_sql;
EXECUTE add_com_acknowledged_column_stmt;
DEALLOCATE PREPARE add_com_acknowledged_column_stmt;

SET @balance_acknowledged_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'balance_acknowledged'
);

SET @add_balance_acknowledged_column_sql = IF(
    @balance_acknowledged_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN balance_acknowledged BOOLEAN NOT NULL DEFAULT FALSE AFTER com_acknowledged',
    'SELECT "balance_acknowledged column already exists"'
);

PREPARE add_balance_acknowledged_column_stmt FROM @add_balance_acknowledged_column_sql;
EXECUTE add_balance_acknowledged_column_stmt;
DEALLOCATE PREPARE add_balance_acknowledged_column_stmt;

SET @receipt_acknowledged_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'receipt_acknowledged'
);

SET @add_receipt_acknowledged_column_sql = IF(
    @receipt_acknowledged_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN receipt_acknowledged BOOLEAN NOT NULL DEFAULT FALSE AFTER balance_acknowledged',
    'SELECT "receipt_acknowledged column already exists"'
);

PREPARE add_receipt_acknowledged_column_stmt FROM @add_receipt_acknowledged_column_sql;
EXECUTE add_receipt_acknowledged_column_stmt;
DEALLOCATE PREPARE add_receipt_acknowledged_column_stmt;

ALTER TABLE pre_registrations
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled', 'confirmed') DEFAULT 'pending';

SET @rejection_reason_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pre_registrations'
        AND COLUMN_NAME = 'rejection_reason'
);

SET @add_rejection_reason_column_sql = IF(
    @rejection_reason_column_exists = 0,
    'ALTER TABLE pre_registrations ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER status',
    'SELECT "rejection_reason column already exists"'
);

PREPARE add_rejection_reason_column_stmt FROM @add_rejection_reason_column_sql;
EXECUTE add_rejection_reason_column_stmt;
DEALLOCATE PREPARE add_rejection_reason_column_stmt;


UPDATE time_slots
SET is_active = FALSE
WHERE slot_label IN (
    '8:00 AM - 8:30 AM',
    '8:30 AM - 9:00 AM',
    '9:00 AM - 9:30 AM',
    '9:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '1:00 PM - 1:30 PM',
    '1:30 PM - 2:00 PM',
    '2:00 PM - 2:30 PM',
    '2:30 PM - 3:00 PM'
);

-- Default enrollment appointment slots for demo/testing.
-- One-hour slots from 8 AM to 5 PM, with a lunch break from 12 PM to 1 PM.
INSERT INTO time_slots (slot_label, start_time, end_time, capacity, is_active)
VALUES
    ('8:00 AM - 9:00 AM', '08:00:00', '09:00:00', 5, TRUE),
    ('9:00 AM - 10:00 AM', '09:00:00', '10:00:00', 5, TRUE),
    ('10:00 AM - 11:00 AM', '10:00:00', '11:00:00', 5, TRUE),
    ('11:00 AM - 12:00 PM', '11:00:00', '12:00:00', 5, TRUE),
    ('12:00 PM - 1:00 PM (Lunch Break)', '12:00:00', '13:00:00', 0, FALSE),
    ('1:00 PM - 2:00 PM', '13:00:00', '14:00:00', 5, TRUE),
    ('2:00 PM - 3:00 PM', '14:00:00', '15:00:00', 5, TRUE),
    ('3:00 PM - 4:00 PM', '15:00:00', '16:00:00', 5, TRUE),
    ('4:00 PM - 5:00 PM', '16:00:00', '17:00:00', 5, TRUE)
ON DUPLICATE KEY UPDATE
    start_time = VALUES(start_time),
    end_time = VALUES(end_time),
    capacity = VALUES(capacity),
    is_active = VALUES(is_active);

INSERT INTO admins (admin_id, full_name, password_hash)
VALUES (
    'admin001',
    'System Administrator',
    '$2b$10$JJjuNMtmSGE7hjvjO4PweOPOqtLiAWzdfdPtfomg6vUocQ4.PbFSi'
)
ON DUPLICATE KEY UPDATE admin_id = admin_id;