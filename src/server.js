require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const {
  cadastrarPacienteHandler,
  detalhesDaIntegracaoHandler,
  listarCadastrosHandler,
} = require("./handlers");

const app = express();
app.use(bodyParser.json());

app.post("/cadastrar-paciente", cadastrarPacienteHandler);
app.get("/detalhes-da-integracao", detalhesDaIntegracaoHandler);
app.get("/listar-cadastros", listarCadastrosHandler);

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Running on port: ${PORT}`));
