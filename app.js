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
    answers: {
      zh: "候选人的 AWS 经验主要来自两个方面：一是参加 AWS Japan 的实习实践，根据架构图和教程完成 AWS 环境构建；二是独立完成 Cloud Resume Challenge，使用 S3、CloudFront、API Gateway、Lambda 和 DynamoDB 构建并部署 Serverless 简历网站。",
      ja: "AWS の経験は主に二つあります。AWS Japan のインターンシップで、アーキテクチャ図とチュートリアルに沿った環境構築を経験しました。また、Cloud Resume Challenge では S3、CloudFront、API Gateway、Lambda、DynamoDB を使ったサーバーレス構成を実装しています。",
      en: "The candidate's AWS experience comes from two areas: an AWS Japan internship with hands-on environment setup, and the Cloud Resume Challenge, built with S3, CloudFront, API Gateway, Lambda, and DynamoDB in a serverless architecture.",
    },
    sources: ["实习经历 · AWS Japan", "项目经历 · Cloud Resume Challenge"],
  },
  {
    patterns: ["resume challenge", "简历项目", "简历挑战", "プロジェクト", "项目", "project"],
    answers: {
      zh: "Cloud Resume Challenge 是一个端到端的云项目。静态简历托管在 S3 并通过 CloudFront 分发；访客计数由 API Gateway、Python Lambda 和 DynamoDB 提供；基础设施使用 Terraform 管理，并通过 GitHub Actions 完成测试与自动部署。",
      ja: "Cloud Resume Challenge はエンドツーエンドのクラウドプロジェクトです。静的サイトを S3 と CloudFront で配信し、API Gateway、Python Lambda、DynamoDB で訪問者数を管理しています。Terraform と GitHub Actions によるインフラ管理と自動デプロイも実装しています。",
      en: "The Cloud Resume Challenge is an end-to-end cloud project. The static resume is hosted on S3 and delivered through CloudFront, while API Gateway, Python Lambda, and DynamoDB power the visitor counter. Terraform and GitHub Actions manage infrastructure and deployment.",
    },
    sources: ["项目经历 · Cloud Resume Challenge"],
  },
  {
    patterns: ["技能", "技术", "tech", "skill", "スキル", "言語"],
    answers: {
      zh: "目前公开的技术技能包括：AWS、Git、GitHub Actions、Terraform、Python、Shell、SQL、HTML、CSS、JavaScript 和 Linux。学习重点是云基础设施、Serverless 与自动化。",
      ja: "公開されているスキルは、AWS、Git、GitHub Actions、Terraform、Python、Shell、SQL、HTML、CSS、JavaScript、Linux です。現在はクラウドインフラ、サーバーレス、自動化を重点的に学んでいます。",
      en: "Published skills include AWS, Git, GitHub Actions, Terraform, Python, Shell, SQL, HTML, CSS, JavaScript, and Linux. Current learning focuses on cloud infrastructure, serverless systems, and automation.",
    },
    sources: ["技能与教育 · 技术技能"],
  },
  {
    patterns: ["实习", "intern", "インターン"],
    answers: {
      zh: "候选人通过研修项目参加了 AWS Japan 实习。实践内容包括阅读 AWS 架构图，并按照教程完成 AWS 环境构建。这段经历帮助他建立了对云架构和实际操作流程的基础认识。",
      ja: "研修プログラムを通じて AWS Japan のインターンシップに参加し、AWS アーキテクチャ図を確認しながら、チュートリアルに沿った環境構築を経験しました。",
      en: "The candidate joined an AWS Japan internship through a training program, reading AWS architecture diagrams and completing guided cloud environment setup exercises.",
    },
    sources: ["实习经历 · AWS Japan"],
  },
  {
    patterns: ["学校", "大学", "教育", "education", "university", "大学"],
    answers: {
      zh: "候选人就读于中央大学先进理工学部电气电子信息通信工学科，预计 2030 年毕业。",
      ja: "中央大学 先進理工学部 電気電子情報通信工学科に在籍しており、2030 年卒業予定です。",
      en: "The candidate studies Electrical, Electronic, Information and Communication Engineering at Chuo University and expects to graduate in 2030.",
    },
    sources: ["技能与教育 · 教育经历"],
  },
  {
    patterns: ["目标", "方向", "career", "goal", "志望", "将来"],
    answers: {
      zh: "候选人的职业目标是成为 Cloud Engineer。目前主要通过 AWS、Serverless、基础设施即代码和 CI/CD 相关项目积累能力。",
      ja: "Cloud Engineer を目指しており、AWS、サーバーレス、Infrastructure as Code、CI/CD のプロジェクトを通じてスキルを伸ばしています。",
      en: "The candidate aims to become a Cloud Engineer and is building experience through AWS, serverless, infrastructure-as-code, and CI/CD projects.",
    },
    sources: ["个人简介 · 职业方向", "技能与教育 · 学习方向"],
  },
];

const FALLBACKS = {
  zh: "当前简历资料中没有提供这项信息。我不会对未记录的经历或能力作出推测。你可以询问 AWS 经验、技术技能、项目或教育背景。",
  ja: "現在の履歴書には、その情報が記載されていません。記録されていない経験やスキルは推測せず、AWS 経験、技術スキル、プロジェクト、学歴についてお答えできます。",
  en: "That information is not included in the current resume. I won't guess about unlisted experience or abilities, but you can ask about AWS experience, technical skills, projects, or education.",
};

let requestInProgress = false;

function detectLanguage(text) {
  if (/[぀-ヿ]/.test(text)) return "ja";
  if (/[一-鿿]/.test(text)) return "zh";
  return "en";
}

function getMockAnswer(question) {
  const normalizedQuestion = question.toLowerCase();
  const language = detectLanguage(question);
  const match = MOCK_RESPONSES.find((item) =>
    item.patterns.some((pattern) => normalizedQuestion.includes(pattern)),
  );

  if (!match) {
    return { answer: FALLBACKS[language], sources: [] };
  }

  return { answer: match.answers[language], sources: match.sources };
}

function getTimeLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
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
    sourceList.setAttribute("aria-label", "回答来源");
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
  wrapper.setAttribute("aria-label", "AI 正在生成回答");
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
