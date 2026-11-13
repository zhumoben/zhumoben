import type {
  ExportFormat,
  RecordSummary,
  ScoreRecord,
} from "../../../shared/types";

const BASE = "/__kit/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `${res.status} ${res.statusText}`);
  }
  return data as T;
}

function jsonBody(body: unknown): RequestInit {
  return {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  records: () => request<RecordSummary[]>("/records"),

  record: (id: string) =>
    request<ScoreRecord>(`/records/${encodeURIComponent(id)}`),

  save: (id: string | null, record: ScoreRecord) =>
    request<{ id: string }>("/records", {
      method: "PUT",
      ...jsonBody({ id, record }),
    }),

  remove: (id: string) =>
    request<{ movedTo: string }>(`/records/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  exportRecord: (id: string, format: ExportFormat) =>
    request<{ filename: string; content: string; mime: string }>("/export", {
      method: "POST",
      ...jsonBody({ id, format }),
    }),
};

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}
