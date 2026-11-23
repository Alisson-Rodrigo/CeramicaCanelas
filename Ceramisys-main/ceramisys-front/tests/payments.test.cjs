/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner loads TypeScript in memory without additional dependencies. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = new Module(file, module); mod.paths = module.paths;
  mod.require = name => dependencies[name] ?? require(name);
  mod._compile(source, file); return mod.exports;
}
const calls = [];
let response = { data: null };
const api = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(verb => [verb, async (...args) => { calls.push([verb, ...args]); return response; }]));
const service = load('lib/payments.ts', { './api': { api } });
test('multipart preserves explicit zero/false and omits optional preservation fields', () => {
  const form = service.formData({ MonthlyBonus: 0, ContractualDsrAuthorized: false, AdmissionDate: undefined });
  assert.equal(form.get('MonthlyBonus'), '0'); assert.equal(form.get('ContractualDsrAuthorized'), 'false'); assert.equal(form.has('AdmissionDate'), false);
});
test('calculation serializes arrays only in multipart, accepts accountant zero and never sends ad hoc absences/bonus', () => {
  const request = { paymentPersonId: 'person', competenceYear: 2026, competenceMonth: 11, fortnight: 2, accountantAmount: 0,
    bonusValue: 400, fullAbsences: 3, halfAbsences: 1, positiveMinutes: 0, negativeMinutes: 0, nightMinutes: 0, excludedVoucherIds: ['voucher'], additions: [{ description: 'Approved', amount: 25.5 }], deductions: [] };
  const form = service.calculationForm(request);
  assert.equal(form.get('AccountantAmount'), '0'); assert.equal(form.get('BonusValue'), '0'); assert.equal(form.get('FullAbsences'), '0');
  assert.deepEqual(JSON.parse(form.get('ExcludedVoucherIdsJson')), ['voucher']); assert.deepEqual(JSON.parse(form.get('AdditionsJson')), request.additions); assert.equal(form.has('additions'), false);
});
test('stored preparation restores PascalCase, arrays and double JSON encoding', () => {
  const restored = service.restoreCalculation(JSON.stringify(JSON.stringify({ Calculation: { AccountantAmount: 0, ExcludedVoucherIds: [], Additions: [{ Description: 'a', Amount: 1 }], PaymentPersonId: 'p' } })));
  assert.equal(restored.accountantAmount, 0); assert.equal(restored.paymentPersonId, 'p'); assert.deepEqual(restored.additions, [{ description: 'a', amount: 1 }]);
  assert.equal(service.parseStored('<script>unsafe</script>'), '<script>unsafe</script>');
});
test('decimal entry rejects ambiguous thousands, excess decimals and negative manual deductions', () => {
  assert.equal(service.decimal('3000,50'), 3000.5); assert.equal(service.decimal('-50.00', true), -50);
  for (const value of ['3.000,50', '1.001', '-10', '', 'NaN']) assert.throws(() => service.decimal(value));
});
test('adapter handles empty preparation and no-content mutations without parsing JSON', async () => {
  response = { status: 204, data: '' }; const signal = new AbortController().signal;
  assert.equal(await service.payments.get('/preparations', { year: 2026 }, signal), null);
  assert.deepEqual(calls.at(-1), ['get', '/api/payments/preparations', { params: { year: 2026 }, signal }]);
  assert.equal(await service.payments.patch('/calculations/id/adjustments/paid', { reference: ' exact ', paidAt: '2026-11-30T15:00:00Z' }), undefined);
  assert.deepEqual(calls.at(-1), ['patch', '/api/payments/calculations/id/adjustments/paid', { reference: ' exact ', paidAt: '2026-11-30T15:00:00Z' }]);
});
test('absence PUT keeps date-only and revision; preparation JSON keeps real arrays', async () => {
  await service.payments.put('/people/p/absences/a', { date: '2026-11-02', revision: 7, isHalf: true, correctClosedPeriod: true });
  assert.equal(calls.at(-1)[2].revision, 7); assert.equal(calls.at(-1)[2].date, '2026-11-02');
  await service.payments.post('/preparations', { calculation: { additions: [], accountantAmount: 0 }, inReview: false, revision: 2 });
  assert.deepEqual(calls.at(-1)[2].calculation.additions, []); assert.equal(calls.at(-1)[2].inReview, false);
});
const errors = load('lib/api-error.ts');
test('business errors, ValidationProblemDetails, empty 403 and transport errors remain distinct', () => {
  const error = (status, data) => ({ isAxiosError: true, response: { status, data } });
  assert.match(errors.getApiErrorMessage(error(400, { message: 'Revisão divergente' })), /Revisão divergente/);
  assert.match(errors.getApiErrorMessage(error(400, { errors: { Revision: ['Confira o registro atual'] } })), /Confira o registro atual/);
  assert.match(errors.getApiErrorMessage(error(403)), /permissão/); assert.match(errors.getApiErrorMessage(error(401)), /sessão/);
  assert.match(errors.getApiErrorMessage({ isAxiosError: true }), /conectar/);
});
test('all five audited DELETE endpoints use config.data JSON and handle 204 without parsing', async () => {
  response = { status: 204, data: '' };
  for (const [path, revision, correction] of [
    ['/people/person'], ['/people/person/absences/absence', 7, false], ['/vouchers/voucher'], ['/preparations/preparation', 0], ['/calculations/calculation'],
  ]) {
    const body = service.deletionRequest('  Motivo auditável  ', revision, correction);
    assert.equal(await service.payments.delete(path, body), undefined);
    assert.deepEqual(calls.at(-1), ['delete', '/api/payments' + path, { data: body, headers: { 'Content-Type': 'application/json' } }]);
    assert.equal(body.reason, 'Motivo auditável');
    assert.equal('revision' in body, revision !== undefined); assert.equal('correctClosedPeriod' in body, correction !== undefined);
    assert.equal('userId' in body, false); assert.equal('actor' in body, false);
  }
  const body = service.deletionRequest('Correção fechada', 9, true);
  assert.equal(body.correctClosedPeriod, true); assert.equal(body.revision, 9);
});
test('deletion reason and revision are validated without silently changing the version', () => {
  for (const reason of ['', '   ', 'x'.repeat(2001)]) assert.throws(() => service.deletionRequest(reason));
  for (const revision of [-1, 1.5, NaN]) assert.throws(() => service.deletionRequest('Motivo', revision));
  assert.equal(service.deletionRequest('Motivo', 0).revision, 0);
});
test('cancelled calculations do not block preparations or a new active closing', () => {
  const cancelled = { id: 'old', status: 4 }; const active = { id: 'new', status: 2 };
  assert.equal(service.activeCalculation([cancelled]), null);
  assert.equal(service.activeCalculation([cancelled, active]), active);
  assert.equal(service.activeCalculation([{ id: 'paid', status: 3 }, cancelled]).id, 'paid');
});
test('cancellation preflight protects paid/adjusted snapshots and the second-fortnight dependency', () => {
  const first = { id: 'first', status: 2, paidAt: null, fortnight: 1, paymentPersonId: 'p', competenceYear: 2026, competenceMonth: 11 };
  const second = { ...first, id: 'second', fortnight: 2 };
  assert.match(service.calculationCancellationBlock(first, [first, second], false), /segunda/);
  assert.equal(service.calculationCancellationBlock(first, [first, { ...second, status: 4 }], false), null);
  assert.equal(service.calculationCancellationBlock(first, [first, { ...second, paymentPersonId: 'other' }], false), null);
  assert.match(service.calculationCancellationBlock({ ...first, status: 3 }, [], false), /paga/);
  assert.match(service.calculationCancellationBlock({ ...first, paidAt: '2026-11-16T12:00:00Z' }, [], false), /paga/);
  assert.match(service.calculationCancellationBlock(first, [], true), /ajustes/);
  assert.match(service.calculationCancellationBlock({ ...first, status: 4 }, [], false), /já cancelada/);
});
test('DELETE failure is surfaced unchanged with no automatic retry, including 404 and revision errors', async () => {
  const original = api.delete; let attempts = 0;
  try {
    for (const [status, message] of [[404, 'Falta não encontrada'], [400, 'Revisão divergente']]) {
      const failure = { isAxiosError: true, response: { status, data: { message } } };
      api.delete = async () => { attempts++; throw failure; };
      await assert.rejects(service.payments.delete('/people/p/absences/a', service.deletionRequest('Motivo', 2)), error => error === failure);
      assert.equal(errors.getApiErrorMessage(failure), message);
    }
    assert.equal(attempts, 2);
  } finally { api.delete = original; }
});
