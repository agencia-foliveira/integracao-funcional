const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("queue.db");

db.serialize(() => {
  // Fila de requisições
  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Registro geral da integração
  db.run(`
    CREATE TABLE IF NOT EXISTS integracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf TEXT,
      nome TEXT,
      status TEXT,
      mensagem TEXT,
      tempo_processamento REAL,
      tentativas INTEGER DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      processado_em DATETIME
    )
  `);

  // Registro de erros detalhados
  db.run(`
    CREATE TABLE IF NOT EXISTS erros_integracao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integracao_id INTEGER,
      erro_codigo TEXT,
      erro_mensagem TEXT,
      stack_trace TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (integracao_id) REFERENCES integracoes(id)
    )
  `);
});

module.exports = db;
