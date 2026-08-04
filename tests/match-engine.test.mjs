import assert from "node:assert/strict";
import questionsData from "../data/quiz-questions.json" with { type: "json" };
import membersData from "../data/virtuareal-member-vectors.json" with { type: "json" };
import additionalMembersData from "../data/additional-active-members.json" with { type: "json" };
import activeRosterData from "../data/active-member-roster.json" with { type: "json" };
import { buildUserProfile, filterMembersByGenderPreference, getResult, rankMembers } from "../src/match-engine.mjs";

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
const allMemberProfiles = [...membersData.members, ...additionalMembersData.members];
const profileById = new Map(allMemberProfiles.map((member) => [member.id, member]));
const members = activeRosterData.members.map((rosterMember) => ({ ...profileById.get(rosterMember.id), ...rosterMember }));

assert.equal(activeRosterData.members.length, 52);
assert.equal(questionsData.questions.length, 25);
assert.equal(questionsData.questions[0].id, "viewer_gender_preference");
assert.equal(new Set(activeRosterData.members.map((member) => member.id)).size, 52);
assert.deepEqual(activeRosterData.members.filter(({ id }) => !profileById.has(id)), []);
assert.deepEqual(allMemberProfiles.filter(({ id }) => !activeRosterData.members.some((member) => member.id === id)), []);
for (const rosterMember of activeRosterData.members) {
  assert.equal(profileById.get(rosterMember.id).generation, rosterMember.generation, `${rosterMember.name} generation mismatch`);
  assert.ok(["male", "female"].includes(rosterMember.gender), `${rosterMember.name} gender is missing or invalid`);
}

const defaultProfile = buildUserProfile(questionsData.questions, {});
const filteredQuestionProfile = buildUserProfile(questionsData.questions, { viewer_gender_preference: "male" });
assert.deepEqual(filteredQuestionProfile.styles, defaultProfile.styles);
assert.deepEqual(filteredQuestionProfile.content, defaultProfile.content);
assert.ok(filteredQuestionProfile.answeredQuestionIds.includes("viewer_gender_preference"));

const maleMembers = filterMembersByGenderPreference(members, "male");
const femaleMembers = filterMembersByGenderPreference(members, "female");
assert.ok(maleMembers.length >= 3);
assert.ok(femaleMembers.length >= 3);
assert.ok(maleMembers.every((member) => member.gender === "male"));
assert.ok(femaleMembers.every((member) => member.gender === "female"));
assert.equal(filterMembersByGenderPreference(members, "all").length, members.length);
assert.equal(filterMembersByGenderPreference(members, undefined).length, members.length);
assert.ok(getResult(livelyGameProfile, maleMembers).ranking.every(({ member }) => member.gender === "male"));
assert.ok(getResult(livelyGameProfile, femaleMembers).ranking.every(({ member }) => member.gender === "female"));
const zhouyi = members.find((member) => member.id === "zhouyi");
const maleCandidatesWithPinnedZhouyi = [zhouyi, ...maleMembers];
const maleRankingWithPinnedZhouyi = getResult(livelyGameProfile, maleCandidatesWithPinnedZhouyi).ranking;
assert.ok(maleRankingWithPinnedZhouyi.some(({ member }) => member.id === "zhouyi"));
assert.ok(maleRankingWithPinnedZhouyi.filter(({ member }) => member.id !== "zhouyi").every(({ member }) => member.gender === "male"));

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
