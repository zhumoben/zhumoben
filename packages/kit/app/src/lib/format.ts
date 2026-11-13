export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentTime(): string {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(date: string): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

export function formatShort(value: string): string {
  if (!value) return "—";
  return value.replace(/-/g, ".").slice(5);
}

export function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}
