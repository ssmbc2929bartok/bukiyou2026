/*
 * ミニゲームの動く遊び方（js/games/howto.js で動かす）
 * 場面の座標は 横0〜100・縦0〜100（場面は 横2:縦1）。offset は 1回分の長さ（dur ミリ秒）を 0〜1 で表す。
 * ボール転がしは、スマホを傾ける説明（js/games/ball.js の demo）を使うので、ここにはない。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  // at のときに見えるようにする（end があれば、end で消える）
  function appear(at, end) {
    const kf = [
      { offset: 0, opacity: 0 },
      { offset: at, opacity: 0 },
      { offset: Math.min(1, at + 0.03), opacity: 1 },
    ];
    if (end !== undefined) {
      kf.push({ offset: end, opacity: 1 });
      kf.push({ offset: Math.min(1, end + 0.03), opacity: 0 });
    }
    kf.push({ offset: 1, opacity: end !== undefined ? 0 : 1 });
    return kf;
  }

  // [[x, y, offset], ...] の順に動かす
  function move(points, extra) {
    return points.map(function (p) {
      return Object.assign({ offset: p[2], left: p[0] + '%', top: p[1] + '%' }, extra ? extra(p) : {});
    });
  }

  // at のときに、ぽんと はずむ（当たり・そろった など）
  function bump(at) {
    return [
      { offset: 0, transform: 'scale(1)' },
      { offset: at, transform: 'scale(1)' },
      { offset: Math.min(1, at + 0.05), transform: 'scale(1.3)' },
      { offset: Math.min(1, at + 0.1), transform: 'scale(1)' },
      { offset: 1, transform: 'scale(1)' },
    ];
  }

  // at のときに、背景の色を変える（えらんだ・ぬった など）
  function paintAt(at, from, to, prop) {
    const k = prop || 'background';
    const a = {}; a[k] = from;
    const b = {}; b[k] = to;
    return [
      Object.assign({ offset: 0 }, a),
      Object.assign({ offset: at }, a),
      Object.assign({ offset: Math.min(1, at + 0.02) }, b),
      Object.assign({ offset: 1 }, b),
    ];
  }

  BKF.howtoCards = {
    screw: [
      {
        caption: 'まうえで タップすると しまる',
        dur: 3600,
        parts: [
          { html: '', cls: 'hd-plate wood', x: 50, y: 74 },
          { html: '', cls: 'hd-screw', x: 25, y: 74 },
          // 締まると、ゲームと同じく 2回転と90度まわって 緑になる
          { html: '', cls: 'hd-screw', x: 50, y: 74, kf: [
            { offset: 0, transform: 'rotate(0deg)', boxShadow: '0 0 0 0 #8ee6b2', background: 'radial-gradient(circle at 35% 30%, #f1f3f5, #adb5bd)' },
            { offset: 0.26, transform: 'rotate(0deg)', boxShadow: '0 0 0 0 #8ee6b2', background: 'radial-gradient(circle at 35% 30%, #f1f3f5, #adb5bd)' },
            { offset: 0.265, background: 'radial-gradient(circle at 35% 30%, #e6fff1, #4cc38a)' },
            { offset: 0.45, transform: 'rotate(810deg)', boxShadow: '0 0 0 4px #8ee6b2', background: 'radial-gradient(circle at 35% 30%, #e6fff1, #4cc38a)' },
            { offset: 1, transform: 'rotate(810deg)', boxShadow: '0 0 0 4px #8ee6b2', background: 'radial-gradient(circle at 35% 30%, #e6fff1, #4cc38a)' },
          ] },
          { html: '', cls: 'hd-screw', x: 75, y: 74 },
          { html: '🔧', cls: 'hd-wrench', size: 30, x: 15, y: 30, kf: move([[12, 30, 0], [88, 30, 0.5], [12, 30, 1]]) },
          { html: 'しまった！', cls: 'hd-pop good', x: 50, y: 52, kf: appear(0.27, 0.5) },
        ],
        finger: [[88, 92, 0], [86, 84, 0.2], [86, 78, 0.25, 'tap'], [88, 92, 0.4]],
      },
      {
        // レンチが ねじと ねじの あいだに あるときに タップ → 「まだ！」で しまらない
        caption: 'ずれて タップすると しまらないよ',
        dur: 3600,
        parts: [
          { html: '', cls: 'hd-plate iron', x: 50, y: 74 },
          { html: '', cls: 'hd-screw', x: 25, y: 74 },
          { html: '', cls: 'hd-screw', x: 50, y: 74 },
          { html: '', cls: 'hd-screw', x: 75, y: 74 },
          { html: '🔧', cls: 'hd-wrench', size: 30, x: 15, y: 30, kf: move([[12, 30, 0], [88, 30, 0.5], [12, 30, 1]]) },
          { html: 'まだ！', cls: 'hd-pop bad', x: 37, y: 52, kf: appear(0.17, 0.42) },
        ],
        finger: [[88, 92, 0], [86, 84, 0.12], [86, 78, 0.165, 'tap'], [88, 92, 0.35]],
      },
    ],

    crossword: [
      {
        caption: 'マスを タップして えらぶ',
        parts: [
          { html: 'た', cls: 'hd-cell', x: 35, y: 34 },
          { html: '', cls: 'hd-cell', x: 50, y: 34, kf: paintAt(0.35, '#fff', '#ffe28a') },
          { html: '', cls: 'hd-cell', x: 65, y: 34 },
          { html: 'い', cls: 'hd-tile', x: 26, y: 80 },
          { html: 'か', cls: 'hd-tile', x: 42, y: 80 },
          { html: 'こ', cls: 'hd-tile', x: 58, y: 80 },
          { html: 'ほ', cls: 'hd-tile', x: 74, y: 80 },
        ],
        finger: [[70, 90, 0], [52, 46, 0.3], [51, 40, 0.35, 'tap'], [70, 90, 0.7]],
      },
      {
        caption: 'したの もじを タップして いれる',
        dur: 3800,
        parts: [
          { html: 'た', cls: 'hd-cell', x: 35, y: 34 },
          { html: '', cls: 'hd-cell', x: 50, y: 34, kf: paintAt(0.3, '#ffe28a', '#fff') },
          { html: '', cls: 'hd-cell', x: 65, y: 34, kf: paintAt(0.3, '#fff', '#ffe28a') },
          { html: 'い', cls: 'hd-letter', x: 50, y: 34, kf: appear(0.3) },
          { html: 'こ', cls: 'hd-letter', x: 65, y: 34, kf: appear(0.65) },
          { html: 'い', cls: 'hd-tile', x: 26, y: 80 },
          { html: 'か', cls: 'hd-tile', x: 42, y: 80 },
          { html: 'こ', cls: 'hd-tile', x: 58, y: 80 },
          { html: 'ほ', cls: 'hd-tile', x: 74, y: 80 },
          { html: 'できた！', cls: 'hd-pop good', x: 50, y: 10, kf: appear(0.72, 0.95) },
        ],
        finger: [[40, 98, 0], [27, 88, 0.22], [26, 84, 0.27, 'tap'], [58, 88, 0.58], [58, 84, 0.63, 'tap'], [70, 98, 0.85]],
      },
    ],

    memory: [
      {
        caption: 'さいしょに えを おぼえてね',
        dur: 3600,
        parts: [
          { html: '🍎', cls: 'hd-card', x: 23, y: 50 },
          { html: '🐟', cls: 'hd-card', x: 41, y: 50 },
          { html: '🐟', cls: 'hd-card', x: 59, y: 50 },
          { html: '🍎', cls: 'hd-card', x: 77, y: 50 },
          { html: '？', cls: 'hd-card back', x: 23, y: 50, kf: appear(0.65) },
          { html: '？', cls: 'hd-card back', x: 41, y: 50, kf: appear(0.65) },
          { html: '？', cls: 'hd-card back', x: 59, y: 50, kf: appear(0.65) },
          { html: '？', cls: 'hd-card back', x: 77, y: 50, kf: appear(0.65) },
          { html: '👀 おぼえる', cls: 'hd-pop', x: 50, y: 10, kf: appear(0, 0.62) },
        ],
      },
      {
        caption: 'おなじ えを 2まい タップ！',
        dur: 3600,
        parts: [
          { html: '🍎', cls: 'hd-card', x: 23, y: 50, kf: bump(0.55) },
          { html: '🐟', cls: 'hd-card', x: 41, y: 50 },
          { html: '🐟', cls: 'hd-card', x: 59, y: 50 },
          { html: '🍎', cls: 'hd-card', x: 77, y: 50, kf: bump(0.55) },
          { html: '？', cls: 'hd-card back', x: 23, y: 50, kf: [{ offset: 0, opacity: 1 }, { offset: 0.22, opacity: 1 }, { offset: 0.25, opacity: 0 }, { offset: 1, opacity: 0 }] },
          { html: '？', cls: 'hd-card back', x: 41, y: 50 },
          { html: '？', cls: 'hd-card back', x: 59, y: 50 },
          { html: '？', cls: 'hd-card back', x: 77, y: 50, kf: [{ offset: 0, opacity: 1 }, { offset: 0.47, opacity: 1 }, { offset: 0.5, opacity: 0 }, { offset: 1, opacity: 0 }] },
          { html: 'そろった！', cls: 'hd-pop good', x: 50, y: 10, kf: appear(0.55, 0.9) },
        ],
        finger: [[30, 98, 0], [23, 62, 0.18], [23, 56, 0.22, 'tap'], [77, 62, 0.43], [77, 56, 0.47, 'tap'], [90, 98, 0.7]],
      },
    ],

    trace: [
      {
        caption: 'ゆびを はなさずに、おてほんの せんを なぞる',
        dur: 3800,
        lines: [
          { d: 'M10 60 Q 30 15 50 55 T 90 50', color: '#b8c4d6', width: 9, dash: '3 5' },
          { d: 'M10 60 Q 30 15 50 55 T 90 50', color: '#1e88e5', width: 5, from: 0.15, to: 0.8 },
        ],
        finger: { follow: 1, from: 0.15, to: 0.8 },
      },
    ],

    paint: [
      {
        caption: 'いろを えらんで、おてほんと おなじ いろで ぬる',
        dur: 4200,
        lines: [
          { d: 'M38 42 L62 38 L38 52 L62 50 L40 62 L60 60', color: '#ef476f', width: 9, from: 0.35, to: 0.75 },
        ],
        parts: [
          { html: '', cls: 'hd-shape', x: 50, y: 50 },
          { html: '<i></i>おてほん', cls: 'hd-sample', x: 12, y: 18 },
          { html: '', cls: 'hd-color', x: 30, y: 90 },
          { html: '', cls: 'hd-color blue', x: 42, y: 90 },
          { html: '', cls: 'hd-color yellow', x: 54, y: 90 },
          { html: '', cls: 'hd-ring', x: 30, y: 90, kf: appear(0.2) },
          { html: 'できた！', cls: 'hd-btn', x: 82, y: 90, kf: bump(0.87) },
        ],
        finger: [[50, 99, 0], [30, 94, 0.16], [30, 90, 0.2, 'tap'], [38, 42, 0.33, 'down'], [62, 38, 0.4], [38, 52, 0.48], [62, 50, 0.56], [40, 62, 0.66], [60, 60, 0.75, 'up'], [82, 94, 0.83], [82, 90, 0.87, 'tap'], [82, 99, 1]],
      },
    ],

    cream: [
      {
        caption: 'おてほんと おなじ いろに なる びんを 2つ タップ',
        dur: 4000,
        parts: [
          { html: '<i style="background:#f9a03f"></i>おてほん', cls: 'hd-bowl', x: 30, y: 30 },
          { html: '<i></i>まぜる', cls: 'hd-bowl', x: 70, y: 30 },
          { html: '<i style="background:#f9a03f"></i>まぜる', cls: 'hd-bowl', x: 70, y: 30, kf: appear(0.6) },
          { html: '', cls: 'hd-jar', x: 32, y: 80, kf: paintAt(0.25, '#e63946', '#e63946') },
          { html: '', cls: 'hd-jar yellow', x: 50, y: 80 },
          { html: '', cls: 'hd-jar blue', x: 68, y: 80 },
          { html: '', cls: 'hd-ring', x: 32, y: 80, kf: appear(0.25, 0.6) },
          { html: '', cls: 'hd-ring', x: 50, y: 80, kf: appear(0.47, 0.6) },
          { html: 'おなじ いろ！', cls: 'hd-pop good', x: 50, y: 10, kf: appear(0.65, 0.95) },
        ],
        finger: [[45, 99, 0], [32, 86, 0.2], [32, 80, 0.25, 'tap'], [50, 86, 0.42], [50, 80, 0.47, 'tap'], [70, 99, 0.7]],
      },
      {
        // 5回まちがえるたびに、答えに使う色のびんが光る（js/games/cream.js の HINT_EVERY）
        caption: '5かい まちがえると、つかう いろが ひかって ヒントが でるよ',
        dur: 3600,
        parts: [
          { html: '<i style="background:#f9a03f"></i>おてほん', cls: 'hd-bowl', x: 30, y: 30 },
          { html: '<i></i>まぜる', cls: 'hd-bowl', x: 70, y: 30 },
          { html: '', cls: 'hd-jar', x: 32, y: 80 },
          { html: '', cls: 'hd-jar yellow', x: 50, y: 80 },
          { html: '', cls: 'hd-jar blue', x: 68, y: 80 },
          { html: '', cls: 'hd-glow', x: 32, y: 80, kf: appear(0.3) },
          { html: 'ヒント：あかを つかうよ', cls: 'hd-pop good', x: 50, y: 10, kf: appear(0.3, 0.95) },
        ],
      },
      {
        // しょきゅうは 3つの いろ（js/games/cream.js の MATERIALS）
        caption: 'しょきゅうでは 3つの いろを つかうよ！',
        tiers: [0],
        dur: 3200,
        parts: [
          { html: '', cls: 'hd-jar', x: 32, y: 56, kf: bump(0.15) },
          { html: '', cls: 'hd-jar yellow', x: 50, y: 56, kf: bump(0.27) },
          { html: '', cls: 'hd-jar blue', x: 68, y: 56, kf: bump(0.39) },
        ],
      },
      {
        // ちゅうきゅうは 4つの いろ（js/games/cream.js の MATERIALS）
        caption: 'ちゅうきゅうでは 4つの いろを つかうよ！',
        tiers: [1],
        dur: 3200,
        parts: [
          { html: '', cls: 'hd-jar', x: 26, y: 56, kf: bump(0.15) },
          { html: '', cls: 'hd-jar yellow', x: 42, y: 56, kf: bump(0.27) },
          { html: '', cls: 'hd-jar blue', x: 58, y: 56, kf: bump(0.39) },
          { html: '', cls: 'hd-jar white', x: 74, y: 56, kf: bump(0.51) },
        ],
      },
      {
        // じょうきゅうは 5つの いろ（js/games/cream.js の MATERIALS）
        caption: 'じょうきゅうでは 5つの いろを つかうよ！',
        tiers: [2],
        dur: 3200,
        parts: [
          { html: '', cls: 'hd-jar', x: 22, y: 56, kf: bump(0.15) },
          { html: '', cls: 'hd-jar yellow', x: 36, y: 56, kf: bump(0.27) },
          { html: '', cls: 'hd-jar blue', x: 50, y: 56, kf: bump(0.39) },
          { html: '', cls: 'hd-jar white', x: 64, y: 56, kf: bump(0.51) },
          { html: '', cls: 'hd-jar black', x: 78, y: 56, kf: bump(0.63) },
        ],
      },
      {
        // 上級は、まぜた クリームを もういちど ほかの いろと まぜる問題が出る（きいろ＋あお → みどり、みどり＋しろ → うすい みどり）
        caption: 'じょうきゅうでは 2かい いじょう まぜる クリームも でて くるよ',
        tiers: [2],
        dur: 5200,
        parts: [
          { html: '<i style="background:#9edba5"></i>おてほん', cls: 'hd-bowl', x: 28, y: 26 },
          { html: '<i></i>まぜる', cls: 'hd-bowl', x: 72, y: 26 },
          { html: '<i style="background:#3cb44b"></i>まぜる', cls: 'hd-bowl', x: 72, y: 26, kf: appear(0.3, 0.66) },
          { html: '<i style="background:#9edba5"></i>まぜる', cls: 'hd-bowl', x: 72, y: 26, kf: appear(0.66) },
          { html: '', cls: 'hd-jar yellow', x: 26, y: 80 },
          { html: '', cls: 'hd-jar blue', x: 42, y: 80 },
          { html: '', cls: 'hd-jar white', x: 58, y: 80 },
          { html: '', cls: 'hd-jar green', x: 78, y: 80, kf: appear(0.34) },
          { html: '', cls: 'hd-ring', x: 26, y: 80, kf: appear(0.1, 0.3) },
          { html: '', cls: 'hd-ring', x: 42, y: 80, kf: appear(0.22, 0.3) },
          { html: '', cls: 'hd-ring', x: 78, y: 80, kf: appear(0.48, 0.66) },
          { html: '', cls: 'hd-ring', x: 58, y: 80, kf: appear(0.6, 0.66) },
          { html: '1かいめ', cls: 'hd-pop', x: 50, y: 6, kf: appear(0.3, 0.45) },
          { html: '2かいめ', cls: 'hd-pop good', x: 50, y: 6, kf: appear(0.7, 0.95) },
        ],
        finger: [[50, 99, 0], [26, 86, 0.06], [26, 80, 0.1, 'tap'], [42, 86, 0.18], [42, 80, 0.22, 'tap'],
          [78, 86, 0.44], [78, 80, 0.48, 'tap'], [58, 86, 0.56], [58, 80, 0.6, 'tap'], [60, 99, 0.75]],
      },
    ],

    heat: [
      {
        caption: 'ぐるぐる まわすと おんどが あがる。みどりに たもとう',
        dur: 4000,
        parts: [
          { html: '<i></i>', cls: 'hd-thermo', x: 22, y: 50 },
          { html: '', cls: 'hd-thermo-fill', x: 22, y: 84, kf: [
            { offset: 0, height: '10%' }, { offset: 0.55, height: '58%' }, { offset: 0.9, height: '58%' }, { offset: 1, height: '10%' },
          ] },
          { html: '<i></i>', cls: 'hd-handle', x: 66, y: 50, kf: [
            { offset: 0, transform: 'rotate(0deg)' }, { offset: 0.9, transform: 'rotate(1080deg)' }, { offset: 1, transform: 'rotate(1080deg)' },
          ] },
          { html: 'いい かんじ！', cls: 'hd-pop good', x: 66, y: 6, kf: appear(0.55, 0.9) },
        ],
        // ハンドルのまわりを3周する
        finger: (function () {
          const pts = [];
          for (let i = 0; i <= 36; i++) {
            const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
            pts.push([66 + Math.cos(a) * 11, 50 + Math.sin(a) * 30, 0.9 * i / 36, i === 0 ? 'down' : i === 36 ? 'up' : null]);
          }
          return pts;
        })(),
      },
    ],

    circuit: [
      {
        caption: 'おなじ いろの てんを ゆびで なぞって つなぐ。せんは まじわれないよ',
        dur: 4400,
        lines: [
          { d: 'M18 28 L82 28', color: '#ef476f', width: 7, from: 0.1, to: 0.38 },
          { d: 'M18 72 L50 72 L50 50 L82 50', color: '#1e88e5', width: 7, from: 0.55, to: 0.85 },
        ],
        parts: [
          { html: '', cls: 'hd-dot', x: 18, y: 28 },
          { html: '', cls: 'hd-dot', x: 82, y: 28 },
          { html: '', cls: 'hd-dot blue', x: 18, y: 72 },
          { html: '', cls: 'hd-dot blue', x: 82, y: 50 },
          { html: 'つながった！', cls: 'hd-pop good', x: 50, y: 92, kf: appear(0.88) },
        ],
        finger: [[30, 95, 0], [18, 28, 0.1, 'down'], [82, 28, 0.38, 'up'], [18, 72, 0.55, 'down'], [50, 72, 0.67], [50, 50, 0.73], [82, 50, 0.85, 'up'], [90, 95, 1]],
      },
    ],

    stone: [
      {
        caption: 'いしを なんかいも タップして わろう！',
        dur: 3400,
        parts: [
          { html: '🪨', cls: 'hd-stone', size: 64, x: 50, y: 50, kf: [
            { offset: 0, transform: 'rotate(0deg)', opacity: 1 },
            { offset: 0.1, transform: 'rotate(-6deg)' }, { offset: 0.2, transform: 'rotate(6deg)' },
            { offset: 0.3, transform: 'rotate(-6deg)' }, { offset: 0.4, transform: 'rotate(6deg)' },
            { offset: 0.5, transform: 'rotate(-6deg)' }, { offset: 0.6, transform: 'rotate(0deg)', opacity: 1 },
            { offset: 0.63, opacity: 0 }, { offset: 1, opacity: 0 },
          ] },
          { html: '💥', size: 60, x: 50, y: 50, kf: appear(0.62, 0.95) },
          { html: 'われた！', cls: 'hd-pop good', x: 50, y: 8, kf: appear(0.64, 0.95) },
        ],
        finger: [[62, 70, 0.05, 'tap'], [58, 66, 0.15, 'tap'], [62, 70, 0.25, 'tap'], [58, 66, 0.35, 'tap'], [62, 70, 0.45, 'tap'], [58, 66, 0.55, 'tap'], [72, 96, 0.8]],
      },
    ],

    robot: [
      {
        caption: 'やじるしを タップして ならべる',
        dur: 3600,
        parts: [
          { html: '<img src="assets/img/robot.png" alt="">', cls: 'hd-img', x: 20, y: 28 },
          { html: '<img src="assets/img/oit-tower.webp" alt="">', cls: 'hd-img', x: 80, y: 28 },
          { html: '→', cls: 'hd-block', x: 40, y: 58, kf: appear(0.25) },
          { html: '→', cls: 'hd-block', x: 52, y: 58, kf: appear(0.5) },
          { html: '↑', cls: 'hd-key', x: 26, y: 88 },
          { html: '↓', cls: 'hd-key', x: 42, y: 88 },
          { html: '←', cls: 'hd-key', x: 58, y: 88 },
          { html: '→', cls: 'hd-key', x: 74, y: 88 },
        ],
        finger: [[60, 99, 0], [74, 92, 0.2], [74, 88, 0.25, 'tap'], [74, 92, 0.38], [74, 88, 0.5, 'tap'], [86, 99, 0.75]],
      },
      {
        caption: '「ぜんぶ じっこう」で うごくよ',
        dur: 3600,
        parts: [
          { html: '<img src="assets/img/robot.png" alt="">', cls: 'hd-img', x: 20, y: 28, kf: move([[20, 28, 0], [20, 28, 0.3], [50, 28, 0.5], [80, 28, 0.7], [80, 28, 1]]) },
          { html: '<img src="assets/img/oit-tower.webp" alt="">', cls: 'hd-img', x: 80, y: 28 },
          { html: '→', cls: 'hd-block', x: 40, y: 58 },
          { html: '→', cls: 'hd-block', x: 52, y: 58 },
          { html: 'ぜんぶ じっこう', cls: 'hd-btn wide', x: 50, y: 88, kf: bump(0.22) },
          { html: 'ゴール！', cls: 'hd-pop good', x: 80, y: 6, kf: appear(0.72, 0.95) },
        ],
        finger: [[70, 99, 0], [52, 92, 0.18], [52, 88, 0.22, 'tap'], [70, 99, 0.45]],
      },
    ],

    jump: [
      {
        caption: '「ジャンプ！」に あわせて、みんなと いっしょに おそう',
        dur: 4000,
        parts: [
          { html: '3', cls: 'hd-count', x: 50, y: 14, kf: appear(0.05, 0.22) },
          { html: '2', cls: 'hd-count', x: 50, y: 14, kf: appear(0.25, 0.42) },
          { html: '1', cls: 'hd-count', x: 50, y: 14, kf: appear(0.45, 0.62) },
          { html: 'ジャンプ！', cls: 'hd-count', x: 50, y: 14, kf: appear(0.65, 0.9) },
          { html: '🐻', size: 30, x: 20, y: 52, kf: move([[20, 52, 0], [20, 52, 0.66], [20, 34, 0.72], [20, 52, 0.8], [20, 52, 1]]) },
          { html: '🐰', size: 30, x: 35, y: 52, kf: move([[35, 52, 0], [35, 52, 0.66], [35, 34, 0.72], [35, 52, 0.8], [35, 52, 1]]) },
          { html: '🐥', size: 30, x: 50, y: 52, kf: move([[50, 52, 0], [50, 52, 0.66], [50, 34, 0.72], [50, 52, 0.8], [50, 52, 1]]) },
          { html: '🐱', size: 30, x: 65, y: 52, kf: move([[65, 52, 0], [65, 52, 0.66], [65, 34, 0.72], [65, 52, 0.8], [65, 52, 1]]) },
          { html: '🐶', size: 30, x: 80, y: 52, kf: move([[80, 52, 0], [80, 52, 0.66], [80, 34, 0.72], [80, 52, 0.8], [80, 52, 1]]) },
          { html: 'ジャンプ！', cls: 'hd-btn wide', x: 50, y: 86, kf: bump(0.65) },
        ],
        finger: [[70, 99, 0], [52, 92, 0.55], [52, 88, 0.65, 'tap'], [70, 99, 0.85]],
      },
    ],

    bounce: [
      {
        caption: 'とんでくる どうぐを タップして はねかえそう',
        dur: 3400,
        parts: [
          { html: '🧰', size: 34, x: 50, y: 55 },
          { html: '🔨', size: 28, x: 92, y: 8, kf: [
            { offset: 0, left: '92%', top: '8%', transform: 'rotate(0deg)', opacity: 1 },
            { offset: 0.42, left: '71%', top: '31%', transform: 'rotate(0deg)', opacity: 1 },
            { offset: 0.66, left: '100%', top: '-10%', transform: 'rotate(720deg)', opacity: 1 },
            { offset: 0.67, opacity: 0 },
            { offset: 1, left: '92%', top: '8%', opacity: 0 },
          ] },
          { html: 'カキーン！', cls: 'hd-pop good', x: 72, y: 10, kf: appear(0.42, 0.7) },
        ],
        finger: [[86, 96, 0], [72, 40, 0.37], [71, 34, 0.42, 'tap'], [86, 96, 0.7]],
      },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
