'use strict';

function isIntegerQuantityText(value) {
  return typeof value === 'string' && /^\d*$/.test(value);
}

function normalizeLeadingZeros(value) {
  return value.replace(/^0+(?=\d)/, '');
}

function parseIntegerQuantity(value, { allowZero = false } = {}) {
  if (value === '') return { valid: false, reason: 'empty' };
  if (!/^\d+$/.test(value)) return { valid: false, reason: 'integer' };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return { valid: false, reason: 'range' };
  if (!allowZero && parsed === 0) return { valid: false, reason: 'minimum' };
  return { valid: true, value: parsed };
}

module.exports = { isIntegerQuantityText, normalizeLeadingZeros, parseIntegerQuantity };
