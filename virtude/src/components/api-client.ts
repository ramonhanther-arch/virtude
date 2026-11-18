import type { AppState } from "@/lib/types";

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export function isSetupError(error: unknown) {
  return error instanceof ApiClientError && error.status === 503 && error.code === "CONFIGURATION_REQUIRED";
}

export function safeInternalPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return fallback;
  return value;
}

export async function apiSend<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(0, "Sem conexão com o servidor. Nada foi confirmado.");
  }
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    const body = data as { error?: unknown; code?: unknown };
    const message = typeof body.error === "string" ? body.error : "Não foi possível concluir.";
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new ApiClientError(response.status, message, code);
  }
  return data as T;
}

export async function downloadExport() {
  const response = await fetch("/api/export", { cache: "no-store", headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    let message = "Não foi possível exportar.";
    let code: string | undefined;
    try {
      const body = JSON.parse(text) as { error?: string; code?: string };
      if (body.error) message = body.error;
      code = body.code;
    } catch {
      message = "Não foi possível exportar.";
    }
    throw new ApiClientError(response.status, message, code);
  }
  const match = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "");
  const filename = match?.[1] && /^[\w.-]+$/.test(match[1]) ? match[1] : "virtude-dados.json";
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function loadAccount() {
  return apiSend<AppState>("/api/state");
}
