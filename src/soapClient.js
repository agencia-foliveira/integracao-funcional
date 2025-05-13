const { sendPatientToSOAP, parseSOAPResponse } = require("./soap");

async function sendSOAP(data) {
  try {
    const response = await sendPatientToSOAP(data);
    const result = parseSOAPResponse(response);

    return {
      codigo: result.codigo || "0",
      mensagem: result.mensagem || "Sucesso",
      status: result.status || "0",
    };
  } catch (err) {
    console.error("Error sending SOAP request:", err);
    return {
      codigo: "1",
      mensagem: err || "Unknown error",
      status: "1",
    };
  }
}

module.exports = { sendSOAP };
