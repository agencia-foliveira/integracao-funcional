const express = require("express");
const bodyParser = require("body-parser");
const dayjs = require("dayjs");
const { enqueueRequest } = require("./queue");
const db = require("./db");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.post("/cadastrar-paciente", async (req, res) => {
  try {
    await enqueueRequest(req.body);
    res.status(202).json({
      message: `Paciente "${req.body.paciente_nome}", CPF "${req.body.paciente_cpf}" foi salvo na fila de processamento.`,
    });
  } catch (err) {
    const errorMessage = `Erro ao adicionar o paciente "${req.body.paciente_nome}", CPF "${req.body.paciente_cpf}" na fila de processamento.`;
    console.error(errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

app.get("/detalhes-da-integracao", (req, res) => {
  const { inicio, fim } = req.query;

  const dataInicio =
    inicio && dayjs(inicio, "YYYY-MM-DD", true).isValid()
      ? dayjs(inicio)
      : dayjs().startOf("month");

  const dataFim =
    fim && dayjs(fim, "YYYY-MM-DD", true).isValid()
      ? dayjs(fim).endOf("day")
      : dayjs().endOf("month");

  if (!dataInicio.isValid() || !dataFim.isValid()) {
    return res
      .status(400)
      .json({ error: "Datas inválidas. Use o formato YYYY-MM-DD." });
  }

  const inicioStr = dataInicio.format("YYYY-MM-DD HH:mm:ss");
  const fimStr = dataFim.format("YYYY-MM-DD HH:mm:ss");

  const stats = {
    total: 0,
    sucesso: 0,
    erro: 0,
    processando: 0,
    errosDetalhados: [],
  };

  db.serialize(() => {
    db.get(
      `SELECT COUNT(*) AS total FROM integracoes WHERE processado_em BETWEEN ? AND ?`,
      [inicioStr, fimStr],
      (err, row) => {
        stats.total = row.total || 0;
      }
    );

    db.get(
      `SELECT COUNT(*) AS sucesso FROM integracoes WHERE status = 'sucesso' AND processado_em BETWEEN ? AND ?`,
      [inicioStr, fimStr],
      (err, row) => {
        stats.sucesso = row.sucesso || 0;
      }
    );

    db.get(
      `SELECT COUNT(*) AS erro FROM integracoes WHERE status = 'erro' AND processado_em BETWEEN ? AND ?`,
      [inicioStr, fimStr],
      (err, row) => {
        stats.erro = row.erro || 0;
      }
    );

    db.get(
      `SELECT COUNT(*) AS processando FROM integracoes WHERE status = 'processando' AND processado_em BETWEEN ? AND ?`,
      [inicioStr, fimStr],
      (err, row) => {
        stats.processando = row.processando || 0;
      }
    );

    db.all(
      `
      SELECT i.id, i.nome, i.cpf, e.erro_mensagem, e.stack_trace, i.processado_em
      FROM erros_integracao e
      JOIN integracoes i ON e.integracao_id = i.id
      WHERE i.processado_em BETWEEN ? AND ?
      ORDER BY i.processado_em DESC
      LIMIT 10
      `,
      [inicioStr, fimStr],
      (err, rows) => {
        if (err) {
          console.error("Erro ao buscar erros detalhados:", err);
          return res
            .status(500)
            .json({ error: "Erro ao buscar erros detalhados" });
        }

        stats.errosDetalhados = rows;
        res.status(200).json(stats);
      }
    );
  });
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
