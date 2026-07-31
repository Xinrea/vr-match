import assert from "node:assert/strict";
import questionsData from "../data/quiz-questions.json" with { type: "json" };
import membersData from "../data/virtuareal-member-vectors.json" with { type: "json" };
import { buildUserProfile, getResult, rankMembers } from "../src/match-engine.mjs";

const quietMusicAnswers = {
  energy_after_work: "soft",
  host_relationship: "stage",
  surprise_tolerance: "keep_plan",
  setting_preference: "daily",
  watching_rhythm: "deep_dive",
  music: "core",
  gaming: "not_for_me",
  chat: "not_for_me",
  variety: "solo",
  knowledge: "deep_topic",
  first_click: "beautiful_voice"
};

const livelyGameAnswers = {
  energy_after_work: "lively",
  host_relationship: "companion",
  surprise_tolerance: "let_it_happen",
  setting_preference: "seasoning",
  watching_rhythm: "adventure",
  music: "rarely",
  gaming: "challenge",
  chat: "late_night",
  variety: "more_is_more",
  knowledge: "not_needed",
  first_click: "hard_game"
};

const quietMusicProfile = buildUserProfile(questionsData.questions, quietMusicAnswers);
const livelyGameProfile = buildUserProfile(questionsData.questions, livelyGameAnswers);

assert.equal(quietMusicProfile.styles.energy, 1);
assert.equal(quietMusicProfile.content.music, 5);
assert.equal(quietMusicProfile.content.gaming, 0);
assert.equal(livelyGameProfile.styles.energy, 4);
assert.equal(livelyGameProfile.content.gaming, 5);
assert.equal(livelyGameProfile.content.variety, 5);

const musicResult = getResult(quietMusicProfile, membersData.members);
const gameResult = getResult(livelyGameProfile, membersData.members);

assert.equal(musicResult.primary.member.name, "阿萨Aza");
assert.ok(["七海", "桃濑雪绘"].includes(gameResult.primary.member.name));
assert.equal(rankMembers(livelyGameProfile, membersData.members).length, membersData.members.length);
assert.ok(musicResult.primary.reasons.length > 0);

console.log("match-engine tests passed");
