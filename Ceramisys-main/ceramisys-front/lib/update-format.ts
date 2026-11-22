export function formatUpdateDate(date: string, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date(date));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} às ${values.hour}:${values.minute}`;
}
