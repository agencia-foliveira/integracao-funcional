# Auxiliar de Integração

Este projeto fornece endpoints para integração com um sistema de cadastro de pacientes e consulta de status de integração. Abaixo estão os detalhes dos endpoints disponíveis, payloads esperados e exemplos de retorno.

## Endpoints Disponíveis

### 1. Cadastro de Pacientes

**Método:** `POST`  
**URL:** `http://147.182.200.21/cadastrar-paciente`

#### Payload

O payload deve ser enviado no formato JSON com os seguintes campos:

- `registro_id` (número): Identificador único do registro.
- `paciente_nome` (string): Nome completo do paciente.
- `paciente_cpf` (string): CPF do paciente.
- `paciente_data_nascimento` (string): Data de nascimento no formato `DD/MM/AAAA`.
- `paciente_sexo` (string): Sexo do paciente (`M` ou `F`).
- `paciente_email` (string): E-mail do paciente.
- `paciente_telefone` (string): Telefone fixo do paciente.
- `paciente_celular` (string): Celular do paciente.
- `paciente_cep` (string): CEP do endereço do paciente.
- `paciente_endereco` (string): Logradouro do endereço do paciente.
- `paciente_endereco_numero` (string): Número do endereço.
- `paciente_endereco_complemento` (string): Complemento do endereço.
- `paciente_endereco_uf` (string): Unidade Federativa (UF) do endereço.
- `paciente_endereco_cidade` (string): Cidade do endereço.
- `paciente_endereco_bairro` (string): Bairro do endereço.
- `medico_crm` (string): CRM do médico responsável.
- `medico_uf` (string): Unidade Federativa (UF) do CRM do médico.
- `produto2`, `produto3`, `produto4`, etc. (string): Produtos relacionados ao paciente.

#### Exemplo de Payload

_Endpointe para cadastrar pacientes_

[POST] http: //147.182.200.21/cadastrar-paciente

_Payload_

```json
{
  "registro_id": 153087,
  "paciente_nome": "Inayh\u00ea",
  "paciente_cpf": "36393757850",
  "paciente_data_nascimento": "21/11/1982",
  "paciente_sexo": "F",
  "paciente_email": "inayhe@yahoo.com.br",
  "paciente_telefone": "17996059611",
  "paciente_celular": "17996059611",
  "paciente_cep": "15610348",
  "paciente_endereco": "Rua joao sartorio",
  "paciente_endereco_numero": "110",
  "paciente_endereco_complemento": "Nao tem",
  "paciente_endereco_uf": "SP",
  "paciente_endereco_cidade": "Fernandopolis",
  "paciente_endereco_bairro": "Cohab joao pimenta",
  "medico_crm": "191681",
  "medico_uf": "SP",
  "produto2": "",
  "produto3": "",
  "produto4": "produto4",
  "produto6": "",
  "produto7": "",
  "produto9": "",
  "produto10": "",
  "produto11": "",
  "produto12": ""
}
```

_Endpointe para para trazer os status da integração_

[GET] http: //147.182.200.21/detalhes-da-integracao

_Retorno_

```json
{
  "total": 3,
  "sucesso": 0,
  "erro": 3,
  "processando": 0,
  "errosDetalhados": [
    {
      "id": 3,
      "nome": "Arthur Lucca Anthony da Rocha",
      "cpf": "31618462067",
      "erro_mensagem": "<s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:a=\"http://www.w3.org/2005/08/addressing\"><s:Header><a:Action s:mustUnderstand=\"1\">http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher/fault</a:Action></s:Header><s:Body><s:Fault><s:Code><s:Value>s:Sender</s:Value><s:Subcode><s:Value xmlns:a=\"http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher\">a:DeserializationFailed</s:Value></s:Subcode></s:Code><s:Reason><s:Text xml:lang=\"pt-BR\">The formatter threw an exception while trying to deserialize the message: Error in deserializing body of request message for operation 'CadastrarPaciente'. Unexpected end of file. Following elements are not closed: Envelope. Line 1, position 6735.</s:Text></s:Reason><s:Detail><ExceptionDetail xmlns=\"http://...",
      "stack_trace": "Error: <s:Envelope xmlns:s=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:a=\"http://www.w3.org/2005/08/addressing\"><s:Header><a:Action s:mustUnderstand=\"1\">http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher/fault</a:Action></s:Header><s:Body><s:Fault><s:Code><s:Value>s:Sender</s:Value><s:Subcode><s:Value xmlns:a=\"http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher\">a:DeserializationFailed</s:Value></s:Subcode></s:Code><s:Reason><s:Text xml:lang=\"pt-BR\">The formatter threw an exception while trying to deserialize the message: Error in deserializing body of request message for operation 'CadastrarPaciente'. Unexpected end of file. Following elements are not closed: Envelope. Line 1, position 6735.</s:Text></s:Reason><s:Detail><ExceptionDetail xmlns=\"http://...",
      "processado_em": "2025-05-10 18:12:57"
    }
  ]
}
```
