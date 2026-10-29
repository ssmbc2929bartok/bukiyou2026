/*
 * ミニゲームの設定と点数の付け方（docs/games.md）
 *
 *   enabled : false にすると出なくなる（間に合わない・不具合があるとき）
 *   minTier : 何の難易度から出すか（0 初級 / 1 中級 / 2 上級）
 *   time    : 制限時間（秒）。[初級, 中級, 上級]
 *   needs   : 'tilt' … スマホの傾きが必要
 *   metrics : 軸に入れる値
 *     axis : { 軸id: 重み }。値が“ふつう”より大きいほど、重みの向きにその軸が強くなる
 *     base : 難易度ごとの“ふつう”の値 [平均, ばらつき(標準偏差)]。10月は手で決めた仮の値
 *   ここにない値も、生の値としてスプレッドシートに残す。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.tiers = [
    { id: 0, label: 'しょきゅう' },
    { id: 1, label: 'ちゅうきゅう' },
    { id: 2, label: 'じょうきゅう' },
  ];

  // 年れい → 難易度（ひみつは中級）
  BKF.tierOf = function (age) {
    if (age === '3' || age === '4' || age === '5') return 0;
    if (age === '9' || age === '10' || age === '11+') return 2;
    return 1;
  };

  function same(mean, sd) {
    return [[mean, sd], [mean, sd], [mean, sd]];
  }

  BKF.gameDefs = {
    screw: {
      title: 'ねじしめ', company: '大豊製作所', icon: '🔩',
      howto: 'レンチが ねじの うえに きたら タップ！',
      enabled: true, minTier: 0, time: [20, 20, 20],
      metrics: {
        offset: { axis: { careful: -2 }, base: [[0.3, 0.15], [0.25, 0.12], [0.22, 0.1]] },
        early: { axis: { challenge: 2 }, base: same(1.5, 1.5) },
      },
    },
    crossword: {
      title: 'クロスワード', company: '不器用ファクトリー', icon: '🔤',
      howto: 'マスを えらんで、したの もじで うめよう！',
      enabled: true, minTier: 1, time: [45, 45, 60],
      metrics: {
        correct: { axis: { logic: 2 }, base: [[0.6, 0.3], [0.6, 0.3], [0.6, 0.3]] },
        sec: { axis: { logic: -1 }, base: [[40, 8], [40, 8], [55, 8]] },
      },
    },
    memory: {
      title: 'えあわせ', company: '枚方市', icon: '🃏',
      howto: 'おぼえて、おなじ えを 2まい そろえよう！',
      enabled: true, minTier: 0, time: [30, 30, 30],
      metrics: {
        misses: { axis: { careful: -2 }, base: [[2, 2], [3, 2.5], [5, 3]] },
      },
    },
    trace: {
      title: 'せんを なぞろう', company: 'IFA住宅設計室', icon: '✏️',
      howto: 'おてほんの せんを ゆびで なぞろう！',
      enabled: true, minTier: 0, time: [20, 20, 20],
      metrics: {
        dev: { axis: { craft: -2 }, base: [[0.8, 0.4], [0.7, 0.35], [0.7, 0.35]] },
        cover: { axis: { careful: 1 }, base: [[0.7, 0.25], [0.8, 0.2], [0.8, 0.2]] },
      },
    },
    paint: {
      title: 'ぬりえ', company: 'ダイコロ', icon: '🎨',
      howto: 'おてほんと おなじ いろで ぬろう！',
      enabled: true, minTier: 0, time: [30, 30, 30],
      metrics: {
        outside: { axis: { careful: -2 }, base: [[0.2, 0.12], [0.15, 0.1], [0.12, 0.08]] },
        thin: { axis: { idea: 2 }, base: [[0.2, 0.3], [0.3, 0.35], [0.35, 0.35]] },
        match: { axis: { design: 2 }, base: [[0.4, 0.3], [0.5, 0.3], [0.5, 0.3]] },
      },
    },
    cream: {
      title: 'クリームづくり', company: '香椎化学工業', icon: '🧴',
      howto: 'おてほんと おなじ いろの クリームを つくろう！',
      enabled: true, minTier: 0, time: [30, 30, 30],
      metrics: {
        first: { axis: { idea: 2 }, base: [[0.4, 0.3], [0.35, 0.3], [0.3, 0.3]] },
        tries: { axis: { challenge: 1 }, base: [[2, 1], [2.5, 1.2], [3, 1.5]] },
      },
    },
    heat: {
      title: 'おんどキープ', company: '朝日熱処理工業', icon: '🔥',
      howto: 'ハンドルを まわして、みどりの ところに たもとう！',
      enabled: true, minTier: 0, time: [15, 15, 15],
      metrics: {
        zone: { axis: { steady: 2 }, base: [[0.5, 0.25], [0.45, 0.25], [0.4, 0.25]] },
        over: { axis: { careful: -1 }, base: same(1, 1) },
      },
    },
    circuit: {
      title: 'かいろを つなごう', company: 'ノボル電機', icon: '🔌',
      howto: 'おなじ いろの てんを つなごう！ せんは まじわれないよ',
      enabled: true, minTier: 0, time: [30, 30, 30],
      metrics: {
        redraws: { axis: { challenge: 2, logic: -1 }, base: [[1, 1.5], [2, 2], [3, 2.5]] },
        solved: { axis: { logic: 2 }, base: [[0.7, 0.4], [0.5, 0.45], [0.4, 0.45]] },
      },
    },
    stone: {
      title: 'いしわり', company: '大阪石材工業', icon: '🪨',
      howto: 'いしを たくさん たたいて わろう！',
      enabled: true, minTier: 0, time: [15, 15, 15],
      metrics: {
        rate: { axis: { active: 2 }, base: [[3, 1.5], [4.5, 1.5], [5.5, 1.5]] },
      },
    },
    ball: {
      title: 'ボールころがし', company: 'サンエス工業', icon: '⚪',
      howto: 'スマホを たての まま ひだり・みぎに かたむけて、ボールを ゴールまで はこぼう！',
      enabled: true, minTier: 0, time: [30, 30, 30], needs: 'tilt',
      metrics: {
        hiddenFails: { axis: { logic: -2 }, base: [[1, 1], [1.5, 1.2], [2, 1.5]] },
        walls: { axis: { careful: -1 }, base: same(3, 3) },
      },
    },
    robot: {
      title: 'ロボットを うごかそう', company: '大阪工業大学', icon: '🤖',
      howto: 'やじるしを ならべて、ロボットを ゴールまで うごかそう！',
      enabled: true, minTier: 0, time: [30, 30, 45],
      metrics: {
        retries: { axis: { logic: -2 }, base: [[1, 1.2], [1.5, 1.5], [2, 1.5]] },
        step: { axis: { challenge: 1, logic: -1 }, base: same(0.3, 0.4) },
        first: { axis: { leader: -1 }, base: [[8, 5], [10, 5], [12, 6]] },
      },
    },
    jump: {
      title: 'みんなで ジャンプ', company: '枚方信用金庫', icon: '🦘',
      howto: '「ジャンプ！」で みんなと いっしょに ボタンを おそう！',
      enabled: true, minTier: 0, time: [20, 20, 20],
      metrics: {
        sync: { axis: { social: -1 }, base: same(300, 150) },
        waited: { axis: { social: 2 }, base: same(0.5, 0.5) },
      },
    },
    bounce: {
      title: 'ケースを まもれ', company: 'アクテック', icon: '🧰',
      howto: 'とんでくる どうぐを タップして はねかえそう！',
      enabled: true, minTier: 0, time: [30, 30, 30],
      metrics: {
        survive: { axis: { steady: 2 }, base: [[20, 8], [18, 8], [15, 8]] },
        decline: { axis: { steady: -1 }, base: same(0.1, 0.25) },
        empty: { axis: { challenge: 1 }, base: same(3, 3) },
      },
    },
  };

  /*
   * ゲームの結果を12軸のベクトルにする
   *   z = (値 − ふつう) / ばらつき を −1.5〜+1.5 に収めて 1.5 で割る（−1〜+1）
   *   軸には z × 重み を足す。値が null のものは足さない
   */
  BKF.gameScore = function (id, tier, metrics) {
    const def = BKF.gameDefs[id];
    const out = BKF.axes.map(function () { return 0; });
    if (!def || !metrics) return out;
    Object.keys(def.metrics).forEach(function (key) {
      const v = metrics[key];
      if (v === null || v === undefined || !isFinite(v)) return;
      const m = def.metrics[key];
      const base = m.base[tier] || m.base[1];
      const z = Math.max(-1.5, Math.min(1.5, (v - base[0]) / base[1])) / 1.5;
      BKF.axes.forEach(function (axis, i) {
        if (m.axis[axis.id]) out[i] += z * m.axis[axis.id];
      });
    });
    return out;
  };

  // この難易度で遊べるゲームの id
  BKF.playableGames = function (tier, opts) {
    const exclude = (opts && opts.exclude) || [];
    return Object.keys(BKF.gameDefs).filter(function (id) {
      const def = BKF.gameDefs[id];
      return def.enabled && tier >= def.minTier && exclude.indexOf(id) === -1;
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
