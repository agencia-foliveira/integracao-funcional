const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const FormData = require("form-data");

function sendDiscordAlert(content) {
  return axios.post(process.env.DISCORD_WEBHOOK_URL, { content });
}

const sendXMLtoDiscord = async (xmlContent) => {
  const id = Date.now().toString();
  const filePath = path.join(os.tmpdir(), `soap-request-${id}.xml`);

  // Cria arquivo temporário
  fs.writeFileSync(filePath, xmlContent);

  // Prepara o FormData pro upload
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("content", `📄 Arquivo XML da Requisição/Resposta (ID: ${id})`);

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, form, {
      headers: form.getHeaders(),
    });
  } catch (err) {
    console.error("Erro ao enviar arquivo para o Discord:", err);
  } finally {
    // Apaga o arquivo se existir
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn("Erro ao excluir arquivo temporário:", err);
      }
    }
  }
};

module.exports = { sendDiscordAlert, sendXMLtoDiscord };
