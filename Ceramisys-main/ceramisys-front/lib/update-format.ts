export function formatUpdateDate(date: string, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} às ${values.hour}:${values.minute}`;
}

export function getUpdateDateKey(date: string, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatUpdateDay(date: string, now = new Date(), timeZone?: string) {
  const key = getUpdateDateKey(date, timeZone);
  const today = getUpdateDateKey(now.toISOString(), timeZone);
  const previous = getUpdateDateKey(new Date(now.getTime() - 86_400_000).toISOString(), timeZone);
  if (key === today) return 'Hoje';
  if (key === previous) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}),
  }).format(new Date(date));
}
