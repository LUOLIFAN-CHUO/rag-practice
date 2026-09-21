const DEFAULT_TIMEOUT_MS = 30000;

const ERROR_MESSAGES = Object.freeze({
  INVALID_REQUEST: "質問の内容を確認して、もう一度お試しください。",
  RATE_LIMITED: "質問が集中しています。少し時間をおいてから、もう一度お試しください。",
  SERVICE_UNAVAILABLE: "現在、AI サービスを利用できません。しばらくしてから、もう一度お試しください。",
  TIMEOUT: "回答の生成に時間がかかっています。しばらくしてから、もう一度お試しください。",
  NETWORK_ERROR: "AI サービスに接続できませんでした。通信環境を確認して、もう一度お試しください。",
  INVALID_RESPONSE: "回答を正しく読み込めませんでした。しばらくしてから、もう一度お試しください。",
  CONFIGURATION_ERROR: "AI アシスタントの接続先が設定されていません。",
});

const SECTION_LABELS = Object.freeze({
  about: "プロフィール",
  experience: "経験",
  projects: "プロジェクト",
  skills: "スキル",
});

export class ApiClientError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function statusError(status, payload) {
  if (status === 400) {
    const backendMessage = payload?.error?.message;
    return new ApiClientError(
      "INVALID_REQUEST",
      typeof backendMessage === "string" ? backendMessage : ERROR_MESSAGES.INVALID_REQUEST,
      status,
    );
  }

  if (status === 429) {
    return new ApiClientError("RATE_LIMITED", ERROR_MESSAGES.RATE_LIMITED, status);
  }

  if (status === 503) {
    return new ApiClientError(
      "SERVICE_UNAVAILABLE",
      ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      status,
    );
  }

  return new ApiClientError("SERVER_ERROR", ERROR_MESSAGES.SERVICE_UNAVAILABLE, status);
}

function validSource(source) {
  return (
    source !== null &&
    typeof source === "object" &&
    typeof source.title === "string" &&
    source.title.trim().length > 0 &&
    typeof source.section === "string" &&
    source.section.trim().length > 0
  );
}

export function formatSourceLabel(source) {
  const title = source.title.trim();
  const sectionLabel = SECTION_LABELS[source.section.trim()];

  if (!sectionLabel || title === sectionLabel || title.startsWith(sectionLabel)) {
    return title;
  }
  return `${sectionLabel} · ${title}`;
}

export async function requestAnswer({
  apiUrl,
  question,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof apiUrl !== "string" || apiUrl.trim().length === 0) {
    throw new ApiClientError(
      "CONFIGURATION_ERROR",
      ERROR_MESSAGES.CONFIGURATION_ERROR,
    );
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(apiUrl, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      if (!response.ok) {
        throw statusError(response.status, {});
      }
      throw new ApiClientError(
        "INVALID_RESPONSE",
        ERROR_MESSAGES.INVALID_RESPONSE,
        response.status,
      );
    }

    if (!response.ok) {
      throw statusError(response.status, payload);
    }

    if (
      typeof payload.answer !== "string" ||
      payload.answer.trim().length === 0 ||
      !Array.isArray(payload.sources) ||
      !payload.sources.every(validSource)
    ) {
      throw new ApiClientError(
        "INVALID_RESPONSE",
        ERROR_MESSAGES.INVALID_RESPONSE,
        response.status,
      );
    }

    return {
      answer: payload.answer,
      sources: payload.sources.map((source) => ({
        title: source.title.trim(),
        section: source.section.trim(),
      })),
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error?.name === "AbortError") {
      throw new ApiClientError("TIMEOUT", ERROR_MESSAGES.TIMEOUT);
    }
    throw new ApiClientError("NETWORK_ERROR", ERROR_MESSAGES.NETWORK_ERROR);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
