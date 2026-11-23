const test = require('node:test');
const assert = require('node:assert/strict');
const { isIntegerQuantityText, normalizeLeadingZeros, parseIntegerQuantity } = require('../lib/quantity-input.cjs');

test('quantidade vazia permanece distinta de zero e de campo não informado', () => {
  assert.equal(isIntegerQuantityText(''), true);
  assert.deepEqual(parseIntegerQuantity(''), { valid: false, reason: 'empty' });
  assert.deepEqual(parseIntegerQuantity('0', { allowZero: true }), { valid: true, value: 0 });
  assert.deepEqual(parseIntegerQuantity('0'), { valid: false, reason: 'minimum' });
});

test('aceita colagem numérica, preserva durante digitação e remove zeros à esquerda ao normalizar', () => {
  assert.equal(isIntegerQuantityText('00040000'), true);
  assert.equal(normalizeLeadingZeros('00040000'), '40000');
  assert.equal(parseIntegerQuantity('40000').value, 40000);
});

test('rejeita decimais, sinais, espaços e valores fora do intervalo seguro', () => {
  for (const value of ['-1', '1.5', '1,5', ' 2', '+4', '1a']) {
    assert.equal(isIntegerQuantityText(value), false);
    assert.equal(parseIntegerQuantity(value).valid, false);
  }
  assert.deepEqual(parseIntegerQuantity('9007199254740992'), { valid: false, reason: 'range' });
});
