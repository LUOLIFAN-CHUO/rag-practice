import { ApiClientError, formatSourceLabel, requestAnswer } from "./api-client.js";

const questionForm = document.querySelector("#questionForm");
const questionInput = document.querySelector("#questionInput");
const sendButton = document.querySelector("#sendButton");
const charCount = document.querySelector("#charCount");
const messageList = document.querySelector("#messageList");
const assistantPanel = document.querySelector("#assistantPanel");
const chatLauncher = document.querySelector("#chatLauncher");
const closeChatButton = document.querySelector("#closeChat");
const mobileBackdrop = document.querySelector("#mobileBackdrop");
const openAssistantButtons = document.querySelectorAll("[data-open-assistant]");

const appConfig = globalThis.APP_CONFIG ?? {};
const RAG_API_URL = appConfig.RAG_API_URL ?? "";
const RAG_REQUEST_TIMEOUT_MS = Number.isFinite(appConfig.RAG_REQUEST_TIMEOUT_MS)
  ? appConfig.RAG_REQUEST_TIMEOUT_MS
  : 30_000;
const UNEXPECTED_ERROR =
  "予期しないエラーが発生しました。時間をおいて、もう一度お試しください。";

let requestInProgress = false;

function getTimeLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function createUserMessage(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "message user-message";
  wrapper.innerHTML = `
    <div class="message-body">
      <p></p>
      <span class="message-time">${getTimeLabel()}</span>
    </div>
  `;
  wrapper.querySelector("p").textContent = text;
  return wrapper;
}

function createAssistantMessage(answer, sources, { isError = false } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "message assistant-message";
  if (isError) {
    wrapper.classList.add("error-message");
    wrapper.setAttribute("role", "alert");
  }

  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "AI";

  const body = document.createElement("div");
  body.className = "message-body";

  const answerText = document.createElement("p");
  answerText.textContent = answer;
  body.append(answerText);

  if (sources.length > 0) {
    const sourceList = document.createElement("div");
    sourceList.className = "source-list";
    sourceList.setAttribute("aria-label", "回答の参照元");
    sources.forEach((source) => {
      const chip = document.createElement("span");
      chip.className = "source-chip";
      chip.textContent = formatSourceLabel(source);
      sourceList.append(chip);
    });
    body.append(sourceList);
  }

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = getTimeLabel();
  body.append(time);

  wrapper.append(avatar, body);
  return wrapper;
}

function createTypingMessage() {
  const wrapper = document.createElement("div");
  wrapper.className = "message assistant-message";
  wrapper.setAttribute("aria-label", "AI が回答を作成しています");
  wrapper.innerHTML = `
    <span class="message-avatar" aria-hidden="true">AI</span>
    <div class="typing-bubble" aria-hidden="true"><span></span><span></span><span></span></div>
  `;
  return wrapper;
}

function scrollToLatestMessage() {
  requestAnimationFrame(() => {
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
  });
}

function updateInputState() {
  const length = questionInput.value.length;
  charCount.textContent = `${length} / 240`;
  questionInput.disabled = requestInProgress;
  sendButton.disabled = requestInProgress || questionInput.value.trim().length === 0;
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 96)}px`;
}

async function askQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question || requestInProgress) return;

  requestInProgress = true;
  questionInput.value = "";
  updateInputState();

  const suggestionBlock = messageList.querySelector(".suggestion-block");
  suggestionBlock?.remove();
  messageList.append(createUserMessage(question));

  const typingMessage = createTypingMessage();
  messageList.append(typingMessage);
  scrollToLatestMessage();

  try {
    const result = await requestAnswer({
      apiUrl: RAG_API_URL,
      question,
      timeoutMs: RAG_REQUEST_TIMEOUT_MS,
    });
    typingMessage.replaceWith(createAssistantMessage(result.answer, result.sources));
  } catch (error) {
    const message = error instanceof ApiClientError ? error.message : UNEXPECTED_ERROR;
    typingMessage.replaceWith(createAssistantMessage(message, [], { isError: true }));
    questionInput.value = question;
  } finally {
    requestInProgress = false;
    updateInputState();
    scrollToLatestMessage();
    questionInput.focus();
  }
}

function openAssistant() {
  assistantPanel.classList.add("is-open");
  assistantPanel.setAttribute("aria-hidden", "false");
  chatLauncher.classList.add("is-hidden");
  mobileBackdrop.classList.add("is-visible");
  document.body.classList.add("chat-open");
  window.setTimeout(() => questionInput.focus(), 180);
}

function closeAssistant() {
  assistantPanel.classList.remove("is-open");
  assistantPanel.setAttribute("aria-hidden", "true");
  chatLauncher.classList.remove("is-hidden");
  mobileBackdrop.classList.remove("is-visible");
  document.body.classList.remove("chat-open");
  chatLauncher.focus();
}

questionInput.addEventListener("input", updateInputState);

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    questionForm.requestSubmit();
  }
});

questionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askQuestion(questionInput.value);
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => askQuestion(button.dataset.question));
});

openAssistantButtons.forEach((button) => button.addEventListener("click", openAssistant));
chatLauncher.addEventListener("click", openAssistant);
closeChatButton.addEventListener("click", closeAssistant);
mobileBackdrop.addEventListener("click", closeAssistant);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && assistantPanel.classList.contains("is-open")) {
    closeAssistant();
  }
});

window.addEventListener("resize", () => {
  const isDesktop = window.matchMedia("(min-width: 881px)").matches;
  if (isDesktop) {
    assistantPanel.setAttribute("aria-hidden", "false");
    mobileBackdrop.classList.remove("is-visible");
    document.body.classList.remove("chat-open");
  } else if (!assistantPanel.classList.contains("is-open")) {
    assistantPanel.setAttribute("aria-hidden", "true");
  }
});

if (window.matchMedia("(max-width: 880px)").matches) {
  assistantPanel.setAttribute("aria-hidden", "true");
}

updateInputState();
