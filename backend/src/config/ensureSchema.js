const db = require("./db");

const preRegistrationColumns = [
  {
    name: "time_slot_id",
    definition: "INT NULL AFTER student_id"
  },
  {
    name: "expected_payment_amount",
    definition: "DECIMAL(10, 2) NOT NULL DEFAULT 500.00 AFTER preferred_time_slot"
  },
  {
    name: "fee_acknowledged",
    definition: "BOOLEAN NOT NULL DEFAULT FALSE AFTER expected_payment_amount"
  },
  {
    name: "com_acknowledged",
    definition: "BOOLEAN NOT NULL DEFAULT FALSE AFTER fee_acknowledged"
  },
  {
    name: "balance_acknowledged",
    definition: "BOOLEAN NOT NULL DEFAULT FALSE AFTER com_acknowledged"
  },
  {
    name: "receipt_acknowledged",
    definition: "BOOLEAN NOT NULL DEFAULT FALSE AFTER balance_acknowledged"
  },
  {
    name: "com_evidence_path",
    definition: "VARCHAR(255) NULL AFTER receipt_acknowledged"
  },
  {
    name: "receipt_evidence_path",
    definition: "VARCHAR(255) NULL AFTER com_evidence_path"
  },
  {
    name: "rejection_reason",
    definition: "VARCHAR(255) NULL AFTER status"
  }
];

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS columnCount
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );

  return Number(rows[0]?.columnCount || 0) > 0;
}

async function constraintExists(connection, tableName, constraintName) {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS constraintCount
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
    `,
    [tableName, constraintName]
  );

  return Number(rows[0]?.constraintCount || 0) > 0;
}

async function ensurePreRegistrationSchema(connection) {
  for (const column of preRegistrationColumns) {
    const exists = await columnExists(connection, "pre_registrations", column.name);

    if (!exists) {
      await connection.query(`ALTER TABLE pre_registrations ADD COLUMN ${column.name} ${column.definition}`);
      console.log(`Added missing pre_registrations.${column.name} column`);
    }
  }

  const hasTimeSlotForeignKey = await constraintExists(
    connection,
    "pre_registrations",
    "fk_pre_registrations_time_slot"
  );

  if (!hasTimeSlotForeignKey) {
    await connection.query(`
      ALTER TABLE pre_registrations
      ADD CONSTRAINT fk_pre_registrations_time_slot
      FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL
    `);
    console.log("Added missing pre_registrations time_slot_id foreign key");
  }

  await connection.query(`
    ALTER TABLE pre_registrations
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled', 'confirmed') DEFAULT 'pending'
  `);
}

async function ensureSchema() {
  const connection = await db.getConnection();

  try {
    await ensurePreRegistrationSchema(connection);
  } finally {
    connection.release();
  }
}

module.exports = ensureSchema;
