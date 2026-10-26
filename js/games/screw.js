/*
 * ねじ締め（大豊製作所）
 * レンチが左右に往復する。ねじの真上に来たときにタップすると締まる。
 *   offset : タップしたときのずれの平均（ねじの間隔を 1 とする）→ ていねい（−）
 *   early  : まだ遠い（ずれ 0.5 以上）のに押した回数 → チャレンジ（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;

  // 0→1→0 を行き来する（u は「端から端まで」の回数）
  function pingPong(u) {
    const m = u % 2;
    return m < 1 ? m : 2 - m;
  }

  BKF.games.register('screw', {
    start: function (ctx) {
      const W = ctx.width();
      const H = ctx.height();
      const lanes = ctx.tier === 2
        ? [{ count: 3, period: 1.3, amp: 1 }, { count: 2, period: 1.05, amp: 0.7 }]
        : [{ count: ctx.tier === 0 ? 3 : 4, period: ctx.tier === 0 ? 2.5 : 1.8, amp: 1 }];
      const tol = ctx.tier === 0 ? 0.26 : 0.2;
      const offsets = [];
      let early = 0;
      let done = 0;
      let total = 0;

      const laneH = H / lanes.length;
      lanes.forEach(function (lane, li) {
        const top = li * laneH;
        lane.top = top;
        lane.screwY = top + laneH * 0.7;
        lane.wrenchY = top + laneH * 0.3;
        lane.spacing = W / (lane.count + 1);
        const margin = lane.spacing * 0.6;
        const span = (W - margin * 2) * lane.amp;
        lane.minX = (W - span) / 2;
        lane.maxX = lane.minX + span;
        lane.phase = Math.random() * 2;
        lane.x = lane.minX;
        lane.screws = [];
        const line = ctx.el('div', 'screw-lane');
        line.style.top = (lane.screwY + 26) + 'px';
        for (let i = 0; i < lane.count; i++) {
          const x = lane.spacing * (i + 1);
          const guide = ctx.el('div', 'screw-guide');
          guide.style.left = x + 'px';
          guide.style.top = (lane.wrenchY + 30) + 'px';
          guide.style.height = (lane.screwY - lane.wrenchY - 54) + 'px';
          const el = ctx.el('div', 'screw');
          el.style.left = x + 'px';
          el.style.top = lane.screwY + 'px';
          lane.screws.push({ x: x, el: el, done: false });
          total++;
        }
        lane.wrench = ctx.el('div', 'wrench', null, '🔧');
        lane.wrench.style.top = lane.wrenchY + 'px';
      });

      ctx.loop(function (dt, t) {
        lanes.forEach(function (lane) {
          lane.x = lane.minX + (lane.maxX - lane.minX) * pingPong(t / lane.period + lane.phase);
          lane.wrench.style.left = lane.x + 'px';
        });
      });

      function metrics() {
        const mean = offsets.length ? offsets.reduce(function (a, b) { return a + b; }, 0) / offsets.length : null;
        return { offset: mean, early: early, done: done, total: total };
      }

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        const p = ctx.pos(e);
        const lane = lanes[Math.min(lanes.length - 1, Math.floor(p.y / laneH))];
        const left = lane.screws.filter(function (s) { return !s.done; });
        if (left.length === 0) return;
        lane.wrench.classList.remove('down');
        void lane.wrench.offsetWidth;
        lane.wrench.classList.add('down');
        const near = left.reduce(function (a, b) { return Math.abs(a.x - lane.x) <= Math.abs(b.x - lane.x) ? a : b; });
        const off = Math.abs(near.x - lane.x) / lane.spacing;
        offsets.push(off);
        if (off <= tol) {
          near.done = true;
          near.el.classList.add('done');
          done++;
          ctx.pop('しまった！', near.x, lane.screwY - 40, 'good');
          if (done === total) ctx.after(400, function () { ctx.finish(metrics()); });
        } else if (off >= 0.5) {
          early++;
          ctx.pop('まだ！', lane.x, lane.wrenchY + 40, 'bad');
        } else {
          ctx.pop('おしい！', lane.x, lane.wrenchY + 40);
        }
      });

      return { end: metrics };
    },
  });
})(window);
