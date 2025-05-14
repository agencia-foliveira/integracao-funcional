const { pool } = require("./db");
const { sendDiscordAlert } = require("./notifier");
const { sendSOAP } = require("./soapClient");

async function processQueue() {
  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `
      SELECT * FROM queue
      WHERE status = 'pending' AND attempts < 3
      ORDER BY id ASC
      LIMIT 1
    `
    );

    if (rows.length === 0) return;

    const row = rows[0];

    console.log("Processing row:", row);

    const { rows: patients } = await client.query(
      `SELECT * FROM patients WHERE id = $1`,
      [row.patient_id]
    );

    if (patients.length === 0) return;

    const patient = patients[0];

    // await client.query("BEGIN");

    // Marca tentativa
    // await client.query(
    //   `UPDATE queue SET attempts = attempts + 1 WHERE id = $1`,
    //   [row.id]
    // );
    // const { rows: updated } = await client.query(
    //   `SELECT attempts FROM queue WHERE id = $1`,
    //   [row.id]
    // );
    // const currentAttempts = updated[0].attempts;
    // const isLastAttempt = currentAttempts >= 3;

    try {
      const response = await sendSOAP(row.payload);

      console.error("Paciente enviado com sucesso para a API:", response);

      await client.query(
        `
        INSERT INTO results (queue_id, soap_xml_response, soap_status, soap_message)
        VALUES ($1, $2, $3, $4)
      `,
        [row.id, response, "0", "Sucesso"]
      );

      await client.query(
        `UPDATE queue SET status = 'success', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.id]
      );

      await sendDiscordAlert(
        `🟢 Paciente "${patient.name}" com o CPF "${patient.cpf}" foi processado com sucesso.`
      );

      // if (response.status !== "0") {
      //   await sendDiscordAlert(
      //     `📢 Paciente "${patient.name}" com o CPF "${patient.cpf}" falhou com o erro: ${response.message}`
      //   );
      // } else {
      //   await sendDiscordAlert(
      //     `📢 Paciente "${patient.name}" com o CPF "${patient.cpf}" foi processado com sucesso!`
      //   );
      // }
    } catch (err) {
      console.error("Erro ao enviar o paciente para a API:", err);
      await client.query(
        `INSERT INTO error_logs (queue_id, error_message, stack_trace)
         VALUES ($1, $2, $3)`,
        [row.id, err.message, err.stack]
      );

      await client.query(
        `
        INSERT INTO results (queue_id, soap_xml_response, soap_status, soap_message)
        VALUES ($1, $2, $3, $4)
      `,
        [row.id, err, "1", err.message]
      );

      await client.query(
        `UPDATE queue SET status = 'error', processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.id]
      );

      await sendDiscordAlert(
        `❌ Paciente "${patient.name}" com o CPF ${patient.cpf} Não foi cadastrado na API.`
      );
    }
    // await client.query("COMMIT");
  } catch (e) {
    // await client.query("ROLLBACK");
    console.error("Erro ao processar fila:", e);
    await sendDiscordAlert(
      `❌ Erro ao processar fila: ${e.message.substring(0, 1000)}.`
    );
  } finally {
    client.release();
  }
}

module.exports = {
  processQueue,
};
