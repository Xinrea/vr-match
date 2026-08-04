/**
 * Pure matching functions for the VirtuaReal quiz.
 * Inputs are plain JSON, so this module can run in a browser or in Node.
 */

export const STYLE_DEFAULT = 3;
export const CONTENT_DEFAULT = 2;
export const STYLE_WEIGHTS = { energy: 1.25, warmth: 1, chaos: 1, structure: 1, intimacy: 1.25, roleplay: 1, focus: 1, novelty: 1 };
export const CONTENT_BASE_WEIGHTS = { music: 1.25, gaming: 1.25, chat: 1.25, variety: 1, knowledge: 1 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const average = (values, fallback) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

/**
 * Converts answers into a viewer-preference vector.
 * `answers` is an object in the form { questionId: optionId }.
 */
export function buildUserProfile(questions, answers) {
  const styleValues = {};
  const contentDeltas = {};
  const contentOverrides = {};
  const answered = [];

  for (const question of questions) {
    const option = question.options.find((item) => item.id === answers[question.id]);
    if (!option) continue;
    answered.push(question.id);
    for (const [dimension, value] of Object.entries(option.effects.styles ?? {})) {
      (styleValues[dimension] ??= []).push(value);
    }
    for (const [dimension, value] of Object.entries(option.effects.contentDeltas ?? {})) {
      contentDeltas[dimension] = (contentDeltas[dimension] ?? 0) + value;
    }
    for (const [dimension, value] of Object.entries(option.effects.contentOverrides ?? {})) {
      contentOverrides[dimension] = value;
    }
  }

  const styles = Object.fromEntries(Object.keys(STYLE_WEIGHTS).map((dimension) => [
    dimension,
    Number(average(styleValues[dimension] ?? [], STYLE_DEFAULT).toFixed(2))
  ]));
  const content = Object.fromEntries(Object.keys(CONTENT_BASE_WEIGHTS).map((dimension) => [
    dimension,
    contentOverrides[dimension] ?? clamp(CONTENT_DEFAULT + (contentDeltas[dimension] ?? 0), 0, 5)
  ]));

  return { styles, content, answeredQuestionIds: answered };
}

export function contentWeight(preference) {
  if (preference <= 1) return 2;
  if (preference === 2) return 0.5;
  if (preference >= 5) return 2;
  return 1;
}

function weightedDistance(profile, member) {
  let distance = 0;
  let maximum = 0;
  const parts = [];

  for (const [dimension, baseWeight] of Object.entries(STYLE_WEIGHTS)) {
    const weight = baseWeight;
    const difference = Math.abs(profile.styles[dimension] - member.style[dimension]);
    distance += difference * weight * 0.65;
    maximum += 4 * weight * 0.65;
    parts.push({ type: "style", dimension, difference, weight, similarity: 1 - difference / 4 });
  }

  for (const [dimension, baseWeight] of Object.entries(CONTENT_BASE_WEIGHTS)) {
    const weight = baseWeight * contentWeight(profile.content[dimension]);
    const difference = Math.abs(profile.content[dimension] - member.content[dimension]);
    distance += difference * weight * 0.35;
    maximum += 5 * weight * 0.35;
    parts.push({ type: "content", dimension, difference, weight, similarity: 1 - difference / 5 });
  }

  return { distance, maximum, parts };
}

const STYLE_REASON = {
  energy: "你偏好的直播能量和她很接近",
  warmth: "你看重的情绪温度与陪伴感相符",
  chaos: "你对节目效果与意外感的接受度相近",
  structure: "你喜欢的直播节奏和内容结构相近",
  intimacy: "你期待的互动距离感很匹配",
  roleplay: "你对角色设定与世界观的偏好相符",
  focus: "你偏好的内容专注深度相近",
  novelty: "你对探索新内容的期待相近"
};

const CONTENT_REASON = {
  music: "音乐内容是你们之间的强连接点",
  gaming: "游戏内容是你们之间的强连接点",
  chat: "杂谈与陪伴感是你们之间的强连接点",
  variety: "联动、企划和整活内容很对你的胃口",
  knowledge: "主题讨论与思考型内容很对你的胃口"
};

export function explainMatch(parts, profile, limit = 3) {
  return parts
    .filter((part) => part.similarity >= 0.65 && (part.type === "style" || profile.content[part.dimension] >= 3))
    .sort((left, right) => (right.similarity * right.weight) - (left.similarity * left.weight))
    .slice(0, limit)
    .map((part) => part.type === "style" ? STYLE_REASON[part.dimension] : CONTENT_REASON[part.dimension]);
}

/** Returns ranked candidates. The `score` is a UI affinity index, not a scientific percentage. */
export function rankMembers(profile, members) {
  return members
    .map((member) => {
      const { distance, maximum, parts } = weightedDistance(profile, member);
      const score = Math.round((1 - distance / maximum) * 100);
      return {
        member,
        score: clamp(score, 0, 100),
        reasons: explainMatch(parts, profile),
        distance: Number(distance.toFixed(3))
      };
    })
    .sort((left, right) => right.score - left.score || left.distance - right.distance || left.member.name.localeCompare(right.member.name, "zh-CN"));
}

/** Narrows the candidate pool without changing the viewer's scoring vector. */
export function filterMembersByGenderPreference(members, preference) {
  if (preference !== "male" && preference !== "female") return members;
  return members.filter((member) => member.gender === preference);
}

export function getResult(profile, members) {
  const ranking = rankMembers(profile, members);
  const primary = ranking[0] ?? null;
  const alternatives = ranking.slice(1, 3);
  const tier = !primary ? null : primary.score >= 82 ? "非常契合" : primary.score >= 68 ? "很可能喜欢" : "值得一试";
  return { primary, alternatives, tier, ranking };
}
