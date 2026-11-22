/* eslint-disable @typescript-eslint/no-require-imports -- Node's built-in test runner is used in this repository. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('the assistant has one authenticated global mount and no navigation screen', () => {
  const layout = read('app/layout.tsx');
  const gate = read('components/assistant/AssistantFloatingWidget.tsx');
  const sidebar = read('components/Sidebar.tsx');
  const dashboard = read('app/dashboard/page.tsx');
  assert.equal((layout.match(/<AssistantFloatingWidget\s*\/>/g) || []).length, 1);
  assert.match(gate, /allowedRoles\.has\(role\)/);
  assert.match(gate, /claims\.exp\s*\*\s*1000\s*>\s*Date\.now\(\)/);
  assert.doesNotMatch(sidebar, /label:\s*'Assistente Ceramista'/);
  assert.doesNotMatch(dashboard, /AssistantLayout|activeModule === 'assistant'/);
});

test('chat requires explicit text and media privacy confirmation before provider requests', () => {
  const source = read('components/assistant/AssistantWorkspace.tsx');
  assert.match(source, /if \(!textConsent && !acceptedConsent\)/);
  assert.match(source, /if \(!mediaConsent\) \{ setPendingMedia/);
  assert.match(source, /pode ser usado para melhorar produtos/);
  assert.match(source, /Não envie CPF, dados bancários/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test('only supported image and WAV inputs are exposed and removed after success', () => {
  const source = read('components/assistant/AssistantWorkspace.tsx');
  const backend = read('../../Backend/CeramicaCanelas.WebApi/Assistant/AssistantAttachmentValidator.cs');
  assert.match(source, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(source, /accept="audio\/wav"/);
  assert.match(source, /duration > 90/);
  assert.match(source, /MAX_FILES = 4/);
  assert.match(source, /createScriptProcessor/);
  assert.match(source, /function encodeWav/);
  assert.match(source, /clearAttachments\(\);\s*setHasNew\(true\)/);
  assert.match(backend, /DetectImageMimeType/);
  assert.match(backend, /GetPcmWavDurationSeconds/);
  assert.match(backend, /MaxAudioSeconds = 90/);
});

test('floating panel retains conversation, has accessible controls, errors and reduced motion', () => {
  const source = read('components/assistant/AssistantWorkspace.tsx');
  const styles = read('components/assistant/assistant.module.css');
  assert.match(source, /aria-label=\{open \? 'Fechar Assistente Ceramista' : 'Abrir Assistente Ceramista'\}/);
  assert.match(source, /aria-label="Minimizar conversa"/);
  assert.match(source, /aria-label="Fechar assistente"/);
  assert.match(source, /aria-label=\{`Remover \$\{item\.file\.name\}`\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /speechSynthesis/);
  assert.match(source, /Enter envia · Shift \+ Enter quebra linha/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@keyframes panel-enter/);
});
