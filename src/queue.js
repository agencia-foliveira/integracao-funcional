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
    const { rows: patients } = await client.query(
      `SELECT * FROM patients WHERE id = $1`,
      [row.patient_id]
    );
    const patient = patients[0];

    await client.query("BEGIN");

    // Marca tentativa
    await client.query(
      `UPDATE queue SET attempts = attempts + 1 WHERE id = $1`,
      [row.id]
    );

    try {
      const response = await sendSOAP(row.payload);

      await client.query(
        `
        INSERT INTO results (queue_id, soap_xml_response, soap_status, soap_message)
        VALUES ($1, $2, $3, $4)
      `,
        [
          row.id,
          response.xml || null,
          response.status || "0",
          response.message || "Sucesso",
        ]
      );

      await client.query(`UPDATE queue SET status = 'success' WHERE id = $1`, [
        row.id,
      ]);

      if (response.status !== "0") {
        await sendDiscordAlert(
          `📢 Paciente ${patient.name} com o CPF ${patient.cpf} falhou com o erro: ${response.message}`
        );
      } else {
        await sendDiscordAlert(
          `📢 Paciente ${patient.name} com o CPF ${patient.cpf} foi processado com sucesso!`
        );
      }
    } catch (err) {
      await client.query(
        `INSERT INTO error_logs (queue_id, error_message, stack_trace)
         VALUES ($1, $2, $3)`,
        [row.id, err.message, err.stack]
      );

      const isLastAttempt = row.attempts + 1 >= 3;
      await client.query(`UPDATE queue SET status = $1 WHERE id = $2`, [
        isLastAttempt ? "error" : "pending",
        row.id,
      ]);

      if (isLastAttempt) {
        await sendDiscordAlert(
          `❌ Paciente ${patient.name} com o CPF ${patient.cpf} falhou após 3 tentativas. Erro: ${err.message}`
        );
      } else {
        await sendDiscordAlert(
          `⚠️ Paciente ${patient.name} com o CPF ${
            patient.cpf
          } falhou na tentativa ${row.attempts + 1}. Erro: ${err.message}`
        );
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Erro ao processar fila:", e);
    await sendDiscordAlert(`❌ Erro ao processar fila: ${e.message}.`);
  } finally {
    client.release();
  }
}

module.exports = {
  processQueue,
};
