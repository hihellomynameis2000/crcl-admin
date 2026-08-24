export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    const message = (payload as { error: string }).error.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

export async function readApiJson<T = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      `Invalid API response (${response.status}): ${preview || "empty body"}`
    );
  }
}
