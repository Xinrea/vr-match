import questionsData from "../data/quiz-questions.json" with { type: "json" };
import membersData from "../data/virtuareal-member-vectors.json" with { type: "json" };
import { buildUserProfile, getResult } from "./match-engine.mjs";

const app = document.querySelector("#app");
const { questions } = questionsData;
const members = membersData.members;
const state = { screen: "home", index: 0, answers: {} };

const colorFor = (name) => {
  const palettes = [
    "linear-gradient(135deg, #ee749f, #a16ae8)", "linear-gradient(135deg, #48b7d9, #7462dc)",
    "linear-gradient(135deg, #ffae64, #ee667b)", "linear-gradient(135deg, #6ed5bd, #4a83cf)",
    "linear-gradient(135deg, #b883ed, #f27ca7)"
  ];
  const hash = [...name].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return palettes[hash % palettes.length];
};

const mark = (name, className = "member-mark") => `<div class="${className}" style="--member-color:${colorFor(name)}"><span class="${className === "member-mark" ? "member-initial" : ""}">${name.slice(0, 1)}</span></div>`;
const layout = (content) => `<div class="topbar"><a class="brand" href="#home" data-action="home">VR<span class="brand-dot">•</span>MATCH</a><span class="eyebrow">viewing companion test</span></div>${content}`;

function renderHome() {
  state.screen = "home";
  app.innerHTML = layout(`
    <section class="hero">
      <div>
        <div class="eyebrow">VirtuaReal Project · beta</div>
        <h1>找到你的<br /><em>观看搭子</em></h1>
        <p>不是给你贴人格标签，而是从你喜欢的直播氛围、内容和互动方式里，寻找可能会让你停留更久的 VirtuaReal 成员。</p>
        <button class="primary-button" data-action="start">开始测验 <span aria-hidden="true">→</span></button>
        <p class="home-footnote">11 道题 · 约 2 分钟 · 结果仅供探索，不代表官方推荐</p>
      </div>
      <div class="orb-stage" aria-hidden="true"><div class="orbit one"></div><div class="orbit two"></div><div class="orb"></div><div class="orb-core">YOUR<br />SIGNAL</div><i class="star a"></i><i class="star b"></i><i class="star c"></i></div>
    </section>
  `);
}

function renderQuiz() {
  state.screen = "quiz";
  const question = questions[state.index];
  const selected = state.answers[question.id];
  const progress = ((state.index + 1) / questions.length) * 100;
  app.innerHTML = layout(`
    <section class="quiz-layout">
      <div class="progress-meta"><span>QUESTION ${String(state.index + 1).padStart(2, "0")}</span><span>${state.index + 1} / ${questions.length}</span></div>
      <div class="progress-track"><div class="progress-value" style="width:${progress}%"></div></div>
      <article class="question-card" key="${question.id}">
        <div class="eyebrow">${question.dimension.replaceAll("_", " · ")}</div>
        <h1>${question.prompt}</h1>
        <div class="option-list" role="group" aria-label="回答选项">
          ${question.options.map((option, index) => `<button class="option" data-action="answer" data-option="${option.id}" aria-pressed="${selected === option.id}"><span>${option.label}</span><span class="option-key">${index + 1}</span></button>`).join("")}
        </div>
        <div class="quiz-actions">
          <button class="text-button" data-action="back" ${state.index === 0 ? "disabled" : ""}>← 上一题</button>
          <button class="primary-button" data-action="next" ${selected ? "" : "disabled"}>${state.index === questions.length - 1 ? "查看结果" : "下一题 →"}</button>
        </div>
      </article>
    </section>
  `);
}

function renderResult() {
  state.screen = "result";
  const profile = buildUserProfile(questions, state.answers);
  const result = getResult(profile, members);
  const { primary, alternatives, tier } = result;
  const member = primary.member;
  const profileLink = member.bilibiliUid ? `<a class="bilibili-link" href="https://space.bilibili.com/${member.bilibiliUid}" target="_blank" rel="noreferrer">前往 B 站主页 ↗</a>` : "";
  app.innerHTML = layout(`
    <section class="result-layout">
      <header class="result-intro"><div class="eyebrow">your viewing signal</div><h1>你可能会喜欢</h1><p>这份结果来自你的观看偏好。先从主结果开始，也别错过风格相邻的两位成员。</p></header>
      <article class="primary-result">
        ${mark(member.name)}
        <div class="result-copy">
          <span class="result-tier">${tier}</span>
          <h2>${member.name}</h2>
          <p class="archetype">${member.archetype}</p>
          <ul class="result-reasons">${primary.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>
          ${profileLink}
        </div>
      </article>
      <h2 class="alternative-heading">也许会对胃口</h2>
      <div class="alternatives">${alternatives.map(({ member: alternative }) => `
        <article class="alternative">
          ${mark(alternative.name, "mini-mark")}
          <div><h3>${alternative.name}</h3><p>${alternative.archetype}</p></div>
        </article>`).join("")}</div>
      <div class="result-actions"><button class="primary-button" data-action="restart">再测一次</button><button class="secondary-button" data-action="show-profile">查看我的偏好向量</button></div>
      <p class="disclaimer">本测验为非官方兴趣探索工具。匹配依据为公开资料整理出的内容与观看体验向量，不代表成员本人真实人格，也不构成官方推荐。</p>
    </section>
  `);
  state.lastProfile = profile;
}

function showProfile() {
  const { styles, content } = state.lastProfile;
  const info = [...Object.entries(styles), ...Object.entries(content)].map(([key, value]) => `${key}: ${value}`).join("\n");
  window.alert(`你的观看偏好向量\n\n${info}`);
}

function moveNext() {
  if (!state.answers[questions[state.index].id]) return;
  if (state.index === questions.length - 1) return renderResult();
  state.index += 1;
  renderQuiz();
}

app.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control || control.disabled) return;
  const action = control.dataset.action;
  if (action === "start" || action === "restart") { state.index = 0; state.answers = {}; return renderQuiz(); }
  if (action === "home") return renderHome();
  if (action === "answer") { state.answers[questions[state.index].id] = control.dataset.option; return renderQuiz(); }
  if (action === "next") return moveNext();
  if (action === "back" && state.index > 0) { state.index -= 1; return renderQuiz(); }
  if (action === "show-profile") return showProfile();
});

window.addEventListener("keydown", (event) => {
  if (state.screen !== "quiz") return;
  const question = questions[state.index];
  const number = Number(event.key);
  if (number >= 1 && number <= question.options.length) { state.answers[question.id] = question.options[number - 1].id; renderQuiz(); }
  if (event.key === "Enter") moveNext();
});

renderHome();
