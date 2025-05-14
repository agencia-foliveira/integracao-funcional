require("dotenv").config();
const { processQueue } = require("./queue");

console.log("Processamento de cadastros iniciado...");

setInterval(() => {
  console.log("Aguardando por cadastros pendentes...");
  processQueue().catch((err) => {
    console.error("Erro na fila de processamento:", err);
  });
}, 5000);
