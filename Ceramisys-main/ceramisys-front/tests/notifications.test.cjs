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
  'lucide-react': Object.fromEntries(['Bell', 'Check', 'Volume2', 'VolumeX', 'X'].map(name => [name, () => null])),
  '@/lib/api': { api: {} },
  '@/lib/update-format': load('lib/update-format.ts', {}),
});

test('read own actions stay in the list but are not announced as new', () => {
  const own = { id: 'own', readAtUtc: '2026-11-22T16:17:00.000Z' };
  const other = { id: 'other', readAtUtc: null };
  assert.equal(component.shouldAnnounceUpdate(own), false);
  assert.equal(component.shouldAnnounceUpdate(other), true);
});

test('polling deduplicates update ids already shown in the session', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(component.findFreshNotificationIds(items, ['a', 'c']), ['b']);
  assert.deepEqual(component.findFreshNotificationIds(items, ['a', 'b', 'c']), []);
});

test('sound is silent until interaction and respects the mute preference', () => {
  assert.equal(component.shouldPlayNotificationSound(false, false), false);
  assert.equal(component.shouldPlayNotificationSound(true, true), false);
  assert.equal(component.shouldPlayNotificationSound(false, true), true);
});

test('dates are presented in Brazilian format while the source timestamp remains ISO UTC', () => {
  const { formatUpdateDate } = load('lib/update-format.ts', {});
  assert.equal(formatUpdateDate('2026-11-22T16:17:00.000Z', 'UTC'), '22/11/2026 às 16:17');
});

test('polling stays moderate and user-facing controls expose accessible labels', () => {
  const source = fs.readFileSync('components/notifications/NotificationBell.tsx', 'utf8');
  assert.match(source, /setInterval\(\(\) => void refresh\(true\), 45_000\)/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /Silenciar notificações/);
  assert.match(source, /\{item.message\}/);
  assert.match(source, /formatUpdateDate\(item.occurredAtUtc\)/);
  assert.doesNotMatch(source, /item\.(action|resourceType|resourceId)|toast\.action/);
});
