import { api } from './api';

export interface PaymentPerson {
  id: string; name: string; employmentType: number; isActive: boolean;
  monthlyValue: number; monthlyBonus: number; admissionDate: string | null; contractualDsrAuthorized: boolean;
}
export interface Absence {
  id: string; paymentPersonId: string; date: string; isHalf: boolean; isCancelled: boolean;
  observation: string; recordedBy: string; revision: number; fortnight: number;
}
export interface Preparation { id: string; revision: number; status: number; requestJson: string }
export interface Adjustment { id: string; reference: string; amount: number; reason: string; paidAt: string | null; revision: number }
export interface History {
  id: string; paymentPersonId: string; personName: string; competenceYear: number; competenceMonth: number;
  fortnight: number; netValue: number; status: number; paidAt: string | null;
}
export interface MonthlySummary {
  periods: History[]; adjustments: Adjustment[]; originalNetTotal: number; adjustmentTotal: number; isClosed: boolean;
}
export interface AccountantSummary {
  fullAbsences: number; halfAbsences: number; totalDays: number; occurrences: Absence[];
  periods: { fortnight: number; fullAbsences: number; halfAbsences: number; totalDays: number }[];
}
export interface DsrCharge { id: string; weekStart: string; amount: number; paymentCalculationId: string; absenceIds: string; isCancelled: boolean }
export interface DeletePaymentEntryRequest { reason: string; revision?: number; correctClosedPeriod?: boolean }
export function deletionRequest(reason: string, revision?: number, correctClosedPeriod?: boolean): DeletePaymentEntryRequest {
  const trimmed = reason.trim();
  if (!trimmed || reason.length > 2000) throw new Error('Informe o motivo da ação, com até 2000 caracteres.');
  if (revision !== undefined && (!Number.isInteger(revision) || revision < 0)) throw new Error('Revisão inválida. Atualize os dados.');
  return { reason: trimmed, ...(revision !== undefined ? { revision } : {}), ...(correctClosedPeriod !== undefined ? { correctClosedPeriod } : {}) };
}
/** Cancelled snapshots remain in history but never block a new calculation. */
export function activeCalculation<T extends { status?: number | string }>(history: T[]): T | null {
  return history.find(row => row.status === 2 || row.status === 3) ?? null;
}
export function calculationCancellationBlock(
  row: Pick<History, 'id' | 'status' | 'paidAt' | 'fortnight' | 'paymentPersonId' | 'competenceYear' | 'competenceMonth'>,
  history: History[], hasAdjustments: boolean,
): string | null {
  if (row.status === 4) return 'Apuração já cancelada.';
  if (row.status === 3 || row.paidAt) return 'Apuração paga: use um ajuste rastreável.';
  if (row.status !== 2) return 'Somente apurações fechadas e não pagas podem ser canceladas.';
  if (hasAdjustments) return 'Apuração com ajustes: cancelamento indisponível.';
  if (row.fortnight === 1 && history.some(other => other.paymentPersonId === row.paymentPersonId && other.competenceYear === row.competenceYear && other.competenceMonth === row.competenceMonth && other.fortnight === 2 && other.status !== 4)) return 'Cancele primeiro a segunda quinzena ativa.';
  return null;
}
export interface Audit { id: string; createdOn: string; userId: string; action: string; reason: string; before: string; after: string }
export interface CalculationRequest {
  paymentPersonId: string; competenceYear: number; competenceMonth: number; fortnight: number;
  bonusValue: number; fullAbsences: number; halfAbsences: number; positiveMinutes: number; negativeMinutes: number; nightMinutes: number;
  accountantAmount: number | null; excludedVoucherIds: string[];
  additions: { description: string; amount: number }[]; deductions: { description: string; amount: number }[];
}
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function decimal(value: string, allowNegative = false): number {
  if (!(allowNegative ? /^-?\d+(?:[.,]\d{1,2})?$/ : /^\d+(?:[.,]\d{1,2})?$/).test(value.trim())) throw new Error('Informe um valor com até duas casas decimais, sem separador de milhar.');
  const result = Number(value.replace(',', '.'));
  if (!Number.isFinite(result)) throw new Error('Valor inválido.');
  return result;
}
export function formData(values: Record<string, string | number | boolean | null | undefined>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => { if (value !== null && value !== undefined) data.append(key, String(value)); });
  return data;
}
export function calculationForm(c: CalculationRequest) {
  return formData({ PaymentPersonId: c.paymentPersonId, CompetenceYear: c.competenceYear, CompetenceMonth: c.competenceMonth, Fortnight: c.fortnight,
    BonusValue: 0, FullAbsences: 0, HalfAbsences: 0, PositiveMinutes: c.positiveMinutes, NegativeMinutes: c.negativeMinutes, NightMinutes: c.nightMinutes,
    AccountantAmount: c.accountantAmount, ExcludedVoucherIdsJson: JSON.stringify(c.excludedVoucherIds), AdditionsJson: JSON.stringify(c.additions), DeductionsJson: JSON.stringify(c.deductions) });
}
/** Internal snapshots may have PascalCase keys and nested JSON encoding. */
export function parseStored(value: string): unknown {
  let parsed: unknown = value;
  for (let i = 0; i < 3 && typeof parsed === 'string'; i++) { try { parsed = JSON.parse(parsed); } catch { break; } }
  return parsed;
}
export function restoreCalculation(value: string): CalculationRequest {
  const normalize = (v: unknown): unknown => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k[0].toLowerCase() + k.slice(1), normalize(x)])) : v;
  const parsed = normalize(parseStored(value)) as { calculation?: CalculationRequest } & CalculationRequest;
  if (!parsed || typeof parsed !== 'object') throw new Error('Preparação inválida. Recarregue e confira os dados.');
  return parsed.calculation ?? parsed;
}
export const payments = {
  get: async <T>(path: string, params?: object, signal?: AbortSignal): Promise<T> => {
    const response = await api.get(`/api/payments${path}`, { params, signal });
    return (response.status === 204 ? null : response.data) as T;
  },
  post: async <T>(path: string, body: unknown): Promise<T> => (await api.post(`/api/payments${path}`, body)).data,
  put: async <T>(path: string, body: unknown): Promise<T> => (await api.put(`/api/payments${path}`, body)).data,
  patch: async (path: string, body: unknown) => { await api.patch(`/api/payments${path}`, body); },
  delete: async (path: string, body: DeletePaymentEntryRequest) => {
    await api.delete(`/api/payments${path}`, { data: body, headers: { 'Content-Type': 'application/json' } });
  },
};
