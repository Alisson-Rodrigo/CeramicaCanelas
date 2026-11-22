/* eslint-disable @typescript-eslint/no-require-imports -- Same TypeScript harness used by the frontend tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = new Module(file, module); mod.paths = module.paths; mod.require = name => dependencies[name] ?? require(name); mod._compile(source, file); return mod.exports;
}
const component = load('components/notifications/NotificationBell.tsx', {
  'next/navigation': { useRouter: () => ({ push() {} }) },
  'js-cookie': { default: { get: () => undefined } },
  'jwt-decode': { jwtDecode: () => ({}) },
  'lucide-react': Object.fromEntries(['AlertTriangle', 'Bell', 'Check', 'CircleCheck', 'ExternalLink', 'FileText', 'LoaderCircle', 'Package', 'ShoppingCart', 'Volume2', 'VolumeX', 'Wallet', 'X'].map(name => [name, () => null])),
  '@/lib/api': { api: {} },
  '@/components/notifications/UpdatesCenter': { UpdatesCenter: () => null },
  '@/lib/update-format': load('lib/update-format.ts', {}),
  '@/lib/notification-state': load('lib/notification-state.ts', {}),
  './notifications.module.css': new Proxy({}, { get: (_, name) => String(name) }),
});
const state = load('lib/notification-state.ts', {});

test('read own actions stay in the list but are not announced as new', () => {
  const own = { id: 'own', readAtUtc: '2026-11-22T16:17:00.000Z' };
  const other = { id: 'other', readAtUtc: null };
  assert.equal(state.shouldAnnounceUpdate(own), false);
  assert.equal(state.shouldAnnounceUpdate(other), true);
});

test('polling deduplicates update ids already shown in the session', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(component.findFreshNotificationIds(items, ['a', 'c']), ['b']);
  assert.deepEqual(component.findFreshNotificationIds(items, ['a', 'b', 'c']), []);
  assert.deepEqual(state.getAnnounceableUpdates(items.map(item => ({ ...item, message: '', module: '', priority: 'Normal', occurredAtUtc: '', createdOn: '' })), [], false), []);
  assert.deepEqual(state.getAnnounceableUpdates(items.map(item => ({ ...item, message: '', module: '', priority: 'Normal', occurredAtUtc: '', createdOn: '' })), ['a', 'c'], true).map(item => item.id), ['b']);
});

test('sound is silent until interaction and respects the mute preference', () => {
  assert.equal(component.shouldPlayNotificationSound(false, false), false);
  assert.equal(component.shouldPlayNotificationSound(true, true), false);
  assert.equal(component.shouldPlayNotificationSound(false, true), true);
});

test('dates are presented in Brazilian format while the source timestamp remains ISO UTC', () => {
  const { formatUpdateDate, formatUpdateDay } = load('lib/update-format.ts', {});
  assert.equal(formatUpdateDate('2026-11-22T16:17:00.000Z', 'UTC'), '22/11/2026 às 16:17');
  assert.equal(formatUpdateDay('2026-11-22T16:17:00.000Z', new Date('2026-11-22T20:00:00.000Z'), 'UTC'), 'Hoje');
});

test('popup contains only friendly fields and can be dismissed', () => {
  const source = fs.readFileSync('components/notifications/NotificationBell.tsx', 'utf8');
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /aria-label="Dispensar aviso"/);
  assert.match(source, /\{toast\.message\}/);
  assert.match(source, /formatUpdateDate\(toast\.occurredAtUtc\)/);
  assert.doesNotMatch(source, /toast\.(action|resourceType|resourceId|controller|route)/);
});

test('read state updates optimistically and supports rollback from the saved snapshot', () => {
  const page = { items: [{ id: 'x', message: 'Ação amigável', module: 'Vendas', priority: 'Normal', createdOn: '', occurredAtUtc: '', readAtUtc: null }], total: 1, unread: 1, page: 1, pageSize: 25 };
  const updated = state.markUpdateAsRead(page, 'x', '2026-11-22T16:17:00.000Z');
  assert.equal(updated.items[0].readAtUtc, '2026-11-22T16:17:00.000Z');
  assert.equal(updated.unread, 0);
  assert.equal(page.items[0].readAtUtc, null);
  assert.equal(state.markUpdateAsRead(page, 'x', 'now', true).items.length, 0);
  const center = fs.readFileSync('components/notifications/UpdatesCenter.tsx', 'utf8');
  assert.match(center, /setResult\(previous\)/);
  assert.match(center, /Não foi possível marcar a atualização como lida/);
});

test('polling, filters, loading/error states, accessibility and responsive motion rules stay available', () => {
  const source = fs.readFileSync('components/notifications/NotificationBell.tsx', 'utf8');
  const center = fs.readFileSync('components/notifications/UpdatesCenter.tsx', 'utf8');
  const styles = fs.readFileSync('components/notifications/notifications.module.css', 'utf8');
  assert.match(source, /45_000/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /Silenciar notificações/);
  assert.match(source, /visibilitychange/);
  assert.match(center, /aria-busy=\{busy\}/);
  assert.match(center, /Tentar novamente/);
  assert.match(center, /Buscar atualizações/);
  assert.match(center, /status/);
  assert.match(center, /period/);
  assert.match(center, /availableModules/);
  assert.match(center, /formatUpdateDay/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@keyframes toast-out/);
  assert.match(styles, /\.bellAnchor\s*\{[^}]*position:\s*relative/s);
  assert.match(styles, /\.popover\s*\{\s*position:\s*absolute/);
  assert.match(styles, /\.centerPage\s*\{[^}]*display:\s*block[^}]*width:\s*100%/s);
});

test('the bell opens a large accessible updates modal without leaving the current module', () => {
  const bell = fs.readFileSync('components/notifications/NotificationBell.tsx', 'utf8');
  const center = fs.readFileSync('components/notifications/UpdatesCenter.tsx', 'utf8');
  const styles = fs.readFileSync('components/notifications/notifications.module.css', 'utf8');
  assert.match(bell, /setCenterOpen\(true\)/);
  assert.match(bell, /<UpdatesCenter presentation="modal" onClose=/);
  assert.doesNotMatch(bell, /router\.push\(updatesHref\)/);
  assert.match(center, /role="dialog" aria-modal="true"/);
  assert.match(center, /Fechar atualizações/);
  assert.match(center, /event\.key === 'Escape'/);
  assert.match(center, /querySelectorAll<HTMLElement>/);
  assert.match(center, /presentation === 'page'/);
  assert.match(styles, /\.modalOverlay\s*\{[^}]*position:\s*fixed/s);
  assert.match(styles, /@keyframes modal-enter/);
  assert.match(styles, /\.updatesModal\s*\{[^}]*transform-style:\s*preserve-3d/s);
  assert.match(styles, /\.updatesModal\s*\{[^}]*height:\s*100dvh/s);
});
