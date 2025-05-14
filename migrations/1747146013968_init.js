exports.up = (pgm) => {
  pgm.createTable("queue", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    cpf: { type: "varchar(20)", notNull: true, unique: true },
    origin: { type: "varchar(20)" },
    payload: { type: "jsonb", notNull: true },
    xml_request: { type: "xml" },
    xml_response: { type: "xml" },
    response_status: { type: "text" },
    response_message: { type: "text" },
    status: { type: "varchar(20)", default: "pending", notNull: true },
    error_details: { type: "text" },
    request_origin_at: { type: "timestamp" },
    created_at: { type: "timestamp", default: pgm.func("now()") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("queue");
};
