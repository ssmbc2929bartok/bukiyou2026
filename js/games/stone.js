/*
 * 石割り（大阪石材工業）
 * 石を連打して割る。割るのに必要な回数：初級15 / 中級25 / 上級35
 *   rate : 最初にたたいてから割れるまで（割れなければ時間切れまで）の 1秒あたりの回数 → げんき（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const NEED = [15, 25, 35];

  BKF.games.register('stone', {
    start: function (ctx) {
      const need = NEED[ctx.tier];
      let taps = 0;
      let firstAt = 0;
      let brokeAt = 0;

      const rock = ctx.el('div', 'rock');
      ctx.el('div', 'rock-body', rock);
      // ひび（たたくほど見えてくる）
      const cracks = [];
      let svg = '<svg viewBox="0 0 220 180">';
      for (let i = 0; i < 9; i++) {
        let x = 110 + ctx.rand(-30, 30);
        let y = 90 + ctx.rand(-25, 25);
        let d = 'M' + x.toFixed(0) + ' ' + y.toFixed(0);
        const ang = ctx.rand(0, Math.PI * 2);
        for (let k = 0; k < 4; k++) {
          x += Math.cos(ang + ctx.rand(-0.6, 0.6)) * 18;
          y += Math.sin(ang + ctx.rand(-0.6, 0.6)) * 18;
          d += ' L' + x.toFixed(0) + ' ' + y.toFixed(0);
        }
        svg += '<path d="' + d + '" stroke="#3b3b3b" stroke-width="4" fill="none" stroke-linecap="round" opacity="0"/>';
      }
      rock.insertAdjacentHTML('beforeend', svg + '</svg>');
      rock.querySelectorAll('path').forEach(function (p) { cracks.push(p); });
      const counter = ctx.el('div', 'stone-count', null, 'あと ' + need + 'かい');

      function sec(endAt) {
        return firstAt ? Math.max(0.5, (endAt - firstAt) / 1000) : null;
      }

      function metrics() {
        const s = sec(brokeAt || performance.now());
        return { rate: s ? taps / s : 0, taps: taps, broke: brokeAt ? 1 : 0, sec: s };
      }

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        if (brokeAt) return;
        const now = performance.now();
        if (!firstAt) firstAt = now;
        taps++;
        rock.classList.remove('hit');
        void rock.offsetWidth;
        rock.classList.add('hit');
        const shown = Math.floor(cracks.length * taps / need);
        cracks.forEach(function (c, i) { c.setAttribute('opacity', i < shown ? '1' : '0'); });
        const p = ctx.pos(e);
        ctx.pop('ドン！', p.x, p.y);
        counter.textContent = 'あと ' + Math.max(0, need - taps) + 'かい';
        if (taps >= need) {
          brokeAt = now;
          rock.style.visibility = 'hidden';
          const cx = ctx.width() / 2;
          const cy = ctx.height() * 0.46;
          for (let i = 0; i < 24; i++) {
            const chip = ctx.el('div', 'chip');
            chip.style.left = cx + 'px';
            chip.style.top = cy + 'px';
            const a = ctx.rand(0, Math.PI * 2);
            const r = ctx.rand(60, 150);
            requestAnimationFrame(function () {
              chip.style.transform = 'translate(' + Math.cos(a) * r + 'px,' + Math.sin(a) * r + 'px) rotate(' + ctx.rand(-200, 200) + 'deg)';
              chip.style.opacity = '0';
            });
          }
          counter.textContent = 'こなに なった！';
          ctx.after(900, function () { ctx.finish(metrics()); });
        }
      });

      return { end: metrics };
    },
  });
})(window);
