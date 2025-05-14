const db = require("./db");
const dayjs = require("dayjs");
const { sendDiscordAlert } = require("./notifier");

async function cadastrarPacienteHandler(req, res) {
  const { paciente_cpf: cpf, paciente_nome: name, origin } = req.body;
  const payload = { ...req.body };

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO queue (cpf, name, status, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cpf) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         payload = EXCLUDED.payload,
         status = 'pending',
         xml_request = NULL,
         xml_response = NULL,
         response_status = NULL,
         response_message = NULL,
         error_details = NULL
       RETURNING id`,
      [cpf, name, "pending", payload]
    );

    await client.query("COMMIT");

    const message = `🟡 Novo cadastro de paciente: "${name}", CPF "${cpf}"\n
      \`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`    
    `;

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
    };

    const contadores = await Promise.all([
      client.query(
        `SELECT COUNT(*) FROM queue WHERE created_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      client.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'success' AND created_at BETWEEN $1 AND $2`,
        [dataInicio, dataFim]
      ),
      client.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'error' AND created_at BETWEEN $1 AND $2`,
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

    res.status(200).json(stats);
  } catch (err) {
    console.error("Erro ao buscar detalhes:", err);
    res.status(500).json({ error: "Erro ao buscar detalhes da integração." });
  } finally {
    client.release();
  }
}

/**
 * Retorna os items da fila paginados com filtros de inicio e fim.
 */
async function listarCadastrosHandler(req, res) {
  const { inicio, fim } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const dataInicio = dayjs(inicio || dayjs().startOf("month")).format(
    "YYYY-MM-DD HH:mm:ss"
  );
  const dataFim = dayjs(fim || dayjs().endOf("month")).format(
    "YYYY-MM-DD HH:mm:ss"
  );

  const client = await db.pool.connect();
  try {
    const offset = (page - 1) * limit;

    const result = await client.query(
      `SELECT * FROM queue WHERE created_at BETWEEN $1 AND $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [dataInicio, dataFim, limit, offset]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar detalhes da fila:", err);
    res.status(500).json({ error: "Erro ao buscar detalhes da fila." });
  } finally {
    client.release();
  }
}

module.exports = {
  cadastrarPacienteHandler,
  detalhesDaIntegracaoHandler,
  listarCadastrosHandler,
};
