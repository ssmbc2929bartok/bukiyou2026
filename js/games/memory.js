/*
 * 絵合わせ（枚方市）
 * 最初の5秒だけ全部表にして見せ、伏せてから始める（タイマーは伏せてから動く）。
 * 初級 3×2（3ペア） / 中級 4×3（6ペア） / 上級 4×4（8ペア）。前は 3・4・6ペアだった（v2.3.0 で変更）。
 * カードは正方形。並べられるいちばん大きい大きさにする。
 *   misses : そろわなかった回数 → ていねい（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const PAIRS = [3, 6, 8];
  const COLS = [3, 4, 4];
  const ROWS = [2, 3, 4];
  const GAP = 10;
  const PREVIEW_MS = 5000;

  BKF.games.register('memory', {
    delayTimer: true,
    start: function (ctx) {
      const pairs = PAIRS[ctx.tier];
      const items = ctx.shuffle(BKF.memoryItems).slice(0, pairs);
      const cards = ctx.shuffle(items.concat(items)).map(function (item) { return { item: item }; });
      let misses = 0;
      let matched = 0;
      let open = [];
      let locked = true;

      const msg = ctx.el('div', 'game-msg', null, 'おぼえてね！ 5');
      const grid = ctx.el('div', 'memory-grid');
      // 正方形のカードを、上の「おぼえてね！」の下（44px）から下の余白（12px）までに収める
      const cols = COLS[ctx.tier];
      const rows = ROWS[ctx.tier];
      const side = Math.floor(Math.min(
        (ctx.width() - 24 - GAP * (cols - 1)) / cols,
        (ctx.height() - 44 - 12 - GAP * (rows - 1)) / rows));
      grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + side + 'px)';
      grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + side + 'px)';
      grid.style.setProperty('--card', side + 'px');

      cards.forEach(function (card) {
        const b = ctx.el('button', 'memory-card open', grid);
        b.type = 'button';
        const face = card.item.img
          ? '<img src="' + card.item.img + '" alt="">'
          : card.item.emoji;
        b.innerHTML = '<span class="memory-inner"><span class="memory-face memory-back"></span>' +
          '<span class="memory-face memory-front">' + face + '</span></span>';
        card.el = b;
        ctx.on(b, 'click', function () { flip(card); });
      });

      // 5秒見せる
      let left = 5;
      (function count() {
        ctx.after(1000, function () {
          left--;
          if (left > 0) {
            msg.textContent = 'おぼえてね！ ' + left;
            count();
            return;
          }
          cards.forEach(function (c) { c.el.classList.remove('open'); });
          msg.textContent = 'おなじ えを 2まい めくろう！';
          locked = false;
          ctx.startTimer();
        });
      })();

      function metrics() {
        return { misses: misses, matched: matched, pairs: pairs };
      }

      function flip(card) {
        if (locked || card.done || open.indexOf(card) !== -1) return;
        card.el.classList.add('open');
        open.push(card);
        if (open.length < 2) return;
        const a = open[0];
        const b = open[1];
        open = [];
        if (a.item.id === b.item.id) {
          a.done = b.done = true;
          a.el.classList.add('matched');
          b.el.classList.add('matched');
          matched++;
          if (matched === pairs) ctx.after(500, function () { ctx.finish(metrics()); });
        } else {
          misses++;
          locked = true;
          ctx.after(700, function () {
            a.el.classList.remove('open');
            b.el.classList.remove('open');
            locked = false;
          });
        }
      }

      return { end: metrics, previewMs: PREVIEW_MS };
    },
  });
})(window);
