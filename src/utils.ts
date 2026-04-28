export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function formatRu(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const clean = dateStr.split('T')[0].split(' ')[0];
  const parts = clean.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '';
  const day = parts[2] ?? '';
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const monthIndex = parseInt(m) - 1;
  return `${parseInt(day)} ${months[monthIndex] ?? ''} ${y}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function formatMoney(n: number | string): string {
  return Number(n).toLocaleString('ru-RU');
}

export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
