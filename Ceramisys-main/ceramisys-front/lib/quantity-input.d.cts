export function isIntegerQuantityText(value: string): boolean;
export function normalizeLeadingZeros(value: string): string;
export function parseIntegerQuantity(value: string, options?: { allowZero?: boolean }):
  | { valid: true; value: number }
  | { valid: false; reason: 'empty' | 'integer' | 'range' | 'minimum' };
