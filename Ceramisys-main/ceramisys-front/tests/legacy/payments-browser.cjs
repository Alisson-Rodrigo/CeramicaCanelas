/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Chrome DevTools smoke test, no browser dependency. */
const { spawn } = require('node:child_process');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const assert = require('node:assert/strict');
const WebSocket = require('next/dist/compiled/ws');
const origin = process.env.PAYMENTS_TEST_ORIGIN || 'http://127.0.0.1:3417';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('Use an isolated localhost frontend.');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'payments-chrome-'));
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const worker = { id: '11111111-1111-1111-1111-111111111111', name: 'Prestador de teste', employmentType: 2, isActive: true, monthlyValue: 3000, monthlyBonus: 400, admissionDate: '2026-11-01', contractualDsrAuthorized: true };
const employee = { ...worker, id: '22222222-2222-2222-2222-222222222222', name: 'Funcionária de teste', employmentType: 1, contractualDsrAuthorized: false };
const calls = []; const history = []; const absences = []; const runtimeErrors = []; let socket; let counter = 0; const pending = new Map();
const people = [worker, employee];
const vouchers = [{ id: 'voucher1', paymentPersonId: worker.id, personName: worker.name, description: 'Vale de teste', totalValue: 200, installmentValue: 100, remainingBalance: 200, appliedInstallments: 0, periodicity: 1, status: 1 }];
const dsr = []; let preparation = null; let conflictPreparation = true;
function command(method, params = {}) { const id = ++counter; return new Promise((resolve, reject) => { const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000); pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); }); }
const evaluate = async expression => {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result?.value;
};
async function until(expression) { for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(document.body && (${expression}))`)) return; await delay(100); } throw new Error('Timed out: ' + expression); }
const click = text => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(text)}); if (!b || b.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); b.click(); })()`);
const field = (label, value) => evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(x => x.textContent.startsWith(${JSON.stringify(label)})); const element = label?.querySelector('input,select,textarea'); if (!element) throw new Error('Field unavailable: ' + ${JSON.stringify(label)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, ${JSON.stringify(String(value))}); element.dispatchEvent(new Event('input', {bubbles:true})); element.dispatchEvent(new Event('change', {bubbles:true})); })()`);
async function confirmDeletion(label, reason, closed = false) {
  await click(label); await until(`document.querySelector('dialog[open]')`); await field('Motivo da ação', reason);
  await evaluate(`(() => { const dialog = document.querySelector('dialog'); ${closed ? "[...dialog.querySelectorAll('label')].find(x => x.textContent.includes('Autorizo expressamente')).querySelector('input').click();" : ''} [...dialog.querySelectorAll('label')].find(x => x.textContent.includes('Confirmo a ação')).querySelector('input').click(); })()`);
  await click('Confirmar ação');
}
async function intercept(event) {
  const url = new URL(event.request.url);
  if (url.origin === origin && !url.pathname.startsWith('/api/')) return command('Fetch.continueRequest', { requestId: event.requestId });
  if (!url.pathname.startsWith('/api/payments')) {
    calls.push({ path: url.pathname, method: event.request.method });
    return command('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' });
  }
  const route = url.pathname.slice('/api/payments'.length); const method = event.request.method;
  calls.push({ path: route, method, body: event.request.postData });
  let data = []; let status = 200;
  const person = url.searchParams.get('personId') === employee.id ? employee : worker;
  if (method === 'OPTIONS') status = 204;
  else if (method === 'DELETE') {
    const body = JSON.parse(event.request.postData);
    assert.ok(body.reason?.trim()); assert.equal('actor' in body, false); assert.equal('userId' in body, false);
    status = 204;
    if (route === '/calculations/calc1') {
      history[0].status = 4; dsr[0].isCancelled = true;
      // These values are backend fixtures, never financial calculations in UI code.
      vouchers[0].remainingBalance = 200; vouchers[0].appliedInstallments = 0;
      preparation.status = 1; preparation.revision = 4;
    } else if (route === '/preparations/prep1') {
      if (conflictPreparation) { conflictPreparation = false; preparation.revision = 5; status = 400; data = { message: 'Revisão divergente. Confira a preparação atual.' }; }
      else { assert.equal(body.revision, 5); preparation = null; }
    } else if (route.includes('/absences/')) {
      assert.equal(body.revision, absences[0].revision); assert.equal(body.correctClosedPeriod, true);
      absences[0].isCancelled = true; absences[0].revision = 2; absences[0].observation = body.reason;
    } else if (route === '/vouchers/voucher1') vouchers[0].status = 4;
    else if (route === '/people/' + worker.id) people.splice(people.indexOf(worker), 1);
    else throw new Error('Unexpected DELETE: ' + route);
  }
  else if (route === '/people') data = people;
  else if (route === '/vouchers') data = vouchers;
  else if (route === '/rules') data = [];
  else if (route === '/preparations') {
    if (method === 'GET') { if (preparation && preparation.paymentPersonId === url.searchParams.get('personId') && String(preparation.fortnight) === url.searchParams.get('fortnight')) data = preparation; else status = 204; }
    else { const request = JSON.parse(event.request.postData); preparation = { id: 'prep1', paymentPersonId: request.calculation.paymentPersonId, fortnight: request.calculation.fortnight, revision: 1, status: request.inReview ? 5 : 1, requestJson: JSON.stringify(request.calculation) }; data = preparation; }
  }
  else if (route === '/calculations/preview') data = { paymentPersonId: person.id, personName: person.name, competenceYear: 2026, competenceMonth: 11, fortnight: 1, baseValue: 3000, installmentBase: 1500, originalBonus: 0, finalBonus: 0, bonusDeduction: 0, absenceDeduction: 240, dsrDeduction: 30, grossValue: 1500, additionValue: 0, deductionValue: 270, netValue: 1230, items: [{ kind: 13, description: 'DSR da semana', amount: 30, dsrWeekStart: '2026-11-02' }] };
  else if (route === '/calculations') {
    if (method === 'POST') {
      const saved = { id: 'calc' + (history.length + 1), paymentPersonId: worker.id, personName: worker.name, competenceYear: 2026, competenceMonth: 11, fortnight: 1, netValue: 1230, baseValue: 3000, status: 2, paidAt: null, items: [{ kind: 13, description: 'DSR original', amount: 30 }] };
      history.push(saved); data = saved; status = 201;
      dsr.push({ id: 'dsr' + history.length, weekStart: '2026-11-02', paymentCalculationId: saved.id, amount: 30, isCancelled: false, absenceIds: 'absence1' });
      vouchers[0].remainingBalance = 100; vouchers[0].appliedInstallments = 1;
      if (preparation) { preparation.status = 2; preparation.revision = 2; }
    }
    else data = history.filter(h => (!url.searchParams.has('personId') || h.paymentPersonId === url.searchParams.get('personId')) && (!url.searchParams.has('fortnight') || String(h.fortnight) === url.searchParams.get('fortnight')));
  }
  else if (route.endsWith('/paid')) { history[0].status = 3; history[0].paidAt = '2026-11-14T15:00:00Z'; status = 204; }
  else if (route.endsWith('/absences')) {
    if (method === 'POST') { const body = JSON.parse(event.request.postData); const a = { ...body, id: 'absence1', paymentPersonId: worker.id, recordedBy: 'test-user', revision: 1, fortnight: 1 }; absences.push(a); data = a; } else data = absences;
  }
  else if (route.endsWith('/monthly-summary')) data = { periods: history, adjustments: [], originalNetTotal: history.some(row => row.status !== 4) ? 1230 : 0, adjustmentTotal: 0, isClosed: false };
  else if (route.endsWith('/dsr')) data = dsr;
  else if (route.endsWith('/accountant-summary')) data = { fullAbsences: 0, halfAbsences: 0, totalDays: 0, periods: [], occurrences: [] };
  const headers = [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }];
  await command('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: headers, body: status === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') });
}
async function main() {
  let port;
  for (let i = 0; i < 100 && !port; i++) { try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { /* Chrome may still be writing the port file. */ } if (!port) await delay(100); }
  if (!port) throw new Error('Chrome did not expose a debugging port.');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(new Error(message.error.message)); else p?.resolve(message.result); }
    else if (message.method === 'Fetch.requestPaused') void intercept(message.params).catch(e => runtimeErrors.push(e.message));
    else if (message.method === 'Page.javascriptDialogOpening') void command('Page.handleJavaScriptDialog', { accept: true });
    else if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  };
  await command('Page.enable'); await command('Runtime.enable'); await command('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  const token = ['e30', Buffer.from(JSON.stringify({ role: 'Financial', unique_name: 'Teste isolado', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'test-only'].join('.');
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `document.cookie='auth_token=${token}; path=/'; localStorage.setItem('activeModule','payments'); localStorage.setItem('paymentsActiveScreen','calculation');` });
  await command('Page.navigate', { url: origin + '/dashboard' });
  await until(`document.body.textContent.includes('Dados do cálculo') && document.querySelector('select option[value="${worker.id}"]')`);
  await field('Pessoa', worker.id); await until(`!document.body.textContent.includes('Carregando período')`); await click('Gerar prévia'); await until(`document.body.textContent.includes('1.230,00')`);
  assert.ok(await evaluate(`document.body.textContent.includes('Semana iniciada em 2026-11-02')`));
  await click('Salvar em aberto'); await until(`document.body.textContent.includes('Salvo em aberto')`);
  await click('Fechar quinzena'); await until(`document.body.textContent.includes('Quinzena fechada')`);
  assert.equal(calls.filter(c => c.path === '/calculations' && c.method === 'POST').length, 1);
  await field('Pessoa', employee.id); await until(`document.body.textContent.includes('Parcela informada pelo contador') && !document.body.textContent.includes('Carregando período')`);
  assert.equal(await evaluate(`document.querySelector('input[required][step="0.01"]').value`), '');
  assert.equal(await evaluate(`document.body.textContent.includes('Minutos positivos')`), false);
  await field('Parcela informada pelo contador', '0'); await click('Gerar prévia'); await until(`document.body.textContent.includes('1.230,00')`);
  await field('Quinzena', '2'); await until(`!document.body.textContent.includes('Carregando período') && document.querySelector('input[step="0.01"]').value === ''`);
  await field('Parcela informada pelo contador', '1800'); await click('Gerar prévia'); await until(`document.body.textContent.includes('1.230,00')`);
  const lastPreview = calls.filter(c => c.path === '/calculations/preview').at(-1).body;
  assert.ok(lastPreview.includes('AccountantAmount')); assert.ok(lastPreview.includes('1800'));
  await click('Pessoas'); await until(`document.body.textContent.includes('Cadastrar pessoa financeira')`);
  assert.equal(calls.filter(c => c.path.includes('/employees')).length, 0);
  await click('Prestadores'); await until(`document.body.textContent.includes('Prestador de teste')`);
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  fs.mkdirSync('tests/artifacts', { recursive: true });
  const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync('tests/artifacts/payments-mobile.png', Buffer.from(screenshot.data, 'base64'));
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'));
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await click('Ocorrências e resumos'); await until(`document.body.textContent.includes('Selecione uma pessoa para consultar')`); await field('Pessoa', worker.id); await until(`document.body.textContent.includes('Nenhuma ocorrência')`);
  await field('Data', '2026-11-02'); await field('Observação / motivo', '<img src=x onerror="window.__paymentsXss=true">'); await click('Salvar ocorrência'); await until(`document.querySelector('tbody')?.textContent.includes('2026-11-02')`);
  assert.equal(await evaluate('window.__paymentsXss === true'), false);
  assert.equal(await evaluate('document.querySelectorAll("tbody img").length'), 0);
  await click('Resumo e ajustes'); await until(`document.body.textContent.includes('Original fechado')`);
  await click('Histórico'); await until(`document.body.textContent.includes('Prestador de teste') && document.body.textContent.includes('Fechada')`);
  // Five audited DELETE routes: only fixture state changes, never the real API.
  await confirmDeletion('Cancelar apuração', 'Fechamento de teste cancelado');
  await until(`!document.querySelector('dialog[open]') && document.querySelector('tbody')?.textContent.includes('Cancelada')`);
  assert.equal(calls.filter(c => c.method === 'DELETE' && c.path === '/calculations/calc1').length, 1);
  const previewCount = calls.filter(c => c.path === '/calculations/preview').length;
  await evaluate(`document.querySelector('button[aria-label="Ver demonstrativo"]').click()`);
  await until(`document.body.textContent.includes('rubricas originais do histórico')`);
  assert.equal(calls.filter(c => c.path === '/calculations/preview').length, previewCount);
  await click('Cálculo'); await field('Pessoa', worker.id); await until(`document.body.textContent.includes('Excluir preparação') && !document.body.textContent.includes('Carregando período')`);
  // Stale revision must remain blocked until an explicit refresh/reconfirmation.
  await confirmDeletion('Excluir preparação', 'Preparação obsoleta');
  await until(`document.querySelector('dialog')?.textContent.includes('Revisão divergente')`);
  assert.equal(calls.filter(c => c.method === 'DELETE' && c.path === '/preparations/prep1').length, 1);
  await click('Atualizar e reconferir'); await until(`!document.querySelector('dialog[open]') && document.body.textContent.includes('Excluir preparação')`);
  await confirmDeletion('Excluir preparação', 'Preparação reconferida');
  await until(`!document.querySelector('dialog[open]') && !document.body.textContent.includes('Excluir preparação')`);
  assert.deepEqual(calls.filter(c => c.method === 'DELETE' && c.path === '/preparations/prep1').map(c => JSON.parse(c.body).revision), [4, 5]);
  await click('Gerar prévia'); await until(`document.body.textContent.includes('1.230,00')`); await click('Fechar quinzena'); await until(`document.body.textContent.includes('Quinzena fechada')`);
  assert.equal(history.length, 2); assert.deepEqual(history.map(row => [row.id, row.status]), [['calc1', 4], ['calc2', 2]]);
  await click('Ocorrências e resumos'); await field('Pessoa', worker.id); await until(`document.querySelector('tbody')?.textContent.includes('2026-11-02')`);
  await confirmDeletion('Cancelar falta', 'Cancelamento auditado da falta', true);
  await until(`!document.querySelector('dialog[open]') && document.querySelector('tbody')?.textContent.includes('Cancelada')`);
  assert.equal(absences.length, 1); assert.equal(absences[0].isCancelled, true);
  await click('DSR histórico'); await until(`document.body.textContent.includes('Cancelada — valor original') && document.body.textContent.includes('Cobrança ativa no fechamento')`);
  assert.equal(dsr.length, 2); assert.equal(dsr[0].isCancelled, true); assert.equal(dsr[1].isCancelled, false);
  await click('Vales'); await until(`document.body.textContent.includes('Vale de teste')`);
  await confirmDeletion('Excluir vale', 'Cancelar aplicações futuras do vale'); await until(`!document.querySelector('dialog[open]') && !document.body.textContent.includes('Excluir vale')`);
  assert.equal(vouchers[0].status, 4); assert.equal(vouchers[0].appliedInstallments, 1);
  await click('Pessoas'); await click('Prestadores'); await until(`document.querySelector('tbody')?.textContent.includes('Prestador de teste')`);
  await confirmDeletion('Excluir trabalhador', 'Remoção financeira auditada'); await until(`!document.querySelector('dialog[open]') && !document.querySelector('tbody')?.textContent.includes('Prestador de teste')`);
  assert.equal(people.includes(worker), false); assert.equal(history.length, 2);
  await click('Ocorrências e resumos'); await field('Consultar pessoa removida pelo ID', worker.id); await click('Consultar histórico por ID'); await until(`document.body.textContent.includes('Consulta histórica')`);
  await click('Resumo e ajustes'); await until(`document.body.textContent.includes('Cancelada — original preservado')`);
  assert.equal(runtimeErrors.length, 0, runtimeErrors.join('\n'));
  console.log('Browser smoke passed: existing payment flows and all five audited DELETE routes, stale-revision reconfirmation, cancelled snapshot preservation, new closing ID, cancelled/active DSR and history by removed person ID. All API calls mocked; external requests blocked.');
}
const keepAlive = setInterval(() => {}, 1000);
main().catch(async e => { console.error(e.message); if (socket?.readyState === WebSocket.OPEN) { console.error('Page:', await evaluate('document.body.innerText.slice(0, 1500)').catch(() => 'unavailable')); console.error('Runtime errors:', runtimeErrors); } process.exitCode = 1; }).finally(async () => { clearInterval(keepAlive); if (socket?.readyState === WebSocket.OPEN) await command('Browser.close').catch(() => {}); socket?.close(); browser.kill(); });
