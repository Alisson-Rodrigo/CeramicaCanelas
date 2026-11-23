import { api } from './api';
import { decimal, formData, parseStored } from './payments';

export interface EmployeePerson { id: string; name: string; employmentType: 1; isActive: boolean; monthlyValue: number; monthlyBonus: number; admissionDate: string | null }
export interface EmployeeReview { isReviewed: boolean; reviewedAt: string | null; reviewedBy: string | null }
export interface EmployeeAbsence { id: string; paymentPersonId: string; date: string; isHalf: boolean; isCancelled: boolean; observation: string; recordedBy: string; revision: number; year: number; month: number; fortnight: 1 | 2; employeeReview?: EmployeeReview }
export interface VoucherDiscount { calculationId: string; year: number; month: number; fortnight: number; amount: number; status: number; calculatedAt: string; paidAt: string | null }
export interface EmployeeVoucher { id: string; paymentPersonId: string; description: string; date: string; referenceYear: number; referenceMonth: number; totalValue: number | null; deductedValue: number | null; pendingBalance: number | null; allowPartialDiscount: boolean; availableForDiscount: boolean; status: number; discounts: VoucherDiscount[] }
export interface EmployeeItem { kind: number; description: string; amount: number; quantity?: number | null; quantityMinutes?: number | null; voucherId?: string | null; absenceId?: string | null }
export interface EmployeeSettlement { accountantProvidedAmount?: number | null; internalVoucherDeduction: number; netPayable: number; firstFortnightAccountantAmount?: number | null; firstFortnightNet: number; firstFortnightPaidAt?: string | null; accountantReference?: string | null; accountantNotes?: string | null; isLegacyCalculation: boolean }
export interface EmployeePreview { paymentPersonId: string; personName: string; competenceYear: number; competenceMonth: number; fortnight: number; baseValue: number; fortnightPercent: number; firstFortnightPaid: number; grossValue: number; additionValue: number; deductionValue: number; netValue: number; installmentBase: number; originalBonus: number; bonusDeduction: number; finalBonus: number; absenceDeduction: number; items: EmployeeItem[]; employeeSettlement?: EmployeeSettlement }
export interface EmployeeHistory { id: string; paymentPersonId: string; personName: string; competenceYear: number; competenceMonth: number; fortnight: number; baseValue: number; netValue: number; firstFortnightValue: number; secondFortnightValue: number; monthlyTotalValue: number; status: number; calculatedAt: string; paidAt: string | null; items: EmployeeItem[]; employeeSettlement?: EmployeeSettlement }
export interface EmployeeAdjustment { id: string; paymentCalculationId: string; reference: string; amount: number; reason: string; userId: string; paidAt: string | null; revision: number; createdOn: string }
export interface EmployeePreparation { id: string; paymentPersonId: string; year: number; month: number; fortnight: number; status: number; requestJson: string; revision: number }
export interface EmployeeAudit { id: string; createdOn: string; userId: string; action: string; reason: string; before: string; after: string }
export interface EmployeeBonusRule { id: string; effectiveFrom: string; fullAbsenceValue: number; halfAbsenceValue: number }
export interface EmployeeAccountantSummary { person: { id: string; name: string }; year: number; month: number; fullAbsences: number; halfAbsences: number; occurrences: { date: string; isHalf: boolean }[]; hours: { positiveMinutes: number; negativeMinutes: number; balanceMinutes: number; positiveHours: string; negativeHours: string; balanceHours: string } }
export interface EmployeeSubmission { id: string; paymentPersonId: string; year: number; month: number; reference: string; recordedAt: string; recordedBy: string; summary: EmployeeAccountantSummary }
export interface EmployeeMonthlySummary { paymentPersonId: string; year: number; month: number; periods: EmployeeHistory[]; adjustments: EmployeeAdjustment[]; originalNetTotal: number; adjustmentTotal: number; isClosed: boolean }
export interface EmployeePeriod { personId: string; year: number; month: number; fortnight: 1 | 2 }
export interface VoucherSelection { voucherId: string; amount: number }
export interface EmployeeCalculation { paymentPersonId: string; competenceYear: number; competenceMonth: number; fortnight: 1 | 2; voucherSelections: VoucherSelection[]; accountantAmount?: number | null; accountantReference?: string; accountantNotes?: string }
export interface EmployeeAbsenceRequest { date: string; isHalf: boolean; observation: string; isCancelled: boolean; revision: number; correctClosedPeriod: boolean }
export interface EmployeeDeletion { reason: string; revision?: number; correctClosedPeriod?: boolean }
const base = '/api/employee-payments';
const id = (value: string) => encodeURIComponent(value);
export const employeeError = (error: unknown) => error instanceof Error && !('response' in error) && !('isAxiosError' in error) ? error.message : null;
export function employeePeriod(year: number, month: number, fortnight?: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12 || (fortnight !== undefined && fortnight !== 1 && fortnight !== 2)) throw new Error('Informe uma competência e quinzena válidas.');
}
export function employeeMoney(value: string, minimum = 0, signed = false) { const amount = decimal(value, signed); if (amount < minimum) throw new Error('Valor abaixo do mínimo permitido.'); return amount; }
export function employeeText(value: string, maximum: number, required = true) { const text = value.trim(); if ((required && !text) || text.length > maximum) throw new Error('Preencha o texto obrigatório e respeite o limite de ' + maximum + ' caracteres.'); return text; }
export function employeeDate(value: string) {
  const parsed = new Date(value + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1 || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Informe uma data válida.');
  return value;
}
export function employeeDeletion(reason: string, revision?: number, correctClosedPeriod?: boolean): EmployeeDeletion {
  if (revision !== undefined && (!Number.isInteger(revision) || revision < 0)) throw new Error('Atualize os dados antes de continuar.');
  return { reason: employeeText(reason, 2000), ...(revision !== undefined ? { revision } : {}), ...(correctClosedPeriod !== undefined ? { correctClosedPeriod } : {}) };
}
export function employeePersonForm(values: { name?: string; monthlyValue: string; monthlyBonus?: string; admissionDate?: string }, creating: boolean) {
  return formData({ MonthlyValue: employeeMoney(values.monthlyValue, .01), MonthlyBonus: values.monthlyBonus?.trim() ? employeeMoney(values.monthlyBonus) : creating ? 0 : undefined, AdmissionDate: values.admissionDate ? employeeDate(values.admissionDate) : undefined,
    ...(creating ? { Name: employeeText(values.name ?? '', 150) } : {}) });
}
export function employeeVoucherForm(values: { description: string; value: string; date: string; referenceYear: number; referenceMonth: number }) {
  employeePeriod(values.referenceYear, values.referenceMonth);
  return formData({ Description: employeeText(values.description, 200), Value: employeeMoney(values.value, .01), Date: employeeDate(values.date), ReferenceYear: values.referenceYear, ReferenceMonth: values.referenceMonth });
}
export function employeeCalculationPayload(value: EmployeeCalculation): EmployeeCalculation {
  employeePeriod(value.competenceYear, value.competenceMonth, value.fortnight);
  if (!value.paymentPersonId) throw new Error('Selecione um funcionário.');
  if (value.accountantAmount == null) throw new Error('Informe o valor manual recebido do contador.');
  const legacy = value as EmployeeCalculation & { additions?: unknown[]; deductions?: unknown[]; accountantAmountMode?: number };
  if (legacy.additions?.length || legacy.deductions?.length || (legacy.accountantAmountMode != null && legacy.accountantAmountMode !== 1)) throw new Error('Esta preparação usa regras antigas. Refaça com o valor manual e os vales.');
  const vouchers = value.voucherSelections.map(v => ({ voucherId: v.voucherId, amount: employeeMoney(String(v.amount), .01) }));
  if (new Set(vouchers.map(v => v.voucherId)).size !== vouchers.length) throw new Error('Vale selecionado mais de uma vez.');
  return { paymentPersonId: value.paymentPersonId, competenceYear: value.competenceYear, competenceMonth: value.competenceMonth, fortnight: value.fortnight, accountantAmount: employeeMoney(String(value.accountantAmount)), voucherSelections: vouchers, accountantReference: employeeText(value.accountantReference ?? '', 150, false), accountantNotes: employeeText(value.accountantNotes ?? '', 2000, false) };
}
export function employeeCalculationForm(value: EmployeeCalculation) {
  const c = employeeCalculationPayload(value);
  return formData({ PaymentPersonId: c.paymentPersonId, CompetenceYear: c.competenceYear, CompetenceMonth: c.competenceMonth, Fortnight: c.fortnight, AccountantAmount: c.accountantAmount, VoucherSelectionsJson: JSON.stringify(c.voucherSelections), AccountantReference: c.accountantReference, AccountantNotes: c.accountantNotes });
}
export function restoreEmployeeCalculation(value: string): EmployeeCalculation {
  const normalize = (v: unknown): unknown => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k[0].toLowerCase() + k.slice(1), normalize(x)])) : v;
  const stored = normalize(parseStored(value));
  if (!stored || typeof stored !== 'object') throw new Error('Preparação inválida. Recarregue os dados.');
  const record = stored as Record<string, unknown>; const c = (record.calculation ?? record) as EmployeeCalculation;
  return employeeCalculationPayload({ ...c, voucherSelections: c.voucherSelections ?? [] });
}
export function canConfirmEmployee(c: EmployeeCalculation, history: EmployeeHistory[]): string | null {
  if (history.some(h => h.fortnight === c.fortnight && h.status !== 4)) return 'Já existe um fechamento ativo nesta quinzena.';
  if (c.fortnight === 2 && !history.some(h => h.fortnight === 1 && h.status === 3)) return 'Registre o pagamento da primeira quinzena antes de confirmar a segunda.';
  if (c.accountantAmount == null) return 'Informe o valor manual recebido do contador.';
  return null;
}
export function employeeCancellationBlock(row: EmployeeHistory, history: EmployeeHistory[], adjustments: EmployeeAdjustment[]) {
  if (row.status !== 2 || row.paidAt) return 'Somente fechamento não pago pode ser cancelado.';
  if (adjustments.length) return 'Este fechamento possui ajustes e não pode ser cancelado.';
  if (row.fortnight === 1 && history.some(h => h.paymentPersonId === row.paymentPersonId && h.competenceYear === row.competenceYear && h.competenceMonth === row.competenceMonth && h.fortnight === 2 && h.status !== 4)) return 'Cancele a segunda quinzena ativa primeiro.';
  return null;
}
async function get<T>(path: string, params?: object, signal?: AbortSignal): Promise<T> { const r = await api.get(base + path, { params, signal }); return (r.status === 204 ? null : r.data) as T; }
const post = async <T>(path: string, body: unknown): Promise<T> => (await api.post(base + path, body)).data;
const patch = async (path: string, body: unknown) => { await api.patch(base + path, body); };
const remove = async (path: string, body: EmployeeDeletion) => { await api.delete(base + path, { data: body, headers: { 'Content-Type': 'application/json' } }); };
const personPath = (personId: string) => '/people/' + id(personId);
const calculationPath = (calculationId: string) => '/calculations/' + id(calculationId);
export const employeePayments = {
  people: (signal?: AbortSignal) => get<EmployeePerson[]>('/people', undefined, signal),
  createPerson: (body: FormData) => post<EmployeePerson>('/people', body),
  salary: (personId: string, body: FormData) => patch(personPath(personId) + '/salary', body),
  status: (personId: string, isActive: boolean) => patch(personPath(personId) + '/status', formData({ IsActive: isActive })),
  deletePerson: (personId: string, body: EmployeeDeletion) => remove(personPath(personId), body),
  vouchers: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeVoucher[]>(personPath(p.personId) + '/vouchers', { year: p.year, month: p.month, fortnight: p.fortnight }, signal),
  createVoucher: (personId: string, body: FormData) => post<unknown>(personPath(personId) + '/vouchers', body),
  voucherStatus: (voucherId: string, status: number) => patch('/vouchers/' + id(voucherId) + '/status', formData({ Status: status })),
  deleteVoucher: (voucherId: string, body: EmployeeDeletion) => remove('/vouchers/' + id(voucherId), body),
  absences: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeAbsence[]>(personPath(p.personId) + '/absences', { year: p.year, month: p.month }, signal),
  createAbsence: (personId: string, body: EmployeeAbsenceRequest) => post<EmployeeAbsence>(personPath(personId) + '/absences', body),
  updateAbsence: async (personId: string, absenceId: string, body: EmployeeAbsenceRequest): Promise<EmployeeAbsence> => (await api.put(base + personPath(personId) + '/absences/' + id(absenceId), body)).data,
  deleteAbsence: (personId: string, absenceId: string, body: EmployeeDeletion) => remove(personPath(personId) + '/absences/' + id(absenceId), body),
  reviewAbsence: (personId: string, absenceId: string, body: { isReviewed: boolean; revision: number; notes?: string }) => patch(personPath(personId) + '/absences/' + id(absenceId) + '/review', body),
  accountant: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeAccountantSummary>(personPath(p.personId) + '/accountant-summary', { year: p.year, month: p.month }, signal).then(strictAccountantSummary),
  createSubmission: (personId: string, body: { year: number; month: number; reference: string; notes?: string }) => post<EmployeeSubmission>(personPath(personId) + '/accountant-submissions', body),
  submissions: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeSubmission[]>(personPath(p.personId) + '/accountant-submissions', { year: p.year, month: p.month }, signal).then(rows => rows.map(row => ({ ...row, summary: strictAccountantSummary(row.summary) }))),
  monthly: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeMonthlySummary>(personPath(p.personId) + '/monthly-summary', { year: p.year, month: p.month }, signal),
  audit: (personId: string, signal?: AbortSignal) => get<EmployeeAudit[]>(personPath(personId) + '/audit', undefined, signal),
  preview: (c: EmployeeCalculation) => post<EmployeePreview>('/calculations/preview', employeeCalculationForm(c)),
  confirm: (c: EmployeeCalculation) => post<EmployeeHistory>('/calculations', employeeCalculationForm(c)),
  history: (filters: { personId?: string; year?: number; month?: number; fortnight?: number }, signal?: AbortSignal) => get<EmployeeHistory[]>('/calculations', filters, signal),
  paid: (calculationId: string, paidAt: string) => patch(calculationPath(calculationId) + '/paid', formData({ PaidAt: paidAt })),
  cancel: (calculationId: string, body: EmployeeDeletion) => remove(calculationPath(calculationId), body),
  savePreparation: (c: EmployeeCalculation, inReview: boolean, revision: number) => post<EmployeePreparation>('/preparations', { calculation: employeeCalculationPayload(c), inReview, revision }),
  preparation: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeePreparation | null>('/preparations', p, signal),
  deletePreparation: (preparationId: string, body: EmployeeDeletion) => remove('/preparations/' + id(preparationId), body),
  adjustments: (calculationId: string, signal?: AbortSignal) => get<EmployeeAdjustment[]>(calculationPath(calculationId) + '/adjustments', undefined, signal),
  createAdjustment: (calculationId: string, body: { reference: string; amount: number; reason: string }) => post<EmployeeAdjustment>(calculationPath(calculationId) + '/adjustments', body),
  payAdjustments: (calculationId: string, reference: string, paidAt: string) => patch(calculationPath(calculationId) + '/adjustments/paid', { reference, paidAt }),
  legacyBonusPdf: async (filters: EmployeeReportFilters & { fortnight?: number }) => { if (filters.fortnight === 1) throw new Error('Relatório mensal sem primeira quinzena.'); employeePeriod(filters.year,filters.month); return api.get<Blob>(base + '/calculations/bonuses/export', { params: filters, responseType: 'blob' }); },
  rules: (signal?: AbortSignal) => get<EmployeeBonusRule[]>('/rules', undefined, signal),
  hours: (p: EmployeePeriod, signal?: AbortSignal) => get<EmployeeHoursSummary>(personPath(p.personId) + '/hours', { year: p.year, month: p.month }, signal),
  createHours: (personId: string, body: EmployeeTimeRequest) => post<EmployeeTimeEntry>(personPath(personId) + '/hours', body),
  updateHours: async (personId: string, entryId: string, body: EmployeeTimeRequest): Promise<EmployeeTimeEntry> => (await api.put(base + personPath(personId) + '/hours/' + id(entryId), body)).data,
  voucherSheet: (p: EmployeeReportFilters, signal?: AbortSignal) => get<EmployeeVoucherSheetRow[]>('/reports/vouchers', reportFilters(p), signal),
  bonuses: (p: EmployeeReportFilters, signal?: AbortSignal) => get<EmployeeBonusReport[]>('/reports/bonuses', reportFilters(p), signal),
  download: employeeDownload,
  exportPdf: async (bonuses: boolean, filters: { personId?: string; year?: number; month?: number; fortnight?: number }) => {
    if (bonuses && filters.fortnight === 1) throw new Error('Bonificação é um relatório mensal, sem primeira quinzena.');
    return (await employeeDownload(bonuses ? 'bonuses' : 'payments', filters)).blob;
  },
};

export function employeeSelections(selected: Record<string, string>, vouchers: EmployeeVoucher[]): VoucherSelection[] {
  return Object.entries(selected).map(([voucherId, value]) => {
    const voucher = vouchers.find(row => row.id === voucherId); const amount = employeeMoney(value, .01);
    if (!voucher?.availableForDiscount || voucher.pendingBalance == null || !Number.isFinite(voucher.pendingBalance) || amount > voucher.pendingBalance) throw new Error('O vale selecionado está indisponível ou o valor supera seu saldo. Recarregue a lista.');
    return { voucherId, amount };
  });
}

export interface EmployeeTimeEntry { id: string; date: string; positiveMinutes: number; negativeMinutes: number; notes: string; isCancelled: boolean; revision: number; recordedBy: string }
export interface EmployeeTimeRequest { date: string; positiveMinutes: number; negativeMinutes: number; notes: string; isCancelled: boolean; revision: number; correctClosedPeriod: boolean }
export interface EmployeeHoursSummary { positiveMinutes: number; negativeMinutes: number; balanceMinutes: number; occurrences: EmployeeTimeEntry[] }
export interface EmployeeReportFilters { year: number; month: number; personId?: string }
export interface EmployeeBonusReport { settlementId?: string | null; paymentPersonId: string; personName: string; year: number; month: number; originalBonus: number; fullAbsences: number | null; halfAbsences: number | null; fullAbsenceDeduction: number | null; halfAbsenceDeduction: number | null; absenceDeduction: number; appliedDeduction: number; finalBonus: number; isClosed: boolean; isCancelled: boolean; includedInLegacyPayroll: boolean }
export interface EmployeeVoucherSheetRow { voucherId: string; paymentPersonId: string; personName: string; voucherDate: string; originalValue: number | null; firstFortnightDiscount: number; secondFortnightDiscount: number; discountedInCompetence: number; totalDiscounted: number | null; pendingBalance: number | null; year: number; month: number; paidDiscountsInCompetence: number; reservedDiscountsInCompetence: number }
export function employeeTimeRequest(value: EmployeeTimeRequest): EmployeeTimeRequest {
  employeeDate(value.date);
  if (![value.positiveMinutes, value.negativeMinutes, value.revision].every(n => Number.isSafeInteger(n) && n >= 0) || (!value.positiveMinutes && !value.negativeMinutes)) throw new Error('Informe minutos inteiros não negativos, com ao menos um movimento.');
  return { date: value.date, positiveMinutes: value.positiveMinutes, negativeMinutes: value.negativeMinutes, notes: employeeText(value.notes, 2000, value.correctClosedPeriod), isCancelled: value.isCancelled, revision: value.revision, correctClosedPeriod: value.correctClosedPeriod };
}
export function strictAccountantSummary(value: EmployeeAccountantSummary): EmployeeAccountantSummary {
  if (!value?.person?.id || !value.person.name || !value.hours || !Array.isArray(value.occurrences) || ![value.year,value.month,value.fullAbsences,value.halfAbsences,value.hours.positiveMinutes,value.hours.negativeMinutes,value.hours.balanceMinutes].every(Number.isFinite) || ![value.hours.positiveHours,value.hours.negativeHours,value.hours.balanceHours].every(v => typeof v === 'string')) throw new Error('Resumo do contador incompatível com o contrato atual. Verifique a versão da API.');
  return { person: { id: value.person.id, name: value.person.name }, year: value.year, month: value.month, fullAbsences: value.fullAbsences, halfAbsences: value.halfAbsences, occurrences: value.occurrences.map(row => ({ date: row.date, isHalf: row.isHalf })), hours: { positiveMinutes: value.hours.positiveMinutes, negativeMinutes: value.hours.negativeMinutes, balanceMinutes: value.hours.balanceMinutes, positiveHours: value.hours.positiveHours, negativeHours: value.hours.negativeHours, balanceHours: value.hours.balanceHours } };
}
function reportFilters(p: EmployeeReportFilters) { employeePeriod(p.year, p.month); return { year: p.year, month: p.month, personId: p.personId || undefined }; }
export async function employeeDownload(kind: 'payments' | 'accountant' | 'vouchers' | 'bonuses', filters: { year?: number; month?: number; personId?: string; fortnight?: number }) {
  if (kind !== 'payments') employeePeriod(filters.year!, filters.month!);
  const paths = { payments: '/calculations/export', accountant: '/reports/accountant/export', vouchers: '/reports/vouchers/export', bonuses: '/reports/bonuses/export' };
  const params = kind === 'payments' ? filters : reportFilters(filters as EmployeeReportFilters);
  let response;
  try { response = await api.get<Blob>(base + paths[kind], { params, responseType: 'blob' }); }
  catch (error) { const e = error as { response?: { data: unknown } }; if (e.response?.data instanceof Blob) { const text = await e.response.data.text(); try { e.response.data = JSON.parse(text); } catch { e.response.data = text; } } throw error; }
  const type = String(response.headers?.['content-type'] ?? response.data.type).toLowerCase();
  if (kind === 'vouchers' ? !type.startsWith('text/csv') : !type.startsWith('application/pdf') || await response.data.slice(0,5).text() !== '%PDF-') throw new Error('O servidor não retornou o arquivo solicitado no formato esperado.');
  const disposition = String(response.headers?.['content-disposition'] ?? '');
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let name = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (encoded) { try { name = decodeURIComponent(encoded); } catch { /* Use safe fallback. */ } }
  const extension = kind === 'vouchers' ? '.csv' : '.pdf';
  const safeName = name?.replace(/[\\/<>:"|?*\x00-\x1f]/g, '_').trim();
  return { blob: response.data, filename: safeName?.toLowerCase().endsWith(extension) ? safeName : kind + '-' + (filters.year ?? '') + '-' + (filters.month ?? '') + extension };
}
