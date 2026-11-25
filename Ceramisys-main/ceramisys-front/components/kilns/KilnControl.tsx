'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Factory, Flame, Plus, RefreshCw, ClipboardCheck, FileSpreadsheet, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { isIntegerQuantityText, normalizeLeadingZeros, parseIntegerQuantity } from '@/lib/quantity-input.cjs';
import styles from './kiln.module.css';

type Option = { id: string; name: string; code?: string };
type RecordedBurner = { employeeId: string; employeeNameSnapshot: string };
type Firing = { id: string; kilnName: string; startedAtUtc: string; finishedAtUtc: string; durationMinutes: number; durationClass: string; registeredByName: string; differenceJustification?: string | null; qualityConferencedByName?: string | null; qualityConferencedAtUtc?: string | null; qualityConferenceObservations?: string | null; products: { productType: number; productNameSnapshot: string; quantity: number }[]; burners: string[]; quality: { productType: number; categoryId: string; quantity: number }[]; loadedTotal: number; qualityTotal: number; conference: string };
type QualityRevision = { id: string; revisionNumber: number; conferencedByName?: string | null; conferencedAtUtc?: string | null; observations?: string | null; differenceJustification?: string | null; state: string; loadedTotal: number; classifiedTotal: number; unclassifiedTotal: number; items: { productNameSnapshot: string; categoryNameSnapshot: string; quantity: number }[] };
type Indicators = { firings: number; totalPieces: number; totalLoadedPieces?: number; totalClassifiedPieces?: number; above27Hours: number; above27Percent: number | null; averageDurationMinutes: number; pendingQuality: number; percentagesValid?: boolean; classificationYieldPercent?: number | null; unclassifiedPieces?: number; lossesAvailable?: boolean; lossPieces?: number | null; lossPercent?: number | null; totalsByProduct: { productType: number; productName: string; pieces: number; loadedPieces?: number; classifiedPieces?: number }[]; qualityByCategory?: { categoryId: string; categoryName: string; quantity: number; percent: number | null }[] };
type Props = { onManageEmployees?: () => void };
const emptyIndicators: Indicators = { firings: 0, totalPieces: 0, above27Hours: 0, above27Percent: null, averageDurationMinutes: 0, pendingQuality: 0, totalsByProduct: [], qualityByCategory: [], percentagesValid: false };
const formatDateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value));
const toLocalDateTimeInput = (value: string) => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value)); const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''; return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`; };
const dateTimeInputToUtc = (value: string) => new Date(`${value}:00-03:00`);
const localDateStartUtc = (value: string) => new Date(`${value}T00:00:00-03:00`).toISOString();
const localDateEndUtc = (value: string) => new Date(`${value}T23:59:59.999-03:00`).toISOString();

async function apiErrorMessage(error: unknown, fallback: string): Promise<string> {
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  let data = response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    const text = await data.text();
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; title?: unknown; errors?: Record<string, unknown> };
    if (typeof body.message === 'string') return body.message;
    if (body.errors) {
      const firstError = Object.values(body.errors).flat().find(value => typeof value === 'string');
      if (typeof firstError === 'string') return firstError;
    }
    if (typeof body.title === 'string') return body.title;
  }
  return fallback;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function KilnControl({ onManageEmployees }: Props) {
  const [items, setItems] = useState<Firing[]>([]);
  const [options, setOptions] = useState<{ products: Option[]; burners: Option[]; categories: Option[]; migrationPending: boolean }>({ products: [], burners: [], categories: [], migrationPending: false });
  const [indicators, setIndicators] = useState<Indicators>(emptyIndicators);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [qualityError, setQualityError] = useState('');
  const [saving, setSaving] = useState(false);
  const [kilnFilter, setKilnFilter] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [burnerFilter, setBurnerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('');
  const [periodMode, setPeriodMode] = useState<'custom' | 'month' | 'year'>('custom');
  const [periodMonth, setPeriodMonth] = useState(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date()));
  const [periodYear, setPeriodYear] = useState(new Intl.DateTimeFormat('en', { timeZone: 'America/Fortaleza', year: 'numeric' }).format(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editingFiringId, setEditingFiringId] = useState<string | null>(null);
  const [recordedBurners, setRecordedBurners] = useState<RecordedBurner[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [qualityFiring, setQualityFiring] = useState<Firing | null>(null);
  const [qualityHistoryFiring, setQualityHistoryFiring] = useState<Firing | null>(null);
  const [qualityHistory, setQualityHistory] = useState<QualityRevision[]>([]);
  const [form, setForm] = useState({ kilnName: '', startedAt: '', finishedAt: '', burnerIds: [] as string[], notes: '', products: [] as { productType: number | ''; quantity: string }[] });
  const [qualityRows, setQualityRows] = useState<{ productType: number | ''; categoryId: string; quantity: string }[]>([]);
  const [justification, setJustification] = useState('');
  const [qualityObservations, setQualityObservations] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const opts = await api.get('/api/kiln-firings/options');
      const loadedOptions = { ...opts.data, products: opts.data.products.map((product: Option) => ({ ...product, id: String(product.id) })) };
      setOptions(loadedOptions);
      if (loadedOptions.migrationPending) {
        setItems([]); setPages(1); setIndicators(emptyIndicators);
        return;
      }
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (kilnFilter) params.set('kiln', kilnFilter);
      if (conferenceFilter) params.set('conference', conferenceFilter);
      if (fromFilter) params.set('from', localDateStartUtc(fromFilter));
      if (toFilter) params.set('to', localDateEndUtc(toFilter));
      if (burnerFilter) params.set('burnerId', burnerFilter);
      if (productFilter) params.set('productType', productFilter);
      if (durationFilter) params.set('durationClass', durationFilter);
      const statsParams = new URLSearchParams();
      if (fromFilter) statsParams.set('from', localDateStartUtc(fromFilter));
      if (toFilter) statsParams.set('to', localDateEndUtc(toFilter));
      const [history, stats] = await Promise.all([api.get(`/api/kiln-firings?${params}`), api.get(`/api/kiln-firings/indicators?${statsParams}`)]);
      setItems(history.data.items); setPages(Math.max(1, history.data.pages || 1)); setIndicators(stats.data);
    } catch { setError('Não foi possível carregar o histórico do Controle de Fornos. Tente novamente mais tarde.'); }
    finally { setLoading(false); }
  }, [page, kilnFilter, conferenceFilter, fromFilter, toFilter, burnerFilter, productFilter, durationFilter]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { try { const token = Cookies.get('auth_token'); setIsAdmin(Boolean(token && jwtDecode<{ role?: string }>(token).role === 'Admin')); } catch { setIsAdmin(false); } }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setFormError('');
    if (options.migrationPending) return;
    const startAt = dateTimeInputToUtc(form.startedAt);
    const finishAt = dateTimeInputToUtc(form.finishedAt);
    if (!form.kilnName.trim()) return setFormError('Informe o nome ou número do forno.');
    if (!form.startedAt || !form.finishedAt || Number.isNaN(startAt.getTime()) || Number.isNaN(finishAt.getTime())) return setFormError('Informe a data e o horário de início e de finalização.');
    if (finishAt <= startAt) return setFormError('A finalização precisa ser posterior ao início. Confira as datas e os horários.');
    if (!form.products.length || form.products.some(product => product.productType === '' || !parseIntegerQuantity(product.quantity).valid)) return setFormError('Adicione ao menos um produto e informe uma quantidade inteira maior que zero.');
    if (new Set(form.products.map(product => product.productType)).size !== form.products.length) return setFormError('Cada produto deve aparecer apenas uma vez. Edite a quantidade na linha existente.');
    if (!form.burnerIds.length) return setFormError('Selecione ao menos um queimador participante.');
    setSaving(true);
    try {
      const payload = { ...form, products: form.products.map(product => ({ ...product, quantity: Number(product.quantity) })), startedAt: startAt.toISOString(), finishedAt: finishAt.toISOString() };
      if (editingFiringId) await api.put(`/api/kiln-firings/${editingFiringId}`, payload);
      else await api.post('/api/kiln-firings', payload);
      setShowForm(false); setEditingFiringId(null); setForm({ kilnName: '', startedAt: '', finishedAt: '', burnerIds: [], notes: '', products: [] }); await load();
    } catch (requestError) { setFormError(await apiErrorMessage(requestError, 'Não foi possível registrar a queima. Confira os dados e tente novamente.')); }
    finally { setSaving(false); }
  };
  const exportReport = async (format: 'pdf' | 'xlsx') => {
    if (fromFilter && toFilter && fromFilter > toFilter) return setError('O início do período não pode ser posterior ao fim. Ajuste os filtros antes de exportar.');
    const params = new URLSearchParams();
    if (fromFilter) params.set('from', localDateStartUtc(fromFilter));
    if (toFilter) params.set('to', localDateEndUtc(toFilter));
    try {
      const result = await api.get(`/api/kiln-firings/report.${format}?${params}`, { responseType: 'blob' });
      const periodName = `${fromFilter || 'inicio'}_a_${toFilter || 'hoje'}`;
      saveBlob(result.data, `controle-fornos_${periodName}.${format}`);
    } catch (requestError) { setError(await apiErrorMessage(requestError, `Não foi possível gerar o relatório ${format.toUpperCase()}.`)); }
  };
  const exportFiringPdf = async (id: string) => {
    try { const result = await api.get(`/api/kiln-firings/${id}/report.pdf`, { responseType: 'blob' }); saveBlob(result.data, `queima-${id}.pdf`); }
    catch (requestError) { setError(await apiErrorMessage(requestError, 'Não foi possível gerar o PDF desta queima.')); }
  };
  const cancelFiring = async (id: string) => {
    if (!window.confirm('Deseja cancelar esta queima? O registro ficará preservado no histórico administrativo.')) return;
    const reason = window.prompt('Informe o motivo do cancelamento desta queima:');
    if (!reason?.trim()) return;
    try { await api.post(`/api/kiln-firings/${id}/cancel`, { reason: reason.trim() }); await load(); }
    catch (requestError) { setError(await apiErrorMessage(requestError, 'Não foi possível cancelar a queima.')); }
  };
  const openQuality = (firing: Firing) => { setQualityFiring(firing); setQualityError(''); setQualityRows(firing.quality.length ? firing.quality.map(q => ({ ...q, quantity: String(q.quantity) })) : firing.products.map(p => ({ productType: p.productType, categoryId: '', quantity: '' }))); setJustification(firing.differenceJustification || ''); setQualityObservations(''); };
  const showQualityHistory = async (firing: Firing) => { try { const response = await api.get(`/api/kiln-firings/${firing.id}/quality-history`); setQualityHistory(response.data); setQualityHistoryFiring(firing); } catch (requestError) { setError(await apiErrorMessage(requestError, 'Não foi possível carregar o histórico da conferência.')); } };
  const saveQuality = async () => {
    if (!qualityFiring) return;
    setQualityError('');
    if (!qualityRows.length || qualityRows.some(row => !row.categoryId || !parseIntegerQuantity(row.quantity, { allowZero: true }).valid)) return setQualityError('Escolha uma categoria e informe uma quantidade inteira não negativa em todas as linhas. Campo vazio não significa zero.');
    const classifiedItems = qualityRows.map(row => ({ ...row, quantity: Number(row.quantity) }));
    if (classifiedItems.some(row => !Number.isSafeInteger(row.quantity))) return setQualityError('Informe quantidades inteiras válidas.');
    try { await api.put(`/api/kiln-firings/${qualityFiring.id}/quality`, { items: classifiedItems, differenceJustification: justification.trim() || null, observations: qualityObservations.trim() || null }); setQualityFiring(null); await load(); }
    catch (requestError) { setQualityError(await apiErrorMessage(requestError, 'Não foi possível salvar a conferência. Confira os dados e tente novamente.')); }
  };
  const openCreateForm = () => { setEditingFiringId(null); setForm({ kilnName: '', startedAt: '', finishedAt: '', burnerIds: [], notes: '', products: [{ productType: '', quantity: '' }] }); setFormError(''); setShowForm(true); };
  const openEditForm = async (id: string) => {
    setFormError('');
    try {
      const response = await api.get(`/api/kiln-firings/${id}`);
      const firing = response.data;
      const burners: RecordedBurner[] = firing.burners;
      setEditingFiringId(id);
      setRecordedBurners(burners);
      setForm({ kilnName: firing.kilnName, startedAt: toLocalDateTimeInput(firing.startedAtUtc), finishedAt: toLocalDateTimeInput(firing.finishedAtUtc), notes: firing.notes || '', burnerIds: burners.map(burner => burner.employeeId), products: firing.products.map((product: { productType: number; quantity: number }) => ({ productType: product.productType, quantity: String(product.quantity) })) });
      setShowForm(true);
    } catch (requestError) { setError(await apiErrorMessage(requestError, 'Não foi possível abrir esta queima para edição.')); }
  };
  const addProduct = () => setForm(x => ({ ...x, products: [...x.products, { productType: '', quantity: '' }] }));
  const addQualityCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await api.post('/api/kiln-firings/quality-categories', { name: categoryName.trim() }); setCategoryName(''); await load(); }
    catch (requestError) { setError(await apiErrorMessage(requestError, 'Não foi possível adicionar a categoria de qualidade.')); }
  };
  const toggleBurner = (id: string) => setForm(x => ({ ...x, burnerIds: x.burnerIds.includes(id) ? x.burnerIds.filter(value => value !== id) : [...x.burnerIds, id] }));
  const quantityInput = (value: string, update: (value: string) => void, label: string, invalid: () => void) => <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" aria-label={label} value={value} onChange={e => { update(e.target.value); if (!isIntegerQuantityText(e.target.value)) invalid(); }} onBlur={() => { if (isIntegerQuantityText(value)) update(normalizeLeadingZeros(value)); }} aria-describedby="quantity-help" className="min-w-0 w-full rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-900"/>;
  const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min`;
  const applyMonth = (month: string) => { if (!/^\d{4}-\d{2}$/.test(month)) return; const [year, monthNumber] = month.split('-').map(Number); const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(); setFromFilter(`${month}-01`); setToFilter(`${month}-${String(lastDay).padStart(2, '0')}`); setPage(1); };
  const applyYear = (year: string) => { if (!/^\d{4}$/.test(year)) return; setFromFilter(`${year}-01-01`); setToFilter(`${year}-12-31`); setPage(1); };

  const historicalBurners = editingFiringId
    ? recordedBurners.filter(burner => !options.burners.some(option => option.id === burner.employeeId))
    : [];

  return <section className="w-full space-y-5 text-slate-800 dark:text-slate-100">
    <div className="w-full space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-4"><span className="rounded-xl bg-orange-100 p-3 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><Factory/></span><div><h1 className="text-2xl font-bold">Controle de Fornos</h1><p className="text-sm text-slate-500 dark:text-slate-300">Histórico de queimas e conferência após abertura.</p></div></div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">{isAdmin && <form onSubmit={addQualityCategory} className="flex w-full min-w-0 gap-1 sm:w-auto"><label className="sr-only" htmlFor="new-quality-category">Nova categoria de qualidade</label><input id="new-quality-category" maxLength={80} required value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Nova categoria de qualidade" className="min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-2 text-sm sm:w-64 dark:border-slate-600"/><button disabled={options.migrationPending} aria-label="Adicionar categoria de qualidade" className="rounded-lg border p-2 disabled:opacity-50 dark:border-slate-600"><Plus size={17}/></button></form>}<Button type="button" variant="outline" icon={Download} disabled={options.migrationPending} onClick={() => void exportReport('pdf')}>Baixar PDF</Button><Button type="button" variant="outline" icon={FileSpreadsheet} disabled={options.migrationPending} onClick={() => void exportReport('xlsx')}>Planilha Excel</Button><button onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-xl bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800"><Plus size={17}/> Registrar queima</button></div>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}
      {options.migrationPending && <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">Produtos e queimadores estão disponíveis. Histórico, conferência, relatórios e gravações serão ativados após aplicar as migrations pendentes do Controle de Fornos.</div>}
      <section aria-label="Indicadores do período" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[["Queimas", indicators.firings], ["Peças carregadas", (indicators.totalLoadedPieces ?? indicators.totalPieces).toLocaleString('pt-BR')], ["Peças classificadas", (indicators.totalClassifiedPieces ?? 0).toLocaleString('pt-BR')], ["Acima de 27h", indicators.above27Hours], ["Percentual acima", indicators.above27Percent == null ? 'Indisponível' : `${indicators.above27Percent}%`], ["Duração média", `${Math.floor(indicators.averageDurationMinutes / 60)}h ${String(indicators.averageDurationMinutes % 60).padStart(2, '0')}min`], ["Conferências pendentes", indicators.pendingQuality]].map(([label, value]) => <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p><strong className="mt-1 block text-xl">{value}</strong></article>)}</section><div className="grid gap-4 xl:grid-cols-2"><section aria-label="Totais por produto" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h2 className="mb-3 font-semibold">Carregamento e classificação por produto</h2>{indicators.totalsByProduct.length === 0 ? <p className="text-sm text-slate-500">Nenhuma peça registrada neste período.</p> : <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{indicators.totalsByProduct.map(product => <article key={`${product.productType}-${product.productName}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">{product.productName}</p><p className="mt-1 text-sm">Carregadas: <b>{(product.loadedPieces ?? product.pieces).toLocaleString('pt-BR')}</b></p><p className="text-sm">Classificadas: <b>{(product.classifiedPieces ?? 0).toLocaleString('pt-BR')}</b></p></article>)}</div>}</section><section aria-label="Totais por categoria de qualidade" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"><h2 className="mb-3 font-semibold">Qualidade após abertura</h2>{(indicators.qualityByCategory ?? []).length === 0 ? <p className="text-sm text-slate-500">Nenhuma classificação neste período.</p> : <ul className="space-y-2">{indicators.qualityByCategory?.map(category => <li key={category.categoryId} className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"><span>{category.categoryName}</span><span><b>{category.quantity.toLocaleString('pt-BR')}</b> peças · {category.percent == null ? 'percentual indisponível' : `${category.percent}%`}</span></li>)}</ul>}<p className="mt-3 text-sm">Rendimento: <b>{indicators.classificationYieldPercent == null ? 'Indisponível enquanto houver pendências' : `${indicators.classificationYieldPercent}%`}</b></p><p className="mt-1 text-xs text-slate-500">Sem classificação: {(indicators.unclassifiedPieces ?? 0).toLocaleString('pt-BR')} peças. Perdas/quebras ainda não são calculadas: as categorias dependem de validação da empresa.</p></section></div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700"><label className="text-xs font-semibold">Período<select value={periodMode} onChange={e => { const mode = e.target.value as 'custom' | 'month' | 'year'; setPeriodMode(mode); if (mode === 'month') applyMonth(periodMonth); if (mode === 'year') applyYear(periodYear); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"><option value="custom">Personalizado</option><option value="month">Mês</option><option value="year">Ano</option></select></label>{periodMode === 'month' && <label className="text-xs font-semibold">Mês<input type="month" value={periodMonth} onChange={e => { setPeriodMonth(e.target.value); applyMonth(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"/></label>}{periodMode === 'year' && <label className="text-xs font-semibold">Ano<input type="number" min="2000" max="2100" value={periodYear} onChange={e => { setPeriodYear(e.target.value); applyYear(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"/></label>}{periodMode === 'custom' && <><label className="text-xs font-semibold">Início<input type="date" value={fromFilter} onChange={e => { setPage(1); setFromFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"/></label><label className="text-xs font-semibold">Fim<input type="date" value={toFilter} onChange={e => { setPage(1); setToFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"/></label></> }<label className="text-xs font-semibold">Forno físico<input value={kilnFilter} onChange={e => { setPage(1); setKilnFilter(e.target.value); }} placeholder="Buscar forno" className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"/></label><label className="text-xs font-semibold">Queimador<select value={burnerFilter} onChange={e => { setPage(1); setBurnerFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"><option value="">Todos</option>{options.burners.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-xs font-semibold">Produto<select value={productFilter} onChange={e => { setPage(1); setProductFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"><option value="">Todos</option>{options.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-xs font-semibold">Duração<select value={durationFilter} onChange={e => { setPage(1); setDurationFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"><option value="">Todas</option><option>Dentro do tempo</option><option>Acima do tempo</option></select></label><label className="text-xs font-semibold">Conferência<select value={conferenceFilter} onChange={e => { setPage(1); setConferenceFilter(e.target.value); }} className="mt-1 block w-full rounded-lg border bg-transparent px-3 py-2 text-sm dark:border-slate-600"><option value="">Todas</option><option>Pendente</option><option>Conferido</option></select></label><button onClick={() => void load()} className="self-end rounded-lg border p-2 dark:border-slate-600" aria-label="Atualizar histórico"><RefreshCw size={18}/></button></div>
        {loading ? <div className="p-12 text-center text-slate-500">Carregando histórico…</div> : options.migrationPending ? <div className="p-12 text-center"><Flame className="mx-auto mb-2 text-orange-600"/><h2 className="font-semibold">Histórico ainda não ativado</h2><p className="mt-1 text-sm text-slate-500">Os produtos e queimadores já podem ser consultados. O histórico será liberado após aplicar as migrations pendentes do Controle de Fornos.</p></div> : items.length === 0 ? <div className="p-12 text-center"><Flame className="mx-auto mb-2 text-orange-600"/><h2 className="font-semibold">Nenhuma queima encontrada</h2><p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou registre a primeira queima.</p></div> : <div className="divide-y divide-slate-200 dark:divide-slate-700">{items.map(f => <article key={f.id} className="grid gap-3 p-4 wrap-anywhere lg:grid-cols-3 lg:items-start"><div><h2 className="font-semibold">{f.kilnName}</h2><p className="text-sm text-slate-500">{formatDateTime(f.startedAtUtc)} – {formatDateTime(f.finishedAtUtc)}</p><p className="text-xs text-slate-500">Registrada por {f.registeredByName}</p></div><div><strong className="text-sm">{duration(f.durationMinutes)}</strong><span className={`ml-2 rounded-full px-2 py-1 text-xs ${f.durationClass === 'Acima do tempo' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>{f.durationClass}</span><p className="mt-1 text-xs text-slate-500">{f.products.map(p => `${p.productNameSnapshot}: ${p.quantity}`).join(' · ')}</p></div><div className="text-sm"><p>Queimadores: {f.burners.join(', ') || '—'}</p><p className={f.conference === 'Pendente' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{f.conference === 'Pendente' ? 'Conferência pós-abertura pendente' : 'Conferência pós-abertura concluída'} · {f.qualityTotal} de {f.loadedTotal} peças classificadas por qualidade{f.loadedTotal > f.qualityTotal ? ` · ${f.loadedTotal - f.qualityTotal} sem classificação` : ''}</p>{f.qualityConferencedAtUtc && <p className="mt-1 text-xs text-slate-500">Conferida por {f.qualityConferencedByName || 'usuário legado não identificado'} em {formatDateTime(f.qualityConferencedAtUtc)}</p>}</div><div className="flex flex-wrap gap-2 lg:col-span-full">{f.qualityTotal === 0 && f.conference === 'Pendente' && <button onClick={() => void openEditForm(f.id)} aria-label={`Editar queima do ${f.kilnName}`} className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold dark:border-slate-600"><Pencil size={15}/> Editar</button>}<button onClick={() => void exportFiringPdf(f.id)} className="rounded-lg border px-3 py-2 text-center text-sm font-semibold dark:border-slate-600">PDF</button><button onClick={() => openQuality(f)} className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:border-orange-500 dark:border-slate-600"><ClipboardCheck size={16}/> Conferir</button>{f.quality.length > 0 && <button onClick={() => void showQualityHistory(f)} className="rounded-lg border px-3 py-2 text-sm font-semibold dark:border-slate-600">Histórico</button>}<button onClick={() => void cancelFiring(f.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Cancelar</button></div></article>)}</div>}
        <footer className="flex items-center justify-between border-t border-slate-200 p-3 text-sm dark:border-slate-700"><span>Página {page} de {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(x => x - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">Anterior</button><button disabled={page >= pages} onClick={() => setPage(x => x + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40 dark:border-slate-600">Próxima</button></div></footer>
      </section>
    </div>
    {qualityHistoryFiring && createPortal(<div className={`${styles.modalOverlay} ${styles.historyOverlay} inset-0 grid place-items-center overflow-y-auto bg-slate-950/60 p-3`} onMouseDown={e => { if (e.target === e.currentTarget) setQualityHistoryFiring(null); }}><section role="dialog" aria-modal="true" aria-labelledby="quality-history-title" className="my-auto max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800"><div className="mb-4 flex items-center justify-between"><div><h2 id="quality-history-title" className="text-xl font-bold">Histórico da conferência</h2><p className="text-sm text-slate-500">{qualityHistoryFiring.kilnName} · {qualityHistory.length} revisão(ões)</p></div><button onClick={() => setQualityHistoryFiring(null)} aria-label="Fechar histórico" className="rounded p-2">×</button></div>{qualityHistory.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">Ainda não há conferências registradas.</p> : <ol className="space-y-3">{qualityHistory.map(revision => <li key={revision.id} className="rounded-xl border p-4 dark:border-slate-600"><div className="flex flex-wrap justify-between gap-2"><b>Revisão {revision.revisionNumber} · {revision.state}</b>{revision.conferencedAtUtc ? <time dateTime={revision.conferencedAtUtc} className="text-sm text-slate-500">{formatDateTime(revision.conferencedAtUtc)}</time> : <span className="text-sm text-slate-500">Horário legado indisponível</span>}</div><p className="mt-1 text-sm">Conferida por {revision.conferencedByName || 'usuário legado não identificado'} · Carregadas {revision.loadedTotal.toLocaleString('pt-BR')} · Classificadas {revision.classifiedTotal.toLocaleString('pt-BR')} · Sem classificação {revision.unclassifiedTotal.toLocaleString('pt-BR')}</p><ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{revision.items.map((item, index) => <li key={`${item.productNameSnapshot}-${item.categoryNameSnapshot}-${index}`}>{item.productNameSnapshot} · {item.categoryNameSnapshot}: {item.quantity.toLocaleString('pt-BR')}</li>)}</ul>{revision.observations && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Observações: {revision.observations}</p>}{revision.differenceJustification && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Contexto da diferença: {revision.differenceJustification}</p>}</li>)}</ol>}</section></div>, document.body)}
    {(showForm || qualityFiring) && createPortal(<div className={`${styles.modalOverlay} inset-0 grid place-items-center overflow-y-auto bg-slate-950/60 p-3`} onMouseDown={e => { if (e.target === e.currentTarget) { setShowForm(false); setQualityFiring(null); } }}><section role="dialog" aria-modal="true" aria-labelledby="kiln-dialog-title" className="my-auto max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800"><div className="mb-5 flex items-center justify-between"><h2 id="kiln-dialog-title" className="text-xl font-bold">{showForm ? (editingFiringId ? 'Editar queima' : 'Registrar queima') : `Conferência pós-abertura · ${qualityFiring?.kilnName}`}</h2><button onClick={() => { setShowForm(false); setQualityFiring(null); }} className="rounded p-2" aria-label="Fechar">×</button></div>
      {showForm && formError && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{formError}</div>}
      {showForm ? <form onSubmit={create} className="space-y-4"><label className="block text-sm font-medium">Forno físico<input required maxLength={100} value={form.kilnName} onChange={e => setForm({ ...form, kilnName: e.target.value })} placeholder="Ex.: Forno 01" className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Início<input required type="datetime-local" value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label><label className="text-sm font-medium">Finalização<input required type="datetime-local" min={form.startedAt || undefined} value={form.finishedAt} onChange={e => setForm({ ...form, finishedAt: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label></div><fieldset><legend className="mb-1 text-sm font-semibold">Tipos de produto e quantidades carregadas</legend><p className="mb-2 text-xs text-slate-500">Escolha o modelo do produto cadastrado em Vendas e informe a quantidade. A linha de qualidade será definida somente depois de abrir o forno.</p>{form.products.map((row, index) => <div key={index} className="mb-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]"><select required value={row.productType} onChange={e => setForm(x => ({ ...x, products: x.products.map((p, i) => i === index ? { ...p, productType: e.target.value === '' ? '' : Number(e.target.value) } : p) }))} className="min-w-0 rounded-lg border p-2 dark:border-slate-600 dark:bg-slate-900"><option value="">Selecionar tipo de produto</option>{options.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{quantityInput(row.quantity, value => setForm(x => ({ ...x, products: x.products.map((p, i) => i === index ? { ...p, quantity: value } : p) })), `Quantidade de ${options.products.find(product => product.id === String(row.productType))?.name || 'peças'}`, () => setFormError('Use somente números inteiros não negativos.'))}</div>)}<button type="button" onClick={addProduct} className="mt-1 text-sm font-semibold text-orange-700">+ Adicionar produto</button></fieldset><fieldset><legend className="mb-2 text-sm font-semibold">Queimadores participantes</legend><p className="mb-2 text-xs text-slate-500">Selecione todos os funcionários que trabalharam nesta queima.</p><div className="grid gap-2 sm:grid-cols-2">{options.burners.map(b => <label key={b.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm dark:border-slate-600 dark:bg-slate-900"><input type="checkbox" checked={form.burnerIds.includes(b.id)} onChange={() => toggleBurner(b.id)}/>{b.name}</label>)}</div>{historicalBurners.length > 0 && <div className="mt-3 text-sm text-slate-600 dark:text-slate-300"><p>Participantes preservados deste registro</p><ul className="list-disc pl-5">{historicalBurners.map(burner => <li key={burner.employeeId}>{burner.employeeNameSnapshot}</li>)}</ul></div>}{options.burners.length === 0 && <div className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100"><p>Nenhum funcionário está disponível para novas queimas.</p>{onManageEmployees && <button type="button" onClick={onManageEmployees} className="mt-2 font-semibold underline">Abrir cadastro de funcionários</button>}</div>}</fieldset><label className="block text-sm font-medium">Observações<textarea maxLength={1000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label>{options.migrationPending && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">A seleção está disponível para consulta; gravações serão habilitadas após ativar a estrutura atual do Controle de Fornos.</p>}<button disabled={options.migrationPending || saving} className="w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Salvando queima…' : editingFiringId ? 'Salvar alterações' : 'Salvar queima'}</button></form> : <div className="space-y-4"><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"><p className="font-semibold">O que significa “peças classificadas”?</p><p className="mt-1">A qualidade só é definida depois de abrir o forno. Separe cada tipo de produto em primeira linha, segunda linha, caldeado, trincados ou reenfornados. A soma por produto deve corresponder ao total carregado para concluir a conciliação. Diferenças ficam pendentes até serem classificadas por regra aprovada.</p></div><p className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">No forno: <b>{qualityFiring?.loadedTotal} peças carregadas</b> · Separadas por qualidade: <b>{qualityFiring?.qualityTotal}</b>.</p>{qualityError && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{qualityError}</div>}{qualityRows.map((row, index) => <div key={`${row.productType}-${index}`} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_8rem] dark:border-slate-600"><select aria-label="Produto classificado" value={row.productType === '' ? '' : String(row.productType)} onChange={e => setQualityRows(x => x.map((r, i) => i === index ? { ...r, productType: e.target.value === '' ? '' : Number(e.target.value) } : r))} className="rounded-lg border p-2 text-sm dark:border-slate-600 dark:bg-slate-900"><option value="">Produto</option>{qualityFiring?.products.map(p => <option key={p.productType} value={p.productType}>{p.productNameSnapshot}</option>)}</select><select aria-label="Categoria de qualidade" value={row.categoryId} onChange={e => setQualityRows(x => x.map((r, i) => i === index ? { ...r, categoryId: e.target.value } : r))} className="rounded-lg border p-2 text-sm dark:border-slate-600 dark:bg-slate-900"><option value="">Categoria de qualidade</option>{options.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{quantityInput(row.quantity, value => setQualityRows(x => x.map((r, i) => i === index ? { ...r, quantity: value } : r)), `Quantidade de ${options.categories.find(category => category.id === row.categoryId)?.name || 'qualidade'}`, () => setQualityError('Use somente números inteiros não negativos; decimais e sinais não são aceitos.'))}</div>)}<p id="quantity-help" className="text-xs text-slate-500">Informe apenas números inteiros. Campo vazio é diferente de zero. Use “Adicionar classificação” para separar o mesmo produto em mais de uma categoria.</p><button type="button" onClick={() => qualityFiring && setQualityRows(x => [...x, { productType: qualityFiring.products[0]?.productType ?? '', categoryId: '', quantity: '' }])} className="text-sm font-semibold text-orange-700">+ Adicionar classificação</button><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">A diferença continuará pendente. Justificativa não registra perda aprovada nem fecha a conciliação; as categorias de perda ainda precisam de validação da empresa.</p><label className="block text-sm font-medium">Justificativa / contexto da diferença (opcional)<textarea maxLength={1000} value={justification} onChange={e => setJustification(e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label><label className="block text-sm font-medium">Observações da conferência<textarea maxLength={1000} value={qualityObservations} onChange={e => setQualityObservations(e.target.value)} className="mt-1 w-full min-w-0 rounded-lg border p-2.5 dark:border-slate-600 dark:bg-slate-900"/></label><button onClick={() => void saveQuality()} className="w-full rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white">Salvar conferência</button></div>}
      </section></div>, document.body)}
  </section>;
}
