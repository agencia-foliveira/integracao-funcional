const db = require("./db");
const { sendSOAP } = require("./soapClient");

async function enqueueRequest(payload) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO queue (payload) VALUES (?)",
      [JSON.stringify(payload)],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

setInterval(() => {
  db.get(
    "SELECT * FROM queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1",
    async (err, row) => {
      if (row) {
        const payload = JSON.parse(row.payload);
        const inicio = Date.now();

        // Inserir na tabela integracoes
        db.run(
          `INSERT INTO integracoes (cpf, nome, status, mensagem) VALUES (?, ?, 'processando', '')`,
          [payload.paciente_cpf, payload.paciente_nome],
          async function (err) {
            const integracaoId = this.lastID;

            const marcarErro = async (erro) => {
              const fim = Date.now();
              const duracao = (fim - inicio) / 1000;

              // Atualiza integracao com erro
              db.run(
                `UPDATE integracoes SET status = ?, mensagem = ?, tempo_processamento = ?, processado_em = CURRENT_TIMESTAMP WHERE id = ?`,
                ["erro", erro.message, duracao, integracaoId]
              );

              // Registra erro detalhado
              db.run(
                `INSERT INTO erros_integracao (integracao_id, erro_codigo, erro_mensagem, stack_trace) VALUES (?, ?, ?, ?)`,
                [integracaoId, erro.code || null, erro.message, erro.stack]
              );

              // Atualiza fila
              db.run(`UPDATE queue SET status = ? WHERE id = ?`, [
                "error",
                row.id,
              ]);
            };

            const marcarSucesso = (mensagem) => {
              const fim = Date.now();
              const duracao = (fim - inicio) / 1000;

              db.run(
                `UPDATE integracoes SET status = ?, mensagem = ?, tempo_processamento = ?, processado_em = CURRENT_TIMESTAMP WHERE id = ?`,
                [
                  "sucesso",
                  mensagem || "Enviado com sucesso",
                  duracao,
                  integracaoId,
                ]
              );

              db.run(`UPDATE queue SET status = ? WHERE id = ?`, [
                "done",
                row.id,
              ]);
            };

            try {
              const resposta = await sendSOAP(payload);
              marcarSucesso(resposta); // Assumindo que o sendSOAP retorna algum conteúdo
            } catch (e) {
              marcarErro(e);
            }
          }
        );
      }
    }
  );
}, 3000);

module.exports = { enqueueRequest };
