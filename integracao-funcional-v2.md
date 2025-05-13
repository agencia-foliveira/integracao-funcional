# Que informações eu preciso armazenar?

- CPF
- Nome
- Origem do paciente (Informação que deve ser consultada no SOAP após o cadastro do paciente ser bem sucedido)
- Data e hora de entrada na fila
- Payload JSON completo
- Resposta XML bruta do SOAP
- Status da resposta do SOAP (se existir)
- Mensagem da resposta do SOAP (se existir)
- Erro (Algum erro no processamento não necessariamente relacionado ao SOAP)
- Status (pendente, processado, erro)
- Número de tentativa (máximo 3)
- Link da pasta do drive com os arquivos XML de request e response

# Quais tabelas eu preciso criar?

## Patients

- id
- cpf
- name
- origin

## Queue

- id
- patient_id
- payload
- status (pending, success, error)
- attempts 0
- created_at NOW

## Results

- id
- queue_id
- soap_xml_response
- soap_status
- soap_message
- error_detail
- google_drive_link

## Error Logs

- id
- queue_id
- error_message
- stack_trace
- created_at NOW

## Script SQL para gerar as tabelas

```sql
-- Tabela: patients
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: queue
CREATE TABLE queue (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'error')),
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar rapidamente por status e tentativas
CREATE INDEX idx_queue_status_attempts ON queue (status, attempts);

-- Tabela: results
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    queue_id INTEGER NOT NULL REFERENCES queue(id) ON DELETE CASCADE,
    soap_xml_response TEXT,
    soap_status VARCHAR(50),
    soap_message TEXT,
    google_drive_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: error_logs
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    queue_id INTEGER REFERENCES queue(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

# Quais as funcionalidades o integrador precisa executar?

## Salvar CPF e nome do paciente, e colocar o payload na fila de processamento.

```sql
-- Insere o paciente apenas se ainda não existir (com base no CPF)
INSERT INTO patients (cpf, name, origin)
VALUES ('12345678900', 'Fulano de Tal', null)
ON CONFLICT (cpf) DO NOTHING;

-- Recupera o ID do paciente (depois do insert acima ou se já existia)
WITH get_patient AS (
    SELECT id FROM patients WHERE cpf = '12345678900'
)

-- Insere na fila
INSERT INTO queue (patient_id, payload, status)
SELECT id, '{"exemplo": "payload"}', 'pending'
FROM get_patient;
```

## Tentar processar novamente até 3 vezes o registro na fila.

```sql
-- Seleciona o próximo item da fila que ainda pode ser processado
SELECT *
FROM queue
WHERE status = 'pending'
  AND attempts < 3
ORDER BY created_at ASC
LIMIT 1;

-- Depois que processar, atualiza tentativa
UPDATE queue
SET attempts = attempts + 1
WHERE id = 123;  -- ID da fila processada

-- Caso o processamento der certo
UPDATE queue
SET status = 'success'
WHERE id = 123;

-- Caso o processamento der errado
UPDATE queue
SET status = 'error'
WHERE id = 123;
```

## Salvar o resultado da requisição SOAP.

```sql
INSERT INTO results (
    queue_id,
    soap_xml_response,
    soap_status,
    soap_message,
    google_drive_link
)
VALUES (
    123,  -- queue_id
    '<xml>...</xml>',
    '200_OK',
    'Paciente cadastrado com sucesso',
    NULL,
);

```

## Salvar qualquer exceção ou erro que aconteça.

```sql
INSERT INTO error_logs (queue_id, error_message, stack_trace)
VALUES (
    123,
    'Erro ao conectar no serviço SOAP',
    'SoapException: TimeoutException at line 54...'
);
```
