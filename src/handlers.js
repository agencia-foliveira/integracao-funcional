// handlers.js
const db = require("./db");
const { sendDiscordAlert } = require("./notifier");

/**
 * Insere paciente (se ainda não existir), insere na fila e dispara alerta.
 */
async function cadastrarPacienteHandler(req, res) {
  const { paciente_cpf: cpf, paciente_nome: name, origin, ...rest } = req.body;
  const payload = { ...req.body };

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // Inserir paciente, ignorando duplicatas por CPF
    const pacienteResult = await client.query(
      `INSERT INTO patients (cpf, name, origin)
       VALUES ($1, $2, $3)
       ON CONFLICT (cpf) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [cpf, name, origin || null]
    );

    const patientId = pacienteResult.rows[0].id;

    // Enfileirar requisição
    await client.query(
      `INSERT INTO queue (patient_id, payload, status)
       VALUES ($1, $2, 'pending')`,
      [patientId, payload]
    );

    await client.query("COMMIT");

    const message = `🟡 Novo cadastro de paciente: "${name}", CPF "${cpf}" foi salvo na fila de processamento.`;

    await sendDiscordAlert(message);

    res.status(202).json({
      message,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao cadastrar paciente:", err);
    res.status(500).json({
      error: `Erro ao cadastrar paciente ${name}, CPF ${cpf}`,
    });
  } finally {
    client.release();
  }
}

/**
 * Retorna estatísticas da integração.
 */
async function detalhesDaIntegracaoHandler(req, res) {
  const dayjs = require("dayjs");
  const { inicio, fim } = req.query;

  const dataInicio = dayjs(inicio || dayjs().startOf("month")).format(
    "YYYY-MM-DD HH:mm:ss"
  );
  const dataFim = dayjs(fim || dayjs().endOf("month")).format(
    "YYYY-MM-DD HH:mm:ss"
  );

  const client = await db.pool.connect();
  try {
    const stats = {
      total: 0,
      sucesso: 0,
      erro: 0,
      processando: 0,
      errosDetalhados: [],
    };

    const contadores = await Promise.all([
      client.query(
        `SELECT COUNT(*) FROM queue WHERE processed_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      client.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'success' AND processed_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      client.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'error' AND processed_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      client.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'pending' AND created_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
    ]);

    stats.total = Number(contadores[0].rows[0].count);
    stats.sucesso = Number(contadores[1].rows[0].count);
    stats.erro = Number(contadores[2].rows[0].count);
    stats.processando = Number(contadores[3].rows[0].count);

    const errosDetalhados = await client.query(
      `
      SELECT q.id AS queue_id, p.name, p.cpf, el.error_message, el.stack_trace, q.processed_at
      FROM error_logs el
      JOIN queue q ON el.queue_id = q.id
      JOIN patients p ON q.patient_id = p.id
      WHERE q.processed_at BETWEEN $1 AND $2
      ORDER BY q.processed_at DESC
      LIMIT 10
    `,
      [dataInicio, dataFim]
    );

    stats.errosDetalhados = errosDetalhados.rows;

    res.status(200).json(stats);
  } catch (err) {
    console.error("Erro ao buscar detalhes:", err);
    res.status(500).json({ error: "Erro ao buscar detalhes da integração." });
  } finally {
    client.release();
  }
}

module.exports = {
  cadastrarPacienteHandler,
  detalhesDaIntegracaoHandler,
};
