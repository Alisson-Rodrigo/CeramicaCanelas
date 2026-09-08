# Guia completo de integracao da API de pagamentos

Este documento e independente de framework e de qualquer frontend existente no repositorio. Ele pode ser usado para integrar React, Vue, Angular, Next.js, aplicativo mobile ou qualquer cliente HTTP.

## 1. Preparar o backend

Antes de integrar, aplique a migration:

```powershell
dotnet ef database update --project Backend/CeramicaCanelas.Persistence --startup-project Backend/CeramicaCanelas.WebApi --context DefaultContext --configuration Release
```

A migration recria somente as tabelas do modulo de pagamentos. Os dados antigos dessas tabelas serao apagados.

Inicie a API e abra o Swagger. Em desenvolvimento, normalmente:

```text
https://localhost:PORTA/swagger
```

Use a URL real exibida pelo terminal da API. Nao fixe uma porta sem conferir o ambiente.

## 2. URL base

Todos os endpoints do modulo comecam em:

```text
/api/payments
```

Exemplo com uma API em `https://localhost:7018`:

```text
https://localhost:7018/api/payments/people
```

No cliente, separe a origem do prefixo:

```javascript
const API_ORIGIN = 'https://localhost:7018';
const PAYMENTS_URL = `${API_ORIGIN}/api/payments`;
```

Em producao, troque somente `API_ORIGIN` por uma variavel de ambiente.

## 3. Autenticacao

Os endpoints exigem JWT com perfil `Financial` ou `Admin`.

Depois de autenticar pelo sistema, guarde o token conforme a arquitetura do cliente e envie:

```http
Authorization: Bearer TOKEN_JWT
```

Exemplo:

```javascript
const response = await fetch(`${PAYMENTS_URL}/people`, {
    headers: {
        Authorization: `Bearer ${accessToken}`
    }
});
```

Nunca coloque o token diretamente no codigo-fonte ou no repositorio.

## 4. Cliente HTTP base

Exemplo generico em JavaScript:

```javascript
async function readResponse(response) {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    return text || null;
}

async function paymentsRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${getAccessToken()}`);

    const response = await fetch(`${PAYMENTS_URL}${path}`, {
        ...options,
        headers
    });

    const body = await readResponse(response);

    if (!response.ok) {
        const message = body?.message || body?.title || `Erro HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.body = body;
        throw error;
    }

    return body;
}
```

`getAccessToken()` deve ser implementada conforme o sistema de autenticacao do cliente.

## 5. Regra obrigatoria: multipart/form-data

Todos os `POST` e `PATCH` deste modulo recebem `multipart/form-data`.

Use `FormData`:

```javascript
const form = new FormData();
form.append('Name', 'Prestador Teste');

await paymentsRequest('/people', {
    method: 'POST',
    body: form
});
```

Nao defina `Content-Type` manualmente. O navegador precisa gerar o `boundary`.

Errado:

```javascript
headers: { 'Content-Type': 'application/json' }
```

Errado:

```javascript
headers: { 'Content-Type': 'multipart/form-data' }
```

Esses erros podem causar `415 Unsupported Media Type`.

Os endpoints `GET` nao usam `FormData`.

## 6. Formatos basicos

```text
Guid:     00000000-0000-0000-0000-000000000000
DateOnly: YYYY-MM-DD
DateTime: ISO 8601, por exemplo 2026-08-24T14:30:00-03:00
Boolean:  true ou false
Decimal:  1615.60 ou 1615,60
```

Prefira enviar decimais sem simbolo monetario e sem separador de milhar:

```text
Correto: 1615.60
Errado:  R$ 1.615,60
```

## 7. Enums

```javascript
const EmploymentType = {
    Employee: 1,
    Contractor: 2
};

const Fortnight = {
    First: 1,
    Second: 2
};

const VoucherStatus = {
    Active: 1,
    PaidOff: 2,
    Paused: 3,
    Cancelled: 4
};

const VoucherPeriodicity = {
    Monthly: 1,
    AlternateMonths: 2,
    EveryXMonths: 3,
    Single: 4,
    Custom: 5
};

const PaymentCalculationStatus = {
    Draft: 1,
    Calculated: 2,
    Paid: 3,
    Cancelled: 4
};

const PaymentItemKind = {
    FortnightBase: 1,
    FirstFortnightPaid: 2,
    FullAbsence: 3,
    HalfAbsence: 4,
    PositiveHours: 5,
    NegativeHours: 6,
    NightHours: 7,
    Voucher: 8,
    Addition: 9,
    Deduction: 10,
    Bonus: 11,
    BonusAbsenceDeduction: 12
};
```

## 8. Tipos de resposta

Exemplo TypeScript:

```typescript
type PaymentPerson = {
    id: string;
    name: string;
    employmentType: 1 | 2;
    isActive: boolean;
    monthlyValue: number;
};

type PaymentItem = {
    kind: number;
    description: string;
    amount: number;
    quantityMinutes: number | null;
    quantity: number | null;
    voucherId: string | null;
};

type PaymentPreview = {
    paymentPersonId: string;
    personName: string;
    employmentType: 1 | 2;
    competenceYear: number;
    competenceMonth: number;
    fortnight: 1 | 2;
    baseValue: number;
    fortnightPercent: number;
    firstFortnightPaid: number;
    grossValue: number;
    additionValue: number;
    deductionValue: number;
    netValue: number;
    items: PaymentItem[];
};
```

## 9. Ordem correta de integracao

Implemente nesta ordem:

1. Autenticacao e cliente HTTP.
2. Consulta e cadastro de pessoas.
3. Atualizacao do salario.
4. Consulta e cadastro de regras.
5. Consulta e cadastro de vales.
6. Previa do pagamento.
7. Confirmacao do pagamento.
8. Historico e marcacao como pago.

## 10. Pessoas do pagamento

### Listar

```http
GET /api/payments/people
```

```javascript
const people = await paymentsRequest('/people');
```

Resposta `200`:

```json
[
  {
    "id": "GUID",
    "name": "Prestador Teste",
    "employmentType": 2,
    "isActive": true,
    "monthlyValue": 2500.00
  }
]
```

### Cadastrar

```http
POST /api/payments/people
```

Campos `FormData`:

```text
Name                 string obrigatoria
EmploymentType       1 funcionario ou 2 prestador
MonthlyValue         decimal maior que zero
EmployeeId           Guid opcional
```

```javascript
async function createPerson(data) {
    const form = new FormData();
    form.append('Name', data.name);
    form.append('EmploymentType', String(data.employmentType));
    form.append('MonthlyValue', String(data.monthlyValue));

    if (data.employeeId) {
        form.append('EmployeeId', data.employeeId);
    }

    return paymentsRequest('/people', { method: 'POST', body: form });
}
```

Resposta `201`: objeto `PaymentPerson`.

A bonificacao nao faz parte do cadastro. Ela e informada manualmente em cada calculo.

## 11. Atualizar salario

```http
PATCH /api/payments/people/{personId}/salary
```

Campos:

```text
MonthlyValue
```

```javascript
async function updateSalary(personId, monthlyValue) {
    const form = new FormData();
    form.append('MonthlyValue', String(monthlyValue));

    await paymentsRequest(`/people/${personId}/salary`, {
        method: 'PATCH',
        body: form
    });
}
```

Resposta `204`.

O novo valor passa a ser usado nos proximos calculos. Calculos ja confirmados preservam o valor utilizado no proprio registro.

## 12. Bonificacao

A bonificacao nao e salva na pessoa e nao possui endpoint de cadastro. Calcule o valor fora do sistema e envie `BonusValue` no `FormData` da previa e da confirmacao. Use zero quando nao houver bonificacao.

## 13. Ativar ou desativar pessoa

```http
PATCH /api/payments/people/{personId}/status
```

```javascript
const form = new FormData();
form.append('IsActive', 'false');

await paymentsRequest(`/people/${personId}/status`, {
    method: 'PATCH',
    body: form
});
```

Resposta `204`.

## 14. Regras de calculo

### Consultar

```http
GET /api/payments/rules
```

Regra inicial:

```text
Funcionario, primeira quinzena: 40%
Prestador, primeira quinzena: 50%
Desconto da bonificacao por falta inteira: R$ 100
Desconto da bonificacao por meia falta: R$ 50
```

### Criar nova vigencia

```http
POST /api/payments/rules
```

Campos:

```text
EffectiveFrom
EmployeeFirstFortnightPercent
ContractorFirstFortnightPercent
FullAbsenceValue
HalfAbsenceValue
MonthlyWorkMinutes           opcional
PositiveHourMultiplier      opcional
NegativeHourMultiplier      opcional
NightHourMultiplier         opcional
```

Sempre crie uma nova vigencia. Nao altere regras antigas localmente.

## 15. Vales

### Listar

```http
GET /api/payments/vouchers
GET /api/payments/vouchers?personId={GUID}
```

### Cadastrar

```http
POST /api/payments/vouchers
```

Campos:

```text
PaymentPersonId
Description
TotalValue          opcional
InstallmentValue
Date                YYYY-MM-DD
StartYear
StartMonth
Periodicity
IntervalMonths
InstallmentCount    opcional
CompetencesJson     opcional
```

Exemplo:

```javascript
const form = new FormData();
form.append('PaymentPersonId', personId);
form.append('Description', 'Adiantamento');
form.append('TotalValue', '600.00');
form.append('InstallmentValue', '150.00');
form.append('Date', '2026-08-01');
form.append('StartYear', '2026');
form.append('StartMonth', '8');
form.append('Periodicity', '1');
form.append('IntervalMonths', '1');
form.append('InstallmentCount', '4');
form.append('CompetencesJson', JSON.stringify([]));

const voucher = await paymentsRequest('/vouchers', {
    method: 'POST',
    body: form
});
```

Para periodicidade personalizada:

```javascript
const competences = [
    { year: 2026, month: 8, skip: false },
    { year: 2026, month: 9, skip: true }
];

form.append('CompetencesJson', JSON.stringify(competences));
```

### Alterar status

```http
PATCH /api/payments/vouchers/{voucherId}/status
```

Campo `FormData`: `Status`.

Vales entram automaticamente somente na segunda quinzena.

## 16. Dados do calculo

Os endpoints de previa e confirmacao recebem os mesmos campos:

```text
PaymentPersonId
CompetenceYear
CompetenceMonth
Fortnight
BonusValue
FullAbsences
HalfAbsences
PositiveMinutes
NegativeMinutes
NightMinutes
ExcludedVoucherIdsJson
AdditionsJson
DeductionsJson
```

Funcao reutilizavel:

```javascript
function buildCalculationForm(data) {
    const form = new FormData();
    form.append('PaymentPersonId', data.paymentPersonId);
    form.append('CompetenceYear', String(data.competenceYear));
    form.append('CompetenceMonth', String(data.competenceMonth));
    form.append('Fortnight', String(data.fortnight));
    form.append('BonusValue', String(data.bonusValue ?? 0));
    form.append('FullAbsences', String(data.fullAbsences ?? 0));
    form.append('HalfAbsences', String(data.halfAbsences ?? 0));
    form.append('PositiveMinutes', String(data.positiveMinutes ?? 0));
    form.append('NegativeMinutes', String(data.negativeMinutes ?? 0));
    form.append('NightMinutes', String(data.nightMinutes ?? 0));
    form.append('ExcludedVoucherIdsJson', JSON.stringify(data.excludedVoucherIds ?? []));
    form.append('AdditionsJson', JSON.stringify(data.additions ?? []));
    form.append('DeductionsJson', JSON.stringify(data.deductions ?? []));
    return form;
}
```

Formatos das listas:

```javascript
const excludedVoucherIds = ['GUID-DO-VALE'];

const additions = [
    { description: 'Comissao', amount: 100.00 }
];

const deductions = [
    { description: 'Desconto manual', amount: 50.00 }
];
```

Nao envie o bonus em `AdditionsJson`. Informe-o somente no campo `BonusValue` do calculo.

## 17. Gerar previa

```http
POST /api/payments/calculations/preview
```

```javascript
async function previewPayment(data) {
    return paymentsRequest('/calculations/preview', {
        method: 'POST',
        body: buildCalculationForm(data)
    });
}
```

Exemplo de resposta:

```json
{
  "paymentPersonId": "GUID",
  "personName": "Prestador Teste",
  "employmentType": 2,
  "competenceYear": 2026,
  "competenceMonth": 8,
  "fortnight": 2,
  "baseValue": 2500.00,
  "fortnightPercent": 50.00,
  "firstFortnightPaid": 1250.00,
  "grossValue": 1550.00,
  "additionValue": 0.00,
  "deductionValue": 0.00,
  "netValue": 1550.00,
  "items": [
    {
      "kind": 11,
      "description": "Bonificacao",
      "amount": 300.00,
      "quantityMinutes": null,
      "quantity": null,
      "voucherId": null
    }
  ]
}
```

O cliente deve exibir os valores retornados. Nao recalcule salario, bonus, faltas, horas ou vales no frontend.

## 18. Confirmar calculo

```http
POST /api/payments/calculations
```

```javascript
async function confirmPayment(data) {
    return paymentsRequest('/calculations', {
        method: 'POST',
        body: buildCalculationForm(data)
    });
}
```

Use exatamente os mesmos dados da previa aprovada pelo usuario.

O backend:

- Salva o snapshot do calculo.
- Impede duplicidade por pessoa, competencia e quinzena.
- Atualiza parcelas dos vales aplicados.
- Preserva historico mesmo se valores e regras mudarem depois.

## 19. Consultar historico

```http
GET /api/payments/calculations
GET /api/payments/calculations?personId={GUID}&year=2026&month=8
```

Todos os filtros sao opcionais.

```javascript
async function getHistory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.personId) params.set('personId', filters.personId);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.month) params.set('month', String(filters.month));

    const query = params.toString() ? `?${params}` : '';
    return paymentsRequest(`/calculations${query}`);
}
```

## 19.1 Exportar listas

### Exportar pagamentos em PDF

```http
GET /api/payments/calculations/export
GET /api/payments/calculations/export?personId={GUID}&year=2026&month=8
```

### Exportar bonificacoes em PDF

```http
GET /api/payments/calculations/bonuses/export
GET /api/payments/calculations/bonuses/export?personId={GUID}&year=2026&month=8
```

Todos os filtros sao opcionais. Sem filtros, o arquivo possui todo o historico. O PDF de pagamentos mostra nome, competencia, quinzena, salario, bonificacao, descontos, valor liquido, faltas, vales e horas positivas, negativas ou noturnas. O PDF de bonificacoes inclui somente calculos que possuem bonificacao e apresenta valor bruto, desconto por faltas e valor liquido.

Exemplo de download no navegador:

```javascript
async function downloadPaymentPdf(path, fileName) {
    const response = await fetch(`${API_ORIGIN}/api/payments${path}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) throw new Error('Nao foi possivel exportar o arquivo.');

    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

downloadPaymentPdf('/calculations/export?year=2026&month=8', 'pagamentos-2026-08.pdf');
downloadPaymentPdf('/calculations/bonuses/export?year=2026&month=8', 'bonificacoes-2026-08.pdf');
```

Os arquivos usam a identidade visual da Ceramica Canelas e incluem a logo da empresa.

## 20. Marcar como pago

```http
PATCH /api/payments/calculations/{calculationId}/paid
```

```javascript
async function markAsPaid(calculationId, date = new Date()) {
    const form = new FormData();
    form.append('PaidAt', date.toISOString());

    await paymentsRequest(`/calculations/${calculationId}/paid`, {
        method: 'PATCH',
        body: form
    });
}
```

Resposta `204`.

## 21. Regras de negocio que o cliente precisa respeitar

1. A primeira quinzena precisa ser confirmada antes da segunda.
2. A primeira quinzena do funcionario usa apenas o percentual configurado.
3. O prestador pode receber descontos de falta na primeira quinzena.
4. O bonus informado no calculo de funcionario ou prestador entra na segunda quinzena.
5. No salario, uma falta inteira desconta `salario / 30 / 8 * 8`, equivalente a um dia.
6. No salario, uma meia falta desconta `salario / 30 / 8 * 4`, equivalente a meio dia.
7. Na bonificacao, uma falta inteira desconta R$ 100 e uma meia falta desconta R$ 50, limitados ao bonus informado.
8. Duas meias faltas sao normalizadas para uma inteira.
9. Vales entram somente na segunda quinzena.
10. O cliente pode excluir vales da simulacao usando `ExcludedVoucherIdsJson`.
11. Qualquer mudanca no formulario depois da previa deve invalidar a previa e exigir nova simulacao.

## 22. Fluxo completo recomendado

### Preparacao

1. Carregar pessoas com `GET /people`.
2. Carregar regras com `GET /rules`.
3. Manter apenas pessoas ativas disponiveis para novos calculos.

### Calculo

1. Selecionar pessoa.
2. Selecionar ano, mes e quinzena.
3. Carregar os vales da pessoa.
4. Informar bonificacao, faltas, minutos e ajustes manuais.
5. Selecionar vales que devem ser excluidos.
6. Chamar `/calculations/preview`.
7. Exibir totais e todos os itens retornados.
8. Pedir confirmacao do usuario.
9. Chamar `/calculations` com os mesmos dados.
10. Atualizar historico, pessoas e vales.

### Pagamento

1. Consultar historico.
2. Selecionar calculo confirmado.
3. Chamar `/{calculationId}/paid`.
4. Atualizar historico.

## 23. Tratamento de erros

```text
400: campos invalidos ou regra de negocio nao atendida.
401: token ausente, invalido ou expirado.
403: usuario sem perfil Financial/Admin.
404: pessoa, vale ou calculo nao encontrado.
415: POST/PATCH enviado sem FormData ou com Content-Type incorreto.
500: erro inesperado no servidor.
```

Sempre mostre `body.message` quando existir.

Mensagens importantes:

```text
Confirme a primeira quinzena antes de calcular a segunda.
Ja existe um calculo confirmado para esta pessoa, competencia e quinzena.
Nao existe regra de pagamento vigente para esta competencia.
```

## 24. CORS

O dominio do cliente precisa estar permitido na politica CORS do backend. Se o navegador bloquear a requisicao antes de receber uma resposta HTTP, adicione a origem exata na configuracao CORS da API.

Exemplo de origem:

```text
http://localhost:3000
```

Protocolo, dominio e porta fazem parte da origem. `http://localhost:3000` e diferente de `http://localhost:5173`.

## 25. Checklist final

- Migration aplicada no mesmo banco usado pela API.
- API funcionando e Swagger acessivel.
- Origem do cliente permitida no CORS.
- Token JWT enviado em todas as chamadas.
- Usuario com perfil `Financial` ou `Admin`.
- URL formada como `ORIGEM/api/payments`.
- `GET` sem body.
- `POST` e `PATCH` com `FormData`.
- Nenhum `Content-Type` manual ao usar `FormData`.
- Listas convertidas com `JSON.stringify`.
- Datas no formato correto.
- Valores monetarios sem `R$` e sem separador de milhar.
- Bonus permitido para funcionario e prestador.
- Previa executada antes da confirmacao.
- Mesmos dados usados na previa e confirmacao.
- Historico e vales recarregados depois da confirmacao.
- Erros da API apresentados ao usuario.

## 26. Endpoints resumidos

```text
GET   /api/payments/people
POST  /api/payments/people
PATCH /api/payments/people/{personId}/salary
PATCH /api/payments/people/{personId}/status

GET   /api/payments/rules
POST  /api/payments/rules

GET   /api/payments/vouchers
POST  /api/payments/vouchers
PATCH /api/payments/vouchers/{voucherId}/status

POST  /api/payments/calculations/preview
POST  /api/payments/calculations
GET   /api/payments/calculations
GET   /api/payments/calculations/export
GET   /api/payments/calculations/bonuses/export
PATCH /api/payments/calculations/{calculationId}/paid
```
