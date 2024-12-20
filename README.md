# API Pay - Desafio Malga

API Pay é uma aplicação NestJS que processar pagamentos utilizando múltiplos provedores e conta com fallback e circuit breaker. Esta aplicação foi desenvolvida como parte de um desafio técnico, e seu objetivo é demonstrar a implementação de estratégias de resiliência e tolerância a falhas em sistemas de pagamentos distribuídos.

Utilizando o design pattern **Strategy**, a aplicação pode alternar dinamicamente entre diferentes provedores de pagamento em caso de falha.

Além disso, o uso de **Circuit Breaker** ajuda a prevenir a sobrecarga de provedores que estão enfrentando problemas, bloqueando temporariamente novas chamadas e permitindo uma recuperação gradual.

A aplicação também inclui mocks dos provedores de pagamento para facilitar o desenvolvimento e os testes.

## Pré-requisitos

Certifique-se de ter as seguintes ferramentas instaladas no seu ambiente:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- **Docker** e **Docker Compose**

---

## Configuração

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/ClaudioMascaro/api-pay-desafio-malga.git
   cd api-pay-desafio-malga
   ```

2. **Copie o arquivo de exemplo `.env` e ajuste as configurações conforme necessário:**

   ```bash
   cp .env.example .env
   ```

3. **Instale as dependências:**

   ```bash
   npm install
   ```

---

## Execução

Ambos métodos de execução abaixo irão subir a aplicação principal e os mocks dos provedores de pagamento com auto-restart ao salvar alterações.

### Com Docker Compose

1. **Suba a aplicação e os mocks:**

   ```bash
   make up
   ```

2. **Acesse a aplicação:**

   - API principal: [http://localhost:3000](http://localhost:3000)
   - Mocks dos provedores: [http://localhost:3001](http://localhost:3001)

3. **Acompanhe os logs:**

   ```bash
   make logs
   ```

4. **Para parar os serviços:**

   ```bash
   make down
   ```

---

### Localmente

1. **Inicie os mocks dos provedores:**

   ```bash
   npm run start:mocks:dev
   ```

2. **Em outro terminal, inicie a API principal:**

   ```bash
   npm run start:dev
   ```

---

## Testando os Endpoints

### 1. Criar um pagamento

- **Endpoint:** `POST /payments`
- **Body (exemplo):**

```json
{
  "amount": 1000,
  "currency": "USD",
  "description": "Compra de produtos",
  "paymentMethod": {
    "type": "card",
    "card": {
      "number": "4111111111111111",
      "holderName": "John Doe",
      "cvv": "123",
      "expirationDate": "12/2025",
      "installments": 1
    }
  }
}
```

---

### 2. Buscar um pagamento por ID

- **Endpoint:** `GET /payments/:id`
- **Exemplo de resposta (sucesso):**

```json
{
  "id": "payment-uuid",
  "createdDate": "2024-12-18",
  "status": "success",
  "amount": 1000,
  "originalAmount": 1000,
  "currency": "USD",
  "description": "Compra de produtos",
  "paymentMethod": "card",
  "cardId": "mock-card-uuid"
}
```

- **Exemplo de resposta (não encontrado):**

```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "Not Found"
}
```

---

### 3. Solicitar um reembolso

- **Endpoint:** `POST /payments/:id/refund`
- **Body (exemplo):**

```json
{
  "amount": 500
}
```

- **Exemplo de resposta (sucesso):**

```json
{
  "id": "payment-uuid",
  "createdDate": "2024-12-18",
  "status": "refunded",
  "amount": 500,
  "originalAmount": 1000,
  "currency": "USD",
  "description": "Reembolso parcial",
  "paymentMethod": "card",
  "cardId": "mock-card-uuid"
}
```

---

## Detalhes dos Mocks

Os provedores de pagamento são simulados para replicar comportamentos reais com falhas e latências ocasionais, proporcionando um ambiente de teste onde é possível avaliar o funcionamento do circuit breaker e fallback.

### Provedor 1

1. **Latência Simulada:**

   - A resposta pode levar entre 0 a 500 ms.
   - Existe uma chance de 10% de a resposta demorar mais de 1200 ms.

2. **Erros Intermitentes:**

   - Há uma chance de 1% de ocorrer um erro de servidor (500).

---

### Provedor 2

1. **Latência Simulada:**

   - A resposta pode levar entre 0 a 500 ms.
   - Existe uma chance de 5% de a resposta demorar mais de 1200 ms.

2. **Erros Intermitentes:**

   - Há uma chance de 0.5% de ocorrer um erro de servidor (500).

---

## Funcionamento do Circuit Breaker e Estratégias de Fallback

A aplicação utiliza o padrão **Strategy** para implementar múltiplos provedores de pagamento, permitindo alternância dinâmica entre eles em caso de falha. O fluxo de processamento de pagamento inclui as seguintes etapas principais:

1. **Execução com Prioridade:**
   - A aplicação tenta processar o pagamento com o provedor de maior prioridade.
2. **Fallback Automático:**

   - Caso o primeiro provedor falhe, o próximo é tentado automaticamente.

3. **Circuit Breaker:**

   - Quando falhas consecutivas são detectadas, o circuito do provedor é aberto, bloqueando novas chamadas por um tempo configurado.
   - Após o tempo de reset, o circuito entra em estado de teste (_half-open_), permitindo chamadas limitadas para verificar recuperação.

4. **Retentativa:**
   - Se todos os provedores falharem, a aplicação aguarda o tempo de reset do circuit breaker e tenta novamente, até o número máximo de retentativas configurado (`PAYMENTS_MAX_RETRIES`).

---

## Executando Testes

### Cobertura Total

Para executar a bateria completa de testes, juntamente com a verificação de cobertura de código:

```bash
npm run test:all:cov
```

Ou, se preferir utilizar o docker-compose, utilize o comando make:

```bash
make test
```

Para validação de testes unitários em tempo de desenvolvimento, utilize:

```bash
npm run test:unit:watch
```

Para os demais testes:

### Unitários

```bash
npm run test:unit
```

### E2E

```bash
npm run test:e2e
```

### Cobertura de testes atual

| Statements                                                                               | Branches                                                                             | Functions                                                                              | Lines                                                                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ![Statements](https://img.shields.io/badge/statements-100%25-brightgreen.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-100%25-brightgreen.svg?style=flat) | ![Functions](https://img.shields.io/badge/functions-100%25-brightgreen.svg?style=flat) | ![lines](https://img.shields.io/badge/lines-100%25-brightgreen.svg?style=flat) |

![Screenshot from 2024-12-20 12-45-40](https://github.com/user-attachments/assets/cc9af20b-3185-40b4-8d71-dce5d6ab1270)

---

## Principais Diretórios

- **`src/`** - Código principal da aplicação.
  - **`api/`** - Lógica da API (controladores, serviços, providers).
  - **`mocks/`** - Simulação dos provedores de pagamento.
  - **`common/`** - Middleware, validações e utilitários globais.
- **`test/`** - Configuração e arquivos de teste end-to-end.

---

## Variáveis de Ambiente

Para personalizar os parâmetros e configurações da aplicação, é possível ajustar as seguintes variáveis de ambiente no arquivo `.env`:

- `CIRCUIT_BREAKER_TIMEOUT` - Tempo limite para o circuit breaker em ms.
- `CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE` - Percentual de erro para abrir o circuit breaker.
- `CIRCUIT_BREAKER_RESET_TIMEOUT` - Tempo para resetar o circuit breaker.
- `PAYMENTS_PROVIDER1_API_URL` - URL do provedor de pagamento 1.
- `PAYMENTS_PROVIDER2_API_URL` - URL do provedor de pagamento 2.
- `PAYMENTS_MAX_RETRIES` - Número máximo de tentativas de fallback.
- `PAYMENTS_REQUEST_TIMEOUT` - Tempo limite para requests aos provedores externos, em ms.

---
