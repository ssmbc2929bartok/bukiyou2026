/*
 * 判定のかたよりを調べるシミュレーション
 *   node tools/simulate.js [人数=100000] [「どれでもない」を選ぶ確率=0.1]
 *
 * 1. ランダムに回答したとき、各企業・各タイプが何%出るか（条件 A / B ごと）
 *    ミニゲームの値は、js/data/games.js の“ふつう”の値のまわりにランダムに作る
 * 2. 各企業について「その企業になれる回答」があるか（質問だけで、なりやすい選択肢を順に選んで確かめる）
 * 質問数が多いと全パターンの総当たりはできないので、ランダムに回答を作って調べる。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = [
  'js/config.js',
  'js/data/axes.js',
  'js/data/questions.js',
  'js/data/types.js',
  'js/data/companies.js',
  'js/data/games.js',
  'js/diagnosis.js',
];
files.forEach(function (f) {
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  vm.runInThisContext(code, { filename: f });
});

const BKF = globalThis.BKF;
const D = BKF.diagnosis;
const N = Number(process.argv[2]) || 100000;
const NONE_RATE = process.argv[3] !== undefined ? Number(process.argv[3]) : 0.1;
const questions = D.activeQuestions();
const companies = D.activeCompanies();

// 標準正規分布の乱数
function gauss() {
  return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

// 条件に合わせてゲームを選び、値をランダムに作る
function randomGames(condition, tier) {
  const n = BKF.config.gameConditions[condition].after.length;
  const ids = BKF.playableGames(tier).sort(function () { return Math.random() - 0.5; }).slice(0, n);
  return ids.map(function (id) {
    const metrics = {};
    Object.keys(BKF.gameDefs[id].metrics).forEach(function (k) {
      const base = BKF.gameDefs[id].metrics[k].base[tier];
      metrics[k] = Math.max(0, base[0] + base[1] * gauss());
    });
    return { id: id, tier: tier, metrics: metrics, skipped: false };
  });
}

function randomAnswers() {
  const answers = {};
  questions.forEach(function (q) {
    answers[q.id] = Math.random() < NONE_RATE ? 0 : 1 + Math.floor(Math.random() * q.choices.length);
  });
  return answers;
}

// 全角を2文字分として右を空白でそろえる
function pad(text, width) {
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) < 0x100 ? 1 : 2;
  return text + ' '.repeat(Math.max(1, width - w));
}

function bar(rate) {
  return '#'.repeat(Math.round(rate * 200));
}

function report(title, items, counts) {
  console.log('\n■ ' + title);
  const expected = 1 / items.length;
  items.forEach(function (it) {
    const rate = (counts[it.id] || 0) / N;
    const flag = rate < expected * 0.4 ? '  ← 少ない' : rate > expected * 2 ? '  ← 多い' : '';
    const label = pad(it.short || it.name, 30);
    console.log(label + (rate * 100).toFixed(1).padStart(5) + '%  ' + bar(rate) + flag);
  });
}

let fallbackCount = 0;
let fewReasonCount = 0;
console.log('質問 ' + questions.length + '問 / 企業 ' + companies.length + '社 / タイプ ' + BKF.types.length + '種');
console.log('ランダム回答 ' + N + '人ずつ（どれでもない ' + NONE_RATE * 100 + '%、難易度はランダム）');
['A', 'B'].forEach(function (condition) {
  const companyCounts = {};
  const typeCounts = {};
  for (let n = 0; n < N; n++) {
    const tier = Math.floor(Math.random() * 3);
    const r = D.diagnose(randomAnswers(), randomGames(condition, tier));
    if (r.reasons.length < 2) fewReasonCount++;
    companyCounts[r.company.id] = (companyCounts[r.company.id] || 0) + 1;
    typeCounts[r.type.id] = (typeCounts[r.type.id] || 0) + 1;
    if (r.fallback) fallbackCount++;
  }
  const games = BKF.config.gameConditions[condition].after.length;
  report('条件' + condition + '（ゲーム' + games + 'つ）の企業（均等なら ' + (100 / companies.length).toFixed(1) + '%）', companies, companyCounts);
  report('条件' + condition + '（ゲーム' + games + 'つ）の性格タイプ（均等なら ' + (100 / BKF.types.length).toFixed(1) + '%）', BKF.types, typeCounts);
});
console.log('');
console.log('u が 0 になって予備の判定を使った回数: ' + fallbackCount);
console.log('「にている ところ」が1つ以下になった割合: ' + (fewReasonCount / N / 2 * 100).toFixed(1) + '%');

// その企業（タイプ）とのコサイン類似度が上がる選択肢を、質問ごとに選び直していく
function bestAnswersFor(target, items) {
  const targets = D.center(items.map(function (it) { return D.toVector(it.vector); }));
  const t = targets[items.indexOf(target)];
  const answers = {};
  questions.forEach(function (q) { answers[q.id] = 0; });
  for (let round = 0; round < 5; round++) {
    questions.forEach(function (q) {
      let best = answers[q.id];
      let bestScore = -Infinity;
      for (let j = 0; j <= q.choices.length; j++) {
        answers[q.id] = j;
        const score = D.cosine(D.userVector(answers).centered, t);
        if (score > bestScore + 1e-12) { bestScore = score; best = j; }
      }
      answers[q.id] = best;
    });
  }
  return answers;
}

function reachability(title, items, key) {
  console.log('\n■ ' + title);
  let ok = true;
  items.forEach(function (it) {
    const r = D.diagnose(bestAnswersFor(it, items));
    const top = r[key];
    const hit = top.id === it.id;
    if (!hit) ok = false;
    console.log(pad(it.short || it.name, 30) + (hit ? '○ なれる' : '× なれない（' + (top.short || top.name) + ' になる）'));
  });
  return ok;
}

const okCompanies = reachability('その企業になれる回答があるか（質問だけで）', companies, 'company');
const okTypes = reachability('そのタイプになれる回答があるか（質問だけで）', BKF.types, 'type');
if (!okCompanies || !okTypes) process.exitCode = 1;
