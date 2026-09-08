# Testes no Swagger - pagamentos

Autorize com um token `Financial` ou `Admin`. Todos os `POST` e `PATCH` usam `multipart/form-data`.

## Cadastrar prestador

Em `POST /api/payments/people`:

```text
Name: Prestador Teste
EmploymentType: 2
MonthlyValue: 2500.00
EmployeeId: vazio
```

Deve retornar `201` e `monthlyValue: 2500`. A resposta nao possui bonificacao.

Confirme a primeira quinzena em `POST /api/payments/calculations`:

```text
PaymentPersonId: ID retornado
CompetenceYear: 2026
CompetenceMonth: 8
Fortnight: 1
BonusValue: 0
FullAbsences: 0
HalfAbsences: 0
PositiveMinutes: 0
NegativeMinutes: 0
NightMinutes: 0
ExcludedVoucherIdsJson: []
AdditionsJson: []
DeductionsJson: []
```

O liquido deve ser `1250`.

Depois use os mesmos dados em `POST /api/payments/calculations/preview`, alterando `Fortnight` para `2` e `BonusValue` para `300`. O liquido deve ser `1550` e deve existir um item `kind: 11`, `amount: 300`.

## Bonificacao manual

Nao existe cadastro nem endpoint de bonificacao. Nos endpoints abaixo, informe o valor calculado por fora:

```text
BonusValue: 350.00
```

```http
POST /api/payments/calculations/preview
POST /api/payments/calculations
```

## Atualizar salario

`PATCH /api/payments/people/{personId}/salary`:

```text
MonthlyValue: 2700.00
```

Deve retornar `204`. Confira em `GET /api/payments/people` se `monthlyValue` passou a ser `2700`.

## Faltas

Com salario de R$ 2.500 e `BonusValue: 300`, na previa da segunda quinzena:

- `FullAbsences: 1`, `HalfAbsences: 0`: R$ 83,33 do salario e R$ 100 da bonificacao; total R$ 183,33.
- `FullAbsences: 0`, `HalfAbsences: 1`: R$ 41,67 do salario e R$ 50 da bonificacao; total R$ 91,67.
- `FullAbsences: 0`, `HalfAbsences: 2`: equivale a uma inteira; total R$ 183,33.
- Com `BonusValue: 0` e uma falta inteira: desconta somente R$ 83,33 do salario.

O desconto fixo nunca ultrapassa `BonusValue`, portanto nunca consome o salario.

## Vale

`POST /api/payments/vouchers`:

```text
PaymentPersonId: ID da pessoa
Description: Adiantamento
TotalValue: 600.00
InstallmentValue: 150.00
Date: 2026-08-01
StartYear: 2026
StartMonth: 8
Periodicity: 1
IntervalMonths: 1
InstallmentCount: 4
CompetencesJson: []
```

O vale deve aparecer em `GET /api/payments/vouchers?personId=ID` e ser descontado somente na segunda quinzena.

## Exportar pagamentos

Depois de confirmar os calculos, execute:

```http
GET /api/payments/calculations/export?year=2026&month=8&fortnight=1
```

O Swagger deve baixar `pagamentos-2026-08-1a-quinzena.pdf`. Confira que aparecem somente calculos da primeira quinzena, com um funcionario por pagina, numeracao `Pagina X de Y`, logo, cores da empresa, salario, descontos, liquido, faltas e horas.

Repita com `fortnight=2`. O arquivo deve se chamar `pagamentos-2026-08-2a-quinzena.pdf` e conter somente a segunda quinzena.

Para exportar tudo, deixe `personId`, `year` e `month` vazios.

## Exportar bonificacoes

Execute:

```http
GET /api/payments/calculations/bonuses/export?year=2026&month=8&fortnight=2
```

O Swagger deve baixar `bonificacoes-2026-08-2a-quinzena.pdf`. Ele deve mostrar somente calculos com bonificacao da segunda quinzena e apresentar `Bonificacao bruta`, `Desconto por faltas` e `Bonificacao liquida`.

Tambem e possivel filtrar os dois arquivos por `personId`.

Valores decimais podem ser enviados com ponto ou virgula. Nao defina manualmente o `Content-Type` ao integrar pelo navegador.
