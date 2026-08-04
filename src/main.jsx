import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import questionsData from "../data/quiz-questions.json";
import membersData from "../data/virtuareal-member-vectors.json";
import additionalMembersData from "../data/additional-active-members.json";
import activeRosterData from "../data/active-member-roster.json";
import { buildUserProfile, filterMembersByGenderPreference, getResult } from "./match-engine.mjs";
import "98.css";
import "../styles.css";

const { questions } = questionsData;
const allMemberProfiles = [...membersData.members, ...additionalMembersData.members];
const memberProfileById = new Map(allMemberProfiles.map((member) => [member.id, member]));
const members = activeRosterData.members.map((rosterMember) => {
  const profile = memberProfileById.get(rosterMember.id);
  return profile ? { ...profile, ...rosterMember } : null;
}).filter(Boolean);
const RADAR_DIMENSIONS = [
  ["energy", "能量", "安静、低刺激 → 热闹、高刺激"],
  ["warmth", "温度", "冷感、克制 → 温柔、治愈"],
  ["chaos", "节目", "稳定、沉着 → 梗密度高、意外感强"],
  ["structure", "结构", "随性、自由聊天 → 主题明确、目标清晰"],
  ["intimacy", "互动", "舞台式欣赏 → 强陪伴、朋友感互动"],
  ["roleplay", "设定", "日常真实感 → 角色与世界观沉浸感"],
  ["focus", "专注", "内容多样、频繁切换 → 长时间深入一个主题"],
  ["novelty", "探索", "熟悉的舒适区 → 新游戏、新企划与新话题"],
];
const withBaseUrl = (path) => /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:")
  ? path
  : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

function MemberMark({ member, mini = false }) {
  const className = mini ? "mini-mark" : "member-mark";
  return <div className={className}>
    {member.visual ? <img className={`member-visual ${member.visualType ?? "avatar"}`} src={withBaseUrl(member.visual)} alt={`${member.name}的主视觉`} /> : <span className={mini ? "" : "member-initial"}>{member.name.slice(0, 1)}</span>}
  </div>;
}

function RadarChart({ profile, member, chartId }) {
  const [hoveredDimension, setHoveredDimension] = useState(null);
  const pointAt = (index, value, radius = 118) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / RADAR_DIMENSIONS.length);
    const distance = radius * value / 5;
    return [180 + Math.cos(angle) * distance, 180 + Math.sin(angle) * distance];
  };
  const polygon = (values) => RADAR_DIMENSIONS.map(([key], index) => pointAt(index, values[key]).map((value) => value.toFixed(1)).join(",")).join(" ");
  const overlap = RADAR_DIMENSIONS.map(([key, label]) => ({ label, difference: Math.abs(profile.styles[key] - member.style[key]) })).sort((a, b) => a.difference - b.difference).slice(0, 3).map(({ label }) => label).join("、");
  return <section className="radar-section" aria-labelledby={chartId}>
    <div className="radar-heading"><h3 id={chartId}>偏好重叠图</h3><p>外缘越近，偏好越强</p></div>
    <div className="radar-chart-wrap">
      <svg className="radar-chart" viewBox="0 0 360 360" role="img" aria-label={`你的观看偏好与${member.name}的风格维度雷达图对比`}>
        <title>你的偏好与{member.name}的风格维度对比</title>
        {[1, 2, 3, 4, 5].map((level) => <polygon key={level} className="radar-grid" points={polygon(Object.fromEntries(RADAR_DIMENSIONS.map(([key]) => [key, level])))} />)}
        {RADAR_DIMENSIONS.map(([key, label, description], index) => {
          const [x, y] = pointAt(index, 5);
          const [labelX, labelY] = pointAt(index, 5, 148);
          return <g
            key={key}
            className="radar-dimension"
            tabIndex="0"
            role="button"
            aria-label={`${label}维度：${description}`}
            onMouseEnter={() => setHoveredDimension({ label, description })}
            onMouseLeave={() => setHoveredDimension(null)}
            onFocus={() => setHoveredDimension({ label, description })}
            onBlur={() => setHoveredDimension(null)}
            onClick={() => setHoveredDimension({ label, description })}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setHoveredDimension({ label, description });
              }
            }}
          >
            <title>{label}：{description}</title>
            <line className="radar-axis" x1="180" y1="180" x2={x} y2={y} />
            <circle className="radar-label-hitbox" cx={labelX} cy={labelY} r="22" />
            <text className="radar-label" x={labelX} y={labelY} textAnchor={labelX < 155 ? "end" : labelX > 205 ? "start" : "middle"} dominantBaseline="middle">{label}</text>
          </g>;
        })}
        <polygon className="radar-member" points={polygon(member.style)} /><polygon className="radar-user" points={polygon(profile.styles)} />
        {RADAR_DIMENSIONS.map(([key], index) => { const [x, y] = pointAt(index, member.style[key]); return <circle key={`member-${key}`} className="radar-member-point" cx={x} cy={y} r="3.5" />; })}
        {RADAR_DIMENSIONS.map(([key], index) => { const [x, y] = pointAt(index, profile.styles[key]); return <circle key={`user-${key}`} className="radar-user-point" cx={x} cy={y} r="3.5" />; })}
      </svg>
      <div className={`radar-dimension-tip${hoveredDimension ? " visible" : ""}`} aria-live="polite">
        {hoveredDimension && <><strong>{hoveredDimension.label}</strong><span>{hoveredDimension.description}</span></>}
      </div>
    </div>
    <div className="radar-legend"><span><i className="legend-dot user" />你的偏好</span><span><i className="legend-dot member" />{member.name}</span></div>
    <p className="overlap-note">重合最明显：<strong>{overlap}</strong></p>
  </section>;
}

function App() {
  const [screen, setScreen] = useState("home");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const question = questions[index];
  const profile = useMemo(() => buildUserProfile(questions, answers), [answers]);
  const matchCandidates = useMemo(() => {
    const filteredMembers = filterMembersByGenderPreference(members, answers.viewer_gender_preference ?? "all");
    const zhouyi = members.find((member) => member.id === "zhouyi");
    return zhouyi && !filteredMembers.some((member) => member.id === zhouyi.id)
      ? [zhouyi, ...filteredMembers]
      : filteredMembers;
  }, [answers.viewer_gender_preference]);
  const result = useMemo(() => screen === "result" ? getResult(profile, matchCandidates) : null, [screen, profile, matchCandidates]);
  const answer = (optionId) => {
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
    if (index === questions.length - 1) setScreen("result");
    else setIndex((value) => value + 1);
  };
  const restart = () => { setAnswers({}); setIndex(0); setScreen("quiz"); };
  const next = () => { if (!answers[question.id]) return; index === questions.length - 1 ? setScreen("result") : setIndex((value) => value + 1); };
  useEffect(() => {
    const onKeyDown = (event) => { if (screen !== "quiz") return; const number = Number(event.key); if (number >= 1 && number <= question.options.length) answer(question.options[number - 1].id); if (event.key === "Enter") next(); };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  });
  const topbar = <div className="topbar"><button className="brand" onClick={() => setScreen("home")}>VR<span className="brand-dot">•</span>MATCH</button><span className="eyebrow">VirtuaReal preference test</span></div>;
  if (screen === "home") return <><>{topbar}</><section className="hero window"><div className="window-body"><div className="eyebrow">VirtuaReal Project · beta</div><h1>找到与你同频的<br /><em>VirtuaReal 成员</em></h1><p>从你偏爱的直播氛围、内容类型和互动方式出发，看看哪位 VirtuaReal 成员最可能让你持续关注。</p><div className="hero-actions"><button className="primary-button" onClick={restart}>开始测验 <span>→</span></button><a className="github-link" href="https://github.com/Xinrea/vr-match" target="_blank" rel="noreferrer">GitHub：Xinrea/vr-match ↗</a></div><p className="home-footnote">25 道题 · 约 4 分钟 · 结果仅供探索，不代表官方推荐</p></div><div className="orb-stage" aria-hidden="true"><div className="orbit one" /><div className="orbit two" /><div className="orb" /><div className="orb-core">YOUR<br />SIGNAL</div><i className="star a" /><i className="star b" /><i className="star c" /></div></section></>;
  if (screen === "quiz") return <><>{topbar}</><section className="quiz-layout"><div className="progress-meta"><span>QUESTION {String(index + 1).padStart(2, "0")}</span><span>{index + 1} / {questions.length}</span></div><div className="progress-track"><div className="progress-value" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><article className="question-card window"><div className="window-body"><div className="eyebrow">{question.dimension.replaceAll("_", " · ")}</div><h1>{question.prompt}</h1><div className="option-list" role="group" aria-label="回答选项">{question.options.map((option, optionIndex) => <button key={option.id} className="option" onClick={() => answer(option.id)} aria-pressed={answers[question.id] === option.id}><span>{option.label}</span><span className="option-key">{optionIndex + 1}</span></button>)}</div><div className="quiz-actions"><button className="text-button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>← 上一题</button><button className="primary-button" disabled={!answers[question.id]} onClick={next}>{index === questions.length - 1 ? "查看结果" : "下一题 →"}</button></div></div></article></section></>;
  const { ranking } = result;
  const zhouyiMatch = ranking.find(({ member: candidate }) => candidate.id === "zhouyi");
  const displayedMatches = zhouyiMatch
    ? [zhouyiMatch, ...ranking.filter(({ member: candidate }) => candidate.id !== "zhouyi").slice(0, 2)]
    : ranking.slice(0, 3);
  const tierForScore = (score) => score >= 82 ? "非常契合" : score >= 68 ? "很可能喜欢" : "值得一试";
  return <>
    {topbar}
    <section className="result-layout">
      <header className="result-intro">
        <div className="eyebrow">your viewing signal</div>
        <h1>与你同频的三位成员</h1>
        <p>以下三位成员与你的观看偏好最为同频。每张图都展示了你与对应成员的风格重合程度。</p>
      </header>
      <div className="result-grid">
        {displayedMatches.map((match, matchIndex) => {
          const { member, reasons, score } = match;
          const displayedReasons = reasons.length ? reasons : ["你们在整体观看氛围上有不少相近之处"];
          return <article className={`result-card${member.id === "zhouyi" ? " featured-result" : ""}`} key={member.id}>
            <div className="result-card-title"><span>{`MATCH 0${matchIndex + 1}`}</span><span>{score} SIGNAL</span></div>
            <div className="result-member">
              <MemberMark member={member} />
              <div className="result-copy">
                <span className="result-tier">{tierForScore(score)}</span>
                <h2>{member.name}</h2>
                <p className="archetype">{member.archetype}</p>
              </div>
            </div>
            <RadarChart profile={profile} member={member} chartId={`radar-title-${member.id}`} />
            <ul className="result-reasons">{displayedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            {member.bilibiliUid && <a className="bilibili-link" href={`https://space.bilibili.com/${member.bilibiliUid}`} target="_blank" rel="noreferrer">前往 B 站主页 ↗</a>}
          </article>;
        })}
      </div>
      <div className="result-actions">
        <button className="primary-button" onClick={restart}>再测一次</button>
      </div>
      <p className="disclaimer">本测验为非官方兴趣探索工具。匹配依据为公开资料整理出的内容与观看体验向量，不代表成员本人真实人格，也不构成官方推荐。</p>
    </section>
  </>;
}

createRoot(document.querySelector("#app")).render(<StrictMode><App /></StrictMode>);
