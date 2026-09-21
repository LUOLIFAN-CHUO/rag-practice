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

const MOCK_RESPONSES = [
  {
    patterns: ["aws", "云", "cloud", "クラウド"],
    answer: "AWS の経験は主に二つあります。AWS Japan のインターンシップで、アーキテクチャ図とチュートリアルに沿った環境構築を経験しました。また、Cloud Resume Challenge では S3、CloudFront、API Gateway、Lambda、DynamoDB を使ったサーバーレス構成を実装しています。",
    sources: ["インターンシップ · AWS Japan", "プロジェクト · Cloud Resume Challenge"],
  },
  {
    patterns: ["resume challenge", "简历项目", "简历挑战", "プロジェクト", "项目", "project"],
    answer: "Cloud Resume Challenge はエンドツーエンドのクラウドプロジェクトです。静的サイトを S3 と CloudFront で配信し、API Gateway、Python Lambda、DynamoDB で訪問者数を管理しています。Terraform と GitHub Actions によるインフラ管理と自動デプロイも実装しています。",
    sources: ["プロジェクト · Cloud Resume Challenge"],
  },
  {
    patterns: ["技能", "技术", "tech", "skill", "スキル", "言語"],
    answer: "公開されているスキルは、AWS、Git、GitHub Actions、Terraform、Python、Shell、SQL、HTML、CSS、JavaScript、Linux です。現在はクラウドインフラ、サーバーレス、自動化を重点的に学んでいます。",
    sources: ["スキル・学歴 · 技術スキル"],
  },
  {
    patterns: ["实习", "intern", "インターン"],
    answer: "研修プログラムを通じて AWS Japan のインターンシップに参加し、AWS アーキテクチャ図を確認しながら、チュートリアルに沿った環境構築を経験しました。",
    sources: ["インターンシップ · AWS Japan"],
  },
  {
    patterns: ["学校", "大学", "教育", "education", "university", "大学"],
    answer: "中央大学 先進理工学部 電気電子情報通信工学科に在籍しており、2030 年卒業予定です。",
    sources: ["スキル・学歴 · 学歴"],
  },
  {
    patterns: ["目标", "方向", "career", "goal", "志望", "将来"],
    answer: "クラウドエンジニアを目指しており、AWS、サーバーレス、Infrastructure as Code、CI/CD のプロジェクトを通じてスキルを伸ばしています。",
    sources: ["プロフィール · キャリア目標", "スキル・学歴 · 学習分野"],
  },
];

const FALLBACK = "現在の履歴書には、その情報が記載されていません。記録されていない経験やスキルは推測せず、AWS の経験、技術スキル、プロジェクト、学歴についてお答えできます。";

let requestInProgress = false;

function getMockAnswer(question) {
  const normalizedQuestion = question.toLowerCase();
  const match = MOCK_RESPONSES.find((item) =>
    item.patterns.some((pattern) => normalizedQuestion.includes(pattern)),
  );

  if (!match) {
    return { answer: FALLBACK, sources: [] };
  }

  return { answer: match.answer, sources: match.sources };
}

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

function createAssistantMessage(answer, sources) {
  const wrapper = document.createElement("div");
  wrapper.className = "message assistant-message";

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
      chip.textContent = source;
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

  const delay = 650 + Math.floor(Math.random() * 450);
  await new Promise((resolve) => window.setTimeout(resolve, delay));

  const result = getMockAnswer(question);
  typingMessage.replaceWith(createAssistantMessage(result.answer, result.sources));
  requestInProgress = false;
  updateInputState();
  scrollToLatestMessage();
  questionInput.focus();
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
