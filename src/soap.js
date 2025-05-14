require("dotenv").config();
const axios = require("axios");
const { isAxiosError } = require("axios");
const { XMLParser } = require("fast-xml-parser");

async function consumeSOAP(xml) {
  try {
    const { data: response } = await axios.post(
      process.env.FUNCIONAL_SOAP_URL,
      xml,
      {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "Content-Length": xml.length,
        },
      }
    );

    return response;
  } catch (err) {
    if (isAxiosError(err)) {
      return Promise.reject(err.response?.data);
    }

    throw err;
  }
}

/**
 * @returns {Promise<Array<{ ean: string, descricao: string, mensagemApresentacao: string, tipoConselhoPermitido: string }>>}
 */
async function getMedications() {
  const xml = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/" xmlns:wcf="http://schemas.datacontract.org/2004/07/wcfLundbeck.Contracts">
      <soap:Header>
        <To soap:mustUnderstand="1" xmlns="http://www.w3.org/2005/08/addressing">https://swsacesso.funcionalmais.com/WsService.svc</To>
        <Action soap:mustUnderstand="1" xmlns="http://www.w3.org/2005/08/addressing">http://tempuri.org/IWsService/ConsultarMedicamentoPermissaoCadastro</Action>
      </soap:Header>
      <soap:Body>
        <tem:ConsultarMedicamentoPermissaoCadastro>
          <tem:autenticacao>
            <wcf:Login>userServier</wcf:Login>
            <wcf:Password>dp6GAxoUEaBMofJN2IBh7K8Kx3IUp6oJ</wcf:Password>
          </tem:autenticacao>
        </tem:ConsultarMedicamentoPermissaoCadastro>
      </soap:Body>
    </soap:Envelope>
  `;

  const response = await consumeSOAP(xml);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: false,
    parseTagValue: true,
    removeNSPrefix: false,
  });

  const json = parser.parse(response);

  try {
    const medicamentos =
      json["s:Envelope"]?.["s:Body"]?.[
        "ConsultarMedicamentoPermissaoCadastroResponse"
      ]?.["ConsultarMedicamentoPermissaoCadastroResult"]?.["b:Medicamentos"]?.[
        "b:RetornoMedicamento"
      ];

    if (!medicamentos) {
      throw new Error("Medicamentos não encontrados na resposta SOAP.");
    }

    return Array.isArray(medicamentos)
      ? medicamentos.map((medicamento) => ({
          ean: medicamento["b:Ean"],
          descricao: medicamento["b:Descricao"],
          mensagemApresentacao: medicamento["b:MensagemApresentacao"],
          tipoConselhoPermitido: medicamento["b:TipoConselhoPermitido"],
        }))
      : [
          {
            ean: medicamentos["b:Ean"],
            descricao: medicamentos["b:Descricao"],
            mensagemApresentacao: medicamentos["b:MensagemApresentacao"],
            tipoConselhoPermitido: medicamentos["b:TipoConselhoPermitido"],
          },
        ];
  } catch (err) {
    console.error("Erro ao extrair medicamentos:", err);
    return [];
  }
}

/**
 *
 * @param {*} patient
 * @returns {string[]}
 */
function getPatientMedications(patient) {
  const availableMedication = {
    produto2: "Diamicron MR",
    produto3: "Vastarel",
    produto4: "Acertalix",
    produto6: "Acertanio",
    produto7: "Acertil",
    produto9: "Triplixam",
    produto10: "Daflon Flex",
    produto11: "Daflon",
    produto12: "Cedraflon",
  };
  const {
    produto2,
    produto3,
    produto4,
    produto6,
    produto7,
    produto9,
    produto10,
    produto11,
    produto12,
  } = patient;
  const medications = [];

  if (produto2) medications.push(availableMedication.produto2);
  if (produto3) medications.push(availableMedication.produto3);
  if (produto4) medications.push(availableMedication.produto4);
  if (produto6) medications.push(availableMedication.produto6);
  if (produto7) medications.push(availableMedication.produto7);
  if (produto9) medications.push(availableMedication.produto9);
  if (produto10) medications.push(availableMedication.produto10);
  if (produto11) medications.push(availableMedication.produto11);
  if (produto12) medications.push(availableMedication.produto12);

  return medications;
}

/**
 *
 * @param {Array<{ ean: string, descricao: string, mensagemApresentacao: string, tipoConselhoPermitido: string }>} medications
 * @param {string[]} names
 */
function filterMedicationsByName(medications, names) {
  return medications.filter((medication) =>
    names.some((name) =>
      medication.descricao.toLowerCase().includes(name.toLowerCase())
    )
  );
}

/**
 *
 * @param {*} patient
 * @param {Array<{ ean: string, descricao: string, mensagemApresentacao: string, tipoConselhoPermitido: string }>} medications
 * @returns {string}
 */
function generateCreatePatientXML(patient, medications) {
  const medicationXml = medications
    .map(
      (medication) => `<wsac:FormularioViewModel>
            <wsac:Campos>
                <wsac:CampoViewModel>
                <wsac:NomeCampo>TipoConselho</wsac:NomeCampo>
                <wsac:Valor i:type="b:int" xmlns:b="http://www.w3.org/2001/XMLSchema">${medication.tipoConselhoPermitido}</wsac:Valor>
                </wsac:CampoViewModel>
                <wsac:CampoViewModel>
                <wsac:NomeCampo>CRMUF</wsac:NomeCampo>
                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.medico_uf}</wsac:Valor>
                </wsac:CampoViewModel>
                <wsac:CampoViewModel>
                <wsac:NomeCampo>CRM</wsac:NomeCampo>
                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.medico_crm}</wsac:Valor>
                </wsac:CampoViewModel>
                <wsac:CampoViewModel>
                <wsac:NomeCampo>EAN</wsac:NomeCampo>
                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${medication.ean}</wsac:Valor>
                </wsac:CampoViewModel>
                <wsac:CampoViewModel>
                <wsac:NomeCampo>HabilitaFlagContatoMedicamento</wsac:NomeCampo>
                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">true</wsac:Valor>
                </wsac:CampoViewModel>
            </wsac:Campos>
            <wsac:CamposDinamicos/>
            <wsac:TipoFormulario>Medicamento</wsac:TipoFormulario>
        </wsac:FormularioViewModel>`
    )
    .join("");

  return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/" xmlns:wcf="http://schemas.datacontract.org/2004/07/wcfLundbeck.Contracts" xmlns:wsac="http://schemas.datacontract.org/2004/07/WsAcesso.Domain.ViewModels.WsService">
    <soap:Header>
        <To soap:mustUnderstand="1" xmlns="http://www.w3.org/2005/08/addressing">https://swsacesso.funcionalmais.com/WsService.svc</To>
        <Action soap:mustUnderstand="1" xmlns="http://www.w3.org/2005/08/addressing">http://tempuri.org/IWsService/CadastrarPaciente</Action>
    </soap:Header>
    <soap:Body>
        <tem:CadastrarPaciente>
            <tem:autenticacao>
                <wcf:Login>userServier</wcf:Login>
                <wcf:Password>dp6GAxoUEaBMofJN2IBh7K8Kx3IUp6oJ</wcf:Password>
            </tem:autenticacao>
            <tem:cadastrarPaciente xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
                <wsac:CPF>${patient.paciente_cpf}</wsac:CPF>
                <wsac:CodigoOrigem>8</wsac:CodigoOrigem>
                <wsac:Formularios>
                <!--Zero or more repetitions:-->
                <wsac:FormularioViewModel>
                    <wsac:Campos>
                        <!--Zero or more repetitions:-->
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Nome</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_nome}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>DataNascimento</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_data_nascimento}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Sexo</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_sexo}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                                <wsac:NomeCampo>AutorizaContatoTelefone</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">S</wsac:Valor>
                            </wsac:CampoViewModel>
                            <wsac:CampoViewModel>
                                <wsac:NomeCampo>AutorizaContatoEmail</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">S</wsac:Valor>
                            </wsac:CampoViewModel>
                            <wsac:CampoViewModel>
                                <wsac:NomeCampo>AutorizaContatoWhatsAppSMS</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">N</wsac:Valor>
                                <wsac:CampoViewModel>
                                <wsac:NomeCampo>PreferenciaContatoTelefone</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">S</wsac:Valor>
                                </wsac:CampoViewModel>
                            </wsac:CampoViewModel>
                            <wsac:CampoViewModel>
                                <wsac:NomeCampo>AutorizaContatoSMS</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">S</wsac:Valor>
                            </wsac:CampoViewModel>
                            <wsac:CampoViewModel>
                                <wsac:NomeCampo>AutorizaContatoCorreio</wsac:NomeCampo>
                                <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">S</wsac:Valor>
                            </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Email</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_email}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Telefone</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_telefone}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>TelefoneCelular</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_celular}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>CEP</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_cep}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Endereco</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Numero</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco_numero}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Bairro</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco_bairro}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Complemento</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco_complemento}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>Cidade</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco_cidade}</wsac:Valor>
                        </wsac:CampoViewModel>
                        <wsac:CampoViewModel>
                            <wsac:NomeCampo>UF</wsac:NomeCampo>
                            <wsac:Valor i:type="b:string" xmlns:b="http://www.w3.org/2001/XMLSchema">${patient.paciente_endereco_uf}</wsac:Valor>
                        </wsac:CampoViewModel>
                    </wsac:Campos>                       
                    <wsac:CamposDinamicos/>
                    <wsac:TipoFormulario>Paciente</wsac:TipoFormulario>
                </wsac:FormularioViewModel>
                ${medicationXml}
                </wsac:Formularios>
            </tem:cadastrarPaciente>
        </tem:CadastrarPaciente>
    </soap:Body>
</soap:Envelope>`;
}

/**
 *
 * @param {*} patient
 * @returns {Promise<string>}
 */
async function sendPatientToSOAP(patient) {
  const medications = await getMedications();
  const patientMedications = getPatientMedications(patient);
  const filteredMedications = await filterMedicationsByName(
    medications,
    patientMedications
  );

  return consumeSOAP(generateCreatePatientXML(patient, filteredMedications));
}

/**
 *
 * @param {string} xml
 * @returns {*}
 */
function parseSOAPResponse(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false, // Mantém os prefixos como "b:"
    parseTagValue: true,
    preserveOrder: false,
  });

  const json = parser.parse(xml);

  try {
    const resultado =
      json["s:Envelope"]?.["s:Body"]?.["CadastrarPacienteResponse"]?.[
        "CadastrarPacienteResult"
      ];

    if (!resultado) {
      throw new Error("Resultado do cadastro de paciente não encontrado.");
    }

    return {
      codigo: resultado["b:Codigo"],
      mensagem: resultado["b:Mensagem"],
      status: resultado["b:Status"],
    };
  } catch (err) {
    console.error("Erro ao extrair resultado do cadastro de paciente:", err);
    return {};
  }
}

module.exports = {
  consumeSOAP,
  getMedications,
  filterMedicationsByName,
  getPatientMedications,
  generateCreatePatientXML,
  sendPatientToSOAP,
  parseSOAPResponse,
};
