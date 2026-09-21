import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiClientError,
  formatSourceLabel,
  requestAnswer,
} from "../api-client.js";


function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}


test("requestAnswer sends the API contract and maps public sources", async () => {
  let request;
  const result = await requestAnswer({
    apiUrl: "https://example.test/ask",
    question: "AWS の経験は？",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(200, {
        answer: "回答です。",
        sources: [{ title: " Cloud Resume Challenge ", section: " projects " }],
      });
    },
  });

  assert.equal(request.url, "https://example.test/ask");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.credentials, "omit");
  assert.deepEqual(JSON.parse(request.options.body), { question: "AWS の経験は？" });
  assert.deepEqual(result, {
    answer: "回答です。",
    sources: [{ title: "Cloud Resume Challenge", section: "projects" }],
  });
});


test("requestAnswer exposes the safe backend message for a 400", async () => {
  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "",
      fetchImpl: async () =>
        response(400, {
          error: { code: "INVALID_QUESTION", message: "質問を入力してください。" },
        }),
    }),
    (error) =>
      error instanceof ApiClientError &&
      error.code === "INVALID_REQUEST" &&
      error.status === 400 &&
      error.message === "質問を入力してください。",
  );
});


test("requestAnswer maps rate limits and service errors to Japanese", async () => {
  for (const [status, code] of [
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
    [503, "SERVICE_UNAVAILABLE"],
  ]) {
    await assert.rejects(
      requestAnswer({
        apiUrl: "https://example.test/ask",
        question: "質問",
        fetchImpl: async () => response(status, { message: "internal" }),
      }),
      (error) =>
        error instanceof ApiClientError &&
        error.code === code &&
        error.status === status &&
        /[ぁ-んァ-ン]/u.test(error.message),
    );
  }

  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "質問",
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => {
          throw new SyntaxError("not json");
        },
      }),
    }),
    (error) => error instanceof ApiClientError && error.code === "RATE_LIMITED",
  );
});


test("requestAnswer rejects malformed success responses", async () => {
  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "質問",
      fetchImpl: async () => response(200, { answer: "回答", sources: [{}] }),
    }),
    (error) => error instanceof ApiClientError && error.code === "INVALID_RESPONSE",
  );

  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "質問",
      fetchImpl: async () => response(200, { answer: "  ", sources: [] }),
    }),
    (error) => error instanceof ApiClientError && error.code === "INVALID_RESPONSE",
  );
});


test("requestAnswer maps network failures and timeouts", async () => {
  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "質問",
      fetchImpl: async () => {
        throw new TypeError("network details must not be exposed");
      },
    }),
    (error) => error instanceof ApiClientError && error.code === "NETWORK_ERROR",
  );

  await assert.rejects(
    requestAnswer({
      apiUrl: "https://example.test/ask",
      question: "質問",
      timeoutMs: 1,
      fetchImpl: async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    }),
    (error) => error instanceof ApiClientError && error.code === "TIMEOUT",
  );
});


test("formatSourceLabel renders friendly public metadata", () => {
  assert.equal(
    formatSourceLabel({ title: "Cloud Resume Challenge", section: "projects" }),
    "プロジェクト · Cloud Resume Challenge",
  );
  assert.equal(
    formatSourceLabel({ title: "プロフィール", section: "about" }),
    "プロフィール",
  );
  assert.equal(
    formatSourceLabel({ title: "スキル・資格・学歴", section: "skills" }),
    "スキル・資格・学歴",
  );
  assert.equal(
    formatSourceLabel({ title: "不明な資料", section: "other" }),
    "不明な資料",
  );
});
