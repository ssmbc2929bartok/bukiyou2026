/*
 * 跳ね返し（アクテック）
 * 真ん中のケースに向かって飛んでくる道具をタップして跳ね返す。ケースに3回当たったら終わり。
 *   ケースに届くまでの時間：初級 2.5〜3秒 / 中級 1.6〜2.4秒 / 上級 1.1〜2秒（道具ごとにランダム）
 *   同時に飛んでくる数：初級2 / 中級3 / 上級4。後半ほど飛んでくる間隔が短くなる。
 *   曲がって飛ぶもの：中級 15% / 上級 40%
 *   survive : 守れた時間（秒）→ こつこつ（＋）
 *   decline : 前半と後半の、跳ね返せた割合の差（前半−後半）→ こつこつ（−）
 *   empty   : 何もない所をタップした回数 → チャレンジ（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  // 「上級でも簡単そう」という声があったので、v2.4.0 で速く・多くした（前は 3秒・2〜3秒・1.5〜3秒、1・2・3個）
  const TRAVEL = [[2.5, 3], [1.6, 2.4], [1.1, 2]];   // ケースに届くまでの秒数
  const MAX_AT_ONCE = [2, 3, 4];                     // 同時に飛んでくる数
  const GAP = [[1.4, 0.8], [1.1, 0.6], [0.9, 0.45]];  // 次が出るまでの秒数 [はじめ, おわり]
  const CURVE = [0, 0.15, 0.4];                      // 曲がって飛ぶものの割合
  const LIVES = 3;
  const TOOLS = ['🔨', '🔧', '🔩'];

  BKF.games.register('bounce', {
    start: function (ctx) {
      const W = ctx.width();
      const H = ctx.height();
      const cx = W / 2;
      const cy = H / 2;
      const caseEl = ctx.el('div', 'case');
      const lives = ctx.el('div', 'case-lives');
      const tools = [];
      const outcomes = [];   // { t, ok }
      let hits = 0;
      let bounced = 0;
      let empty = 0;
      let nextSpawn = 0.8;
      let deadAt = null;

      function showLives() {
        lives.textContent = '🧰'.repeat(LIVES - hits) + '　'.repeat(hits);
      }
      showLives();

      function spawn(t) {
        const ang = ctx.rand(0, Math.PI * 2);
        const dist = Math.hypot(W, H) / 2 + 30;
        const sx = cx + Math.cos(ang) * dist;
        const sy = cy + Math.sin(ang) * dist;
        const range = TRAVEL[ctx.tier];
        const curve = Math.random() < CURVE[ctx.tier];
        const el = ctx.el('div', 'tool', null, ctx.pick(TOOLS));
        tools.push({
          el: el, sx: sx, sy: sy, born: t, travel: ctx.rand(range[0], range[1]),
          // 曲がるときの膨らみ（進む向きに直角）
          bend: curve ? ctx.rand(-1, 1) * dist * 0.5 : 0,
          nx: -Math.sin(ang), ny: Math.cos(ang),
          state: 'fly',
        });
      }

      function pos(tool, t) {
        const k = Math.min(1, (t - tool.born) / tool.travel);
        const bend = tool.bend * 4 * k * (1 - k);
        return {
          x: tool.sx + (cx - tool.sx) * k + tool.nx * bend,
          y: tool.sy + (cy - tool.sy) * k + tool.ny * bend,
          k: k,
        };
      }

      ctx.loop(function (dt, t) {
        if (deadAt !== null) return;
        const elapsed = ctx.elapsed();
        const flying = tools.filter(function (tl) { return tl.state === 'fly'; }).length;
        // 後半ほど間隔を短く
        const g = GAP[ctx.tier];
        const gap = g[0] - (g[0] - g[1]) * Math.min(1, elapsed / ctx.limit);
        if (elapsed >= nextSpawn && flying < MAX_AT_ONCE[ctx.tier]) {
          spawn(t);
          nextSpawn = elapsed + gap;
        }
        tools.forEach(function (tl) {
          if (tl.state === 'fly') {
            const p = pos(tl, t);
            tl.x = p.x;
            tl.y = p.y;
            tl.el.style.left = p.x + 'px';
            tl.el.style.top = p.y + 'px';
            if (p.k >= 1) {
              tl.state = 'gone';
              tl.el.remove();
              hits++;
              outcomes.push({ t: elapsed, ok: false });
              showLives();
              caseEl.classList.remove('hit');
              void caseEl.offsetWidth;
              caseEl.classList.add('hit');
              if (hits >= LIVES) {
                deadAt = elapsed;
                ctx.after(500, function () { ctx.finish(metrics()); });
              }
            }
          } else if (tl.state === 'back') {
            tl.x += tl.vx * dt;
            tl.y += tl.vy * dt;
            tl.rot += 720 * dt;
            tl.el.style.left = tl.x + 'px';
            tl.el.style.top = tl.y + 'px';
            tl.el.style.transform = 'rotate(' + tl.rot + 'deg)';
            if (tl.x < -60 || tl.x > W + 60 || tl.y < -60 || tl.y > H + 60) {
              tl.state = 'gone';
              tl.el.remove();
            }
          }
        });
      });

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        if (deadAt !== null) return;
        const p = ctx.pos(e);
        let best = null;
        let bestD = 46;   // 指でも当てやすいように大きめ
        tools.forEach(function (tl) {
          if (tl.state !== 'fly') return;
          const d = Math.hypot(tl.x - p.x, tl.y - p.y);
          if (d < bestD) { best = tl; bestD = d; }
        });
        if (!best) {
          empty++;
          return;
        }
        best.state = 'back';
        best.rot = 0;
        const len = Math.hypot(best.x - cx, best.y - cy) || 1;
        best.vx = (best.x - cx) / len * 700;
        best.vy = (best.y - cy) / len * 700;
        bounced++;
        outcomes.push({ t: ctx.elapsed(), ok: true });
        ctx.pop('カキーン！', best.x, best.y, 'good');
      });

      function metrics() {
        const survive = deadAt !== null ? deadAt : Math.min(ctx.elapsed(), ctx.limit);
        const mid = survive / 2;
        const rate = function (list) {
          return list.length ? list.filter(function (o) { return o.ok; }).length / list.length : null;
        };
        const r1 = rate(outcomes.filter(function (o) { return o.t < mid; }));
        const r2 = rate(outcomes.filter(function (o) { return o.t >= mid; }));
        return {
          survive: survive,
          decline: r1 !== null && r2 !== null ? r1 - r2 : null,
          empty: empty,
          bounced: bounced,
          hits: hits,
        };
      }

      return { end: metrics };
    },
  });
})(window);
