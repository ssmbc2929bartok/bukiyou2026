/*
 * クリーム作り（香椎化学工業）
 * お手本の色のクリームと同じ色になるように、材料のびん（色だけ）から2つ選んで混ぜる。3問。
 *   初級：あか・あお・きいろ / 中級：＋しろ / 上級：＋くろ
 *   上級の3問は、1回でできる問題・2回まぜる問題・3回まぜる問題が1つずつ（順番はランダム）。
 *     2回・3回まぜる問題は、2色をまぜたクリームに、材料を1つずつ足していく形で、材料は毎回ランダムに選ぶ
 *     （例：あか＋きいろ → ＋しろ、あお＋しろ → ＋きいろ → ＋あか）。
 *     暗すぎる色・しろに近すぎる色・材料の色そのままに近い色は、選びなおす。
 *   上級は、まぜたクリームを「パレット」に残す（5つまで。いっぱいなら古いものから入れかわる。問題がかわると空にする）。
 *   パレットのクリームは、びんと同じようにタップして、もう一度まぜられる（パレットどうしでもよい）。
 *   first : 1回目の混ぜ方で当てた問題の割合（2回・3回まぜる問題は、その回数で当てたら）→ ひらめき（＋）
 *   tries : 1問あたりに混ぜた回数 → チャレンジ（＋）
 * クリームは材料の割合で表す（例：あか＋きいろ → {R:0.5, Y:0.5}）。割合が同じなら正解。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const BASE = {
    R: [230, 57, 70],
    B: [40, 110, 220],
    Y: [255, 214, 10],
    W: [255, 255, 255],
    K: [45, 45, 45],
  };
  // 2つを混ぜたときの見た目の色（絵の具らしく見えるように決めておく）
  const PAIR = {
    RY: [255, 140, 26], BY: [60, 180, 75], BR: [142, 68, 173],
    RW: [255, 158, 181], BW: [143, 211, 255], WY: [255, 243, 160],
    KW: [158, 158, 158], KR: [123, 30, 43], BK: [31, 47, 92], KY: [107, 107, 30],
  };
  const MATERIALS = [['R', 'B', 'Y'], ['R', 'B', 'Y', 'W'], ['R', 'B', 'Y', 'W', 'K']];
  // 何色がまざったか分かりにくい、にごった色を問題に出さないときは、ここに書く（例 'KR' は くろ＋あか）。
  // いまは どの組み合わせも出す（2026-11-01 に見て決めた）
  const MUDDY = [];
  const PALETTE = 5;   // パレットに残せる数

  function key(a, b) { return [a, b].sort().join(''); }
  function rgb(c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }

  function mixRecipe(r1, r2) {
    const out = {};
    [r1, r2].forEach(function (r) {
      Object.keys(r).forEach(function (k) { out[k] = (out[k] || 0) + r[k] / 2; });
    });
    return out;
  }

  function same(r1, r2) {
    const keys = Object.keys(r1).concat(Object.keys(r2));
    return keys.every(function (k) { return Math.abs((r1[k] || 0) - (r2[k] || 0)) < 1e-6; });
  }

  function single(code) { const r = {}; r[code] = 1; return r; }

  // 見た目の色：材料2つなら PAIR、2回混ぜたものは混ぜた色どうしの平均
  function colorOf(recipe, history) {
    if (history) return history;
    const ks = Object.keys(recipe);
    if (ks.length === 1) return BASE[ks[0]];
    return PAIR[ks.slice().sort().join('')];
  }

  BKF.games.register('cream', {
    start: function (ctx) {
      const mats = MATERIALS[ctx.tier];
      const pairs = [];
      for (let i = 0; i < mats.length; i++) {
        for (let j = i + 1; j < mats.length; j++) {
          if (MUDDY.indexOf(key(mats[i], mats[j])) === -1) pairs.push([mats[i], mats[j]]);
        }
      }
      // 問題を3つ。上級は、2問を「2回まぜる」「3回まぜる」問題にする
      const questions = ctx.shuffle(pairs).slice(0, 3).map(function (p) {
        const recipe = mixRecipe(single(p[0]), single(p[1]));
        return { recipe: recipe, color: PAIR[key(p[0], p[1])], steps: 1 };
      });
      // 2色をまぜたクリームに、材料を順に足していく（見た目の色は、まぜた色どうしの平均）
      function build(p, adds) {
        let recipe = mixRecipe(single(p[0]), single(p[1]));
        let color = PAIR[key(p[0], p[1])];
        adds.forEach(function (code) {
          recipe = mixRecipe(recipe, single(code));
          color = color.map(function (v, j) { return (v + BASE[code][j]) / 2; });
        });
        return { recipe: recipe, color: color, steps: adds.length + 1 };
      }
      // 2回・3回まぜる問題を、ランダムな材料で作る。見分けにくい色は選びなおす
      function brightness(c) { return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; }
      function far(c, list) {
        return list.every(function (d) { return Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]) > 60; });
      }
      function multi(steps, avoid) {
        let q = null;
        for (let tries = 0; tries < 200; tries++) {
          const p = ctx.pick(pairs);
          const adds = [];
          for (let i = 1; i < steps; i++) adds.push(ctx.pick(mats));
          q = build(p, adds);
          const b = brightness(q.color);
          const bases = mats.map(function (m) { return BASE[m]; });
          if (b > 55 && b < 232 && far(q.color, bases) && far(q.color, avoid)) break;
        }
        return q;
      }
      if (ctx.tier === 2) {
        const at = ctx.shuffle([0, 1, 2]);
        const others = questions.map(function (q) { return q.color; });
        questions[at[0]] = multi(2, others);
        questions[at[1]] = multi(3, others.concat([questions[at[0]].color]));
      }

      const qLabel = ctx.el('div', 'cream-q');
      const row = ctx.el('div', 'cream-row');
      row.style.top = '36px';
      const target = ctx.el('div', 'bowl target', row, '<div class="bowl-dish"><div class="bowl-cream"></div></div>おてほん');
      const mixing = ctx.el('div', 'bowl', row, '<div class="bowl-dish"><div class="bowl-cream"></div></div>まぜる ボウル');
      const jars = ctx.el('div', 'jars' + (mats.length > 4 ? ' five' : ''));

      let qi = 0;
      let solvedFirst = 0;
      let totalTries = 0;
      let triesNow = 0;
      let selected = [];
      let palette = [];       // 上級：まぜたクリーム { id, recipe, color, el }（古い順）
      let paletteNo = 0;
      let busy = false;

      mats.forEach(function (code) {
        const b = ctx.el('button', 'jar', jars);
        b.type = 'button';
        b.style.background = rgb(BASE[code]);
        ctx.on(b, 'click', function () { pick({ code: code, recipe: single(code), color: BASE[code], el: b }); });
      });
      // 上級：まぜたクリームを並べるパレット（ボウルの段とびんの段のあいだ）
      let paletteEl = null;
      if (ctx.tier === 2) {
        paletteEl = ctx.el('div', 'cream-palette');
        paletteEl.style.top = '150px';
        ctx.el('div', 'cream-palette-label', paletteEl, 'パレット（まぜた クリーム）');
        ctx.el('div', 'cream-palette-dishes', paletteEl);
      }

      function renderPalette() {
        if (!paletteEl) return;
        const dishes = paletteEl.querySelector('.cream-palette-dishes');
        dishes.innerHTML = '';
        for (let i = 0; i < PALETTE; i++) {
          const item = palette[i];
          const d = ctx.el('button', 'palette-dish' + (item ? '' : ' empty'), dishes);
          d.type = 'button';
          if (!item) continue;
          d.style.background = rgb(item.color);
          item.el = d;
          ctx.on(d, 'click', function () { pick({ code: item.id, recipe: item.recipe, color: item.color, el: d }); });
        }
      }

      function keep(recipe, color) {
        palette.push({ id: 'p' + (paletteNo++), recipe: recipe, color: color });
        if (palette.length > PALETTE) palette.shift();
        renderPalette();
      }

      function setBowl(el, color) {
        el.querySelector('.bowl-cream').style.background = color ? rgb(color) : 'transparent';
      }

      function showQuestion() {
        const q = questions[qi];
        qLabel.textContent = (qi + 1) + ' / 3もんめ' + (q.steps >= 2 ? '（2かい いじょう まぜるよ）' : '');
        setBowl(target, q.color);
        setBowl(mixing, null);
        palette = [];
        renderPalette();
        triesNow = 0;
      }

      function clearSel() {
        selected.forEach(function (s) { s.el.classList.remove('sel'); });
        selected = [];
      }

      function pick(item) {
        if (busy) return;
        if (selected.some(function (s) { return s.code === item.code; })) {
          item.el.classList.remove('sel');
          selected = selected.filter(function (s) { return s.code !== item.code; });
          return;
        }
        selected.push(item);
        item.el.classList.add('sel');
        if (selected.length < 2) return;
        mix();
      }

      function mix() {
        busy = true;
        const a = selected[0];
        const b = selected[1];
        const recipe = mixRecipe(a.recipe, b.recipe);
        // びん2つなら決めておいた色、パレットのクリームを使ったら色どうしの平均
        const raw = a.code.length === 1 && b.code.length === 1;
        const color = raw ? colorOf(recipe) : a.color.map(function (v, i) { return (v + b.color[i]) / 2; });
        triesNow++;
        totalTries++;
        setBowl(mixing, color);
        clearSel();
        const q = questions[qi];
        ctx.after(650, function () {
          if (same(recipe, q.recipe)) {
            if (triesNow <= q.steps) solvedFirst++;
            ctx.pop('せいかい！', ctx.width() / 2, 140, 'good');
            qi++;
            if (qi >= questions.length) {
              ctx.after(500, function () { ctx.finish(metrics()); });
              return;
            }
            ctx.after(600, function () { showQuestion(); busy = false; });
            return;
          }
          if (paletteEl) {
            // 上級：まぜたクリームはパレットに残して、もう一度まぜられるようにする
            keep(recipe, color);
            ctx.pop(q.steps >= 2 ? 'パレットに のこしたよ。もっと まぜてみよう' : 'パレットに のこしたよ', ctx.width() / 2, 140);
          } else {
            ctx.pop('ちがう いろだね', ctx.width() / 2, 140, 'bad');
          }
          ctx.after(500, function () { setBowl(mixing, null); });
          busy = false;
        });
      }

      function metrics() {
        const attempted = qi + (triesNow > 0 && qi < questions.length ? 1 : 0);
        return {
          first: solvedFirst / questions.length,
          tries: attempted ? totalTries / attempted : null,
          solved: qi,
        };
      }

      showQuestion();
      return { end: metrics };
    },
  });
})(window);
