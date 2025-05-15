const { pool } = require("./db");
const { sendDiscordAlert } = require("./notifier");
const {
  getPatientRequestXML,
  registerPatient,
  parseRegisterPatientResponse,
} = require("./services/register-patient");

async function processQueue() {
  const client = await pool.connect();

  const { rows } = await client.query(
    `
    SELECT * FROM queue
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `
  );

  if (rows.length === 0) return;

  const row = rows[0];

  try {
    const xml = await getPatientRequestXML(row.payload);

    await client.query(
      `
      UPDATE queue
      SET xml_request = $1
      WHERE id = $2
    `,
      [xml, row.id]
    );

    const response = await registerPatient(xml);

    await client.query(
      `
      UPDATE queue
      SET xml_response = $1
      WHERE id = $2
    `,
      [response, row.id]
    );

    const { message, status } = parseRegisterPatientResponse(response);

    if (message) {
      await client.query(
        `
        UPDATE queue
        SET response_status = $1, response_message = $2, status = 'error'
        WHERE id = $3        
      `,
        [status, message, row.id]
      );

      await sendDiscordAlert(
        `⚠️ Paciente **"${row.name}"** com o CPF **"${row.cpf}"** falhou com o erro: "${message}"`
      );
    } else {
      await client.query(
        `
        UPDATE queue
        SET status = 'success'
        WHERE id = $1
      `,
        [row.id]
      );

      await sendDiscordAlert(
        `✅ Paciente **"${row.name}"** com o CPF **"${row.cpf}"** foi processado com sucesso!`
      );
    }
  } catch (e) {
    console.error("Erro ao processar fila:", e.message);

    await client.query(
      `
      UPDATE queue
      SET error_details = $1, xml_response = $2, status = 'error'
      WHERE id = $3
    `,
      [e.message, e.message, row.id]
    );

    await sendDiscordAlert(
      `⛔ Paciente **"${row.name}"** com o CPF **"${
        row.cpf
      }"** não foi processado.\n\`\`\`xml\n${e.message.substring(
        0,
        1000
      )}\n\`\`\``
    );
  } finally {
    client.release();
  }
}

module.exports = {
  processQueue,
};
