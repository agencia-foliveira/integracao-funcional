const { sendPatientToSOAP } = require("./soap");

async function sendSOAP(data) {
  return await sendPatientToSOAP(data);
}

module.exports = { sendSOAP };
