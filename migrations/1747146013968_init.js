exports.up = (pgm) => {
  pgm.createTable("patients", {
    id: "id",
    cpf: { type: "varchar(20)", notNull: true, unique: true },
    name: { type: "varchar(100)", notNull: true },
    origin: { type: "varchar(100)" },
  });

  pgm.createTable("queue", {
    id: "id",
    patient_id: { type: "integer", references: "patients", notNull: true },
    payload: { type: "jsonb", notNull: true },
    status: { type: "varchar(20)", default: "pending", notNull: true },
    attempts: { type: "integer", default: 0 },
    created_at: { type: "timestamp", default: pgm.func("now()") },
    processed_at: { type: "timestamp" },
  });

  pgm.createTable("results", {
    id: "id",
    queue_id: { type: "integer", references: "queue", notNull: true },
    soap_xml_response: { type: "text" },
    soap_status: { type: "varchar(20)" },
    soap_message: { type: "text" },
    google_drive_link: { type: "text" },
  });

  pgm.createTable("error_logs", {
    id: "id",
    queue_id: { type: "integer", references: "queue", notNull: true },
    error_message: { type: "text" },
    stack_trace: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("error_logs");
  pgm.dropTable("results");
  pgm.dropTable("queue");
  pgm.dropTable("patients");
};
