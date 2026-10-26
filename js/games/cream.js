/*
 * クリーム作り（香椎化学工業）
 * お手本の色のクリームと同じ色になるように、材料のびん（色だけ）から2つ選んで混ぜる。3問。
 *   初級：あか・あお・きいろ / 中級：＋しろ / 上級：＋くろ、1問は2回混ぜる
 *   （上級は、混ぜたクリーム（ボウル）ともう1つの材料をもう一度混ぜられる）
 *   first : 1回目の混ぜ方で当てた問題の割合（2回混ぜる問題は2回で当てたら）→ ひらめき（＋）
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
        for (let j = i + 1; j < mats.length; j++) pairs.push([mats[i], mats[j]]);
      }
      // 問題を3つ。上級は1問を「2回混ぜる」問題にする
      const questions = ctx.shuffle(pairs).slice(0, 3).map(function (p) {
        const recipe = mixRecipe(single(p[0]), single(p[1]));
        return { recipe: recipe, color: PAIR[key(p[0], p[1])], steps: 1 };
      });
      if (ctx.tier === 2) {
        const p = ctx.pick([['R', 'Y'], ['B', 'Y'], ['R', 'B']]);
        const first = mixRecipe(single(p[0]), single(p[1]));
        const c1 = PAIR[key(p[0], p[1])];
        questions[ctx.randInt(0, 2)] = {
          recipe: mixRecipe(first, single('W')),
          color: c1.map(function (v, i) { return (v + BASE.W[i]) / 2; }),
          steps: 2,
        };
      }

      const qLabel = ctx.el('div', 'cream-q');
      const row = ctx.el('div', 'cream-row');
      row.style.top = '36px';
      const target = ctx.el('div', 'bowl target', row, '<div class="bowl-dish"><div class="bowl-cream"></div></div>おてほん');
      const mixing = ctx.el('div', 'bowl', row, '<div class="bowl-dish"><div class="bowl-cream"></div></div>まぜる ボウル');
      const jars = ctx.el('div', 'jars');

      let qi = 0;
      let solvedFirst = 0;
      let totalTries = 0;
      let triesNow = 0;
      let selected = [];
      let bowl = null;        // { recipe, color }（上級で、もう一度混ぜるため）
      let busy = false;

      mats.forEach(function (code) {
        const b = ctx.el('button', 'jar', jars);
        b.type = 'button';
        b.style.background = rgb(BASE[code]);
        ctx.on(b, 'click', function () { pick({ code: code, recipe: single(code), color: BASE[code], el: b }); });
      });
      let bowlJar = null;
      if (ctx.tier === 2) {
        bowlJar = ctx.el('button', 'jar bowl-jar', jars);
        bowlJar.type = 'button';
        bowlJar.title = 'まぜた クリーム';
        bowlJar.style.visibility = 'hidden';
        ctx.on(bowlJar, 'click', function () {
          if (bowl) pick({ code: 'bowl', recipe: bowl.recipe, color: bowl.color, el: bowlJar });
        });
      }

      function setBowl(el, color) {
        el.querySelector('.bowl-cream').style.background = color ? rgb(color) : 'transparent';
      }

      function showQuestion() {
        const q = questions[qi];
        qLabel.textContent = (qi + 1) + ' / 3もんめ' + (q.steps === 2 ? '（2かい まぜるよ）' : '');
        setBowl(target, q.color);
        setBowl(mixing, null);
        bowl = null;
        if (bowlJar) bowlJar.style.visibility = 'hidden';
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
        let color;
        if (a.code === 'bowl' || b.code === 'bowl') {
          const other = a.code === 'bowl' ? b : a;
          color = bowl.color.map(function (v, i) { return (v + other.color[i]) / 2; });
        } else {
          color = colorOf(recipe);
        }
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
          // 上級：2回混ぜる問題の1回目はボウルに残して、もう一度混ぜられるようにする
          const half = q.steps === 2 && Object.keys(recipe).length === 2 && !(a.code === 'bowl' || b.code === 'bowl');
          if (half) {
            bowl = { recipe: recipe, color: color };
            bowlJar.style.visibility = 'visible';
            bowlJar.style.background = rgb(color);
            ctx.pop('もう ひとつ まぜてみよう', ctx.width() / 2, 140);
          } else {
            ctx.pop('ちがう いろだね', ctx.width() / 2, 140, 'bad');
            bowl = null;
            if (bowlJar) bowlJar.style.visibility = 'hidden';
            ctx.after(500, function () { setBowl(mixing, null); });
          }
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
