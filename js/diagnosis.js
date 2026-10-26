/*
 * F-002 診断結果演算機能（線形モデル + コサイン類似度）
 *
 *   u = Σ w'_ij            … 質問 i で選択肢 j を選んだときの効果ベクトルを足していく
 *     + Σ g_k              … ミニゲーム k の結果を軸に直したもの（js/data/games.js の gameScore）
 *   cos(u, t_k) = u·t_k / (|u||t_k|)
 *   いちばん cos が大きい性格タイプ・企業を結果にする
 *
 * 判定がかたよらないための工夫（16回ミーティング「設計上の注意点」）
 *   - 選択肢の効果ベクトルは、質問ごとに選択肢の平均を引いておく（w'_ij = w_ij - 平均）。
 *     どの選択肢にも同じように入っている成分は、どれを選んでも変わらないので打ち消す。
 *     「どれでもない」は 0 のまま。
 *   - 企業・タイプのベクトルも、並べたもの同士の平均を引いてから比べる。
 *     全部が同じ方向に寄っていると、特定の企業ばかり出てしまうため。
 *   - u がほぼ 0（ほとんど「どれでもない」など）のときは、平均を引く前の合計で判定する。
 *     それも 0 のときはランダムに選び、fallback として記録する。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};
  const EPS = 1e-9;

  function axisIds() {
    return BKF.axes.map(function (a) { return a.id; });
  }

  // { craft: 2, steady: 1 } → [0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0]
  function toVector(obj) {
    return axisIds().map(function (id) { return (obj && obj[id]) || 0; });
  }

  function zeros() {
    return axisIds().map(function () { return 0; });
  }

  function add(a, b) {
    return a.map(function (x, i) { return x + b[i]; });
  }

  function sub(a, b) {
    return a.map(function (x, i) { return x - b[i]; });
  }

  function scale(a, k) {
    return a.map(function (x) { return x * k; });
  }

  function dot(a, b) {
    return a.reduce(function (s, x, i) { return s + x * b[i]; }, 0);
  }

  function norm(a) {
    return Math.sqrt(dot(a, a));
  }

  function cosine(a, b) {
    const na = norm(a);
    const nb = norm(b);
    if (na < EPS || nb < EPS) return 0;
    return dot(a, b) / (na * nb);
  }

  function mean(vectors) {
    if (vectors.length === 0) return zeros();
    return scale(vectors.reduce(add, zeros()), 1 / vectors.length);
  }

  // 並べたベクトル同士の平均を引く
  function center(vectors) {
    const m = mean(vectors);
    return vectors.map(function (v) { return sub(v, m); });
  }

  // 出題する質問を config.questionIds の順に並べる
  function activeQuestions() {
    const byId = {};
    BKF.questions.forEach(function (q) { byId[q.id] = q; });
    return BKF.config.questionIds.map(function (id) {
      if (!byId[id]) throw new Error('質問 ' + id + ' が js/data/questions.js にありません');
      return byId[id];
    });
  }

  // この回に出す企業（config.companyIds が空なら全社）
  function activeCompanies() {
    const ids = BKF.config.companyIds;
    if (!ids || ids.length === 0) return BKF.companies.slice();
    const byId = {};
    BKF.companies.forEach(function (c) { byId[c.id] = c; });
    return ids.map(function (id) {
      if (!byId[id]) throw new Error('企業 ' + id + ' が js/data/companies.js にありません');
      return byId[id];
    });
  }

  // 質問ごとに、選択肢の効果ベクトル（生の値と、平均を引いた値）を作る
  function choiceVectors(question) {
    const raw = question.choices.map(function (c) { return toVector(c.w); });
    return { raw: raw, centered: center(raw) };
  }

  /*
   * answers: { q01: 2, q02: 0, ... }  … 1 始まりの選択肢番号。0 は「どれでもない」
   * 戻り値: { centered, raw } … 回答者ベクトル u
   */
  function userVector(answers) {
    let centered = zeros();
    let raw = zeros();
    activeQuestions().forEach(function (q) {
      const j = answers[q.id];
      if (!j) return;
      const vs = choiceVectors(q);
      centered = add(centered, vs.centered[j - 1]);
      raw = add(raw, vs.raw[j - 1]);
    });
    return { centered: centered, raw: raw };
  }

  // items を u とのコサイン類似度の高い順に並べる。同点はランダム
  function rank(u, items) {
    const targets = center(items.map(function (it) { return toVector(it.vector); }));
    return items
      .map(function (it, i) {
        return { item: it, score: cosine(u, targets[i]), target: targets[i], tie: Math.random() };
      })
      .sort(function (a, b) {
        if (Math.abs(b.score - a.score) > EPS) return b.score - a.score;
        return a.tie - b.tie;
      });
  }

  /*
   * 「にている ところ」：u と企業ベクトルの両方で強い軸。
   * 正規化したベクトルの成分の積が大きい順に返す。
   * 両方マイナス（どちらも弱い）でも積はプラスになるので、両方プラスの軸だけにする。
   */
  function reasons(u, target, count) {
    const nu = norm(u);
    const nt = norm(target);
    if (nu < EPS || nt < EPS) return [];
    return BKF.axes
      .map(function (axis, i) {
        return { axis: axis, value: (u[i] / nu) * (target[i] / nt), positive: u[i] > EPS && target[i] > EPS };
      })
      .filter(function (r) { return r.positive; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, count);
  }

  /*
   * ミニゲームの結果を足したベクトル（js/data/games.js の gameScore）
   * games: [{ id, tier, metrics, skipped }] … とばしたゲームは足さない
   */
  function gameVector(games) {
    let v = zeros();
    (games || []).forEach(function (g) {
      if (g.skipped || !BKF.gameScore) return;
      v = add(v, BKF.gameScore(g.id, g.tier, g.metrics));
    });
    return v;
  }

  function diagnose(answers, games) {
    const uv = userVector(answers);
    const gv = gameVector(games);
    let u = add(uv.centered, gv);
    let fallback = '';
    if (norm(u) < EPS) {
      u = add(uv.raw, gv);
      fallback = 'raw';
    }
    if (norm(u) < EPS) {
      fallback = 'random';
    }

    const types = rank(u, BKF.types);
    const companies = rank(u, activeCompanies());
    return {
      vector: u,
      type: types[0].item,
      typeRanking: types,
      company: companies[0].item,
      companyRanking: companies,
      reasons: reasons(u, companies[0].target, BKF.config.reasonCount),
      fallback: fallback,
    };
  }

  BKF.diagnosis = {
    axisIds: axisIds,
    toVector: toVector,
    cosine: cosine,
    norm: norm,
    center: center,
    activeQuestions: activeQuestions,
    activeCompanies: activeCompanies,
    userVector: userVector,
    gameVector: gameVector,
    rank: rank,
    reasons: reasons,
    diagnose: diagnose,
  };
})(typeof window !== 'undefined' ? window : globalThis);
