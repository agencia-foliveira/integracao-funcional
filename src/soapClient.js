const { sendDiscordAlert } = require("./notifier");
const { sendPatientToSOAP, parseSOAPResponse } = require("./soap");

async function sendSOAP(data) {
  try {
    const response = await sendPatientToSOAP(data);
    const result = parseSOAPResponse(response);

    await sendDiscordAlert(
      `📨 Resposta SOAP recebida:\n\`\`\`json\n${JSON.stringify(
        result,
        null,
        2
      ).slice(0, 1800)}\n\`\`\``
    );

    return {};
  } catch (err) {
    throw err;
  }
}

module.exports = { sendSOAP };
