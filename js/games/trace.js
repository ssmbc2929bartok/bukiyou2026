/*
 * なぞる線（IFA住宅設計室・設計図の線）
 * 方眼紙の上のお手本の線を2本、指でなぞる。
 *   初級：ゆるい波線 / 中級：波線＋ジグザグ / 上級：ぐるぐる＋角の多い線
 *   dev   : 指の位置と線のずれの平均（はみ出してもよい幅の半分を 1 とする）→ 手先（−）
 *   cover : お手本の線のうち、なぞれた割合 → ていねい（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const BAND = [20, 16, 14];   // はみ出してもよい幅の半分（px）

  // 点の列を、だいたい step px ごとの細かい点にする
  function densify(points, step) {
    const out = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
      for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function wave(W, H, periods, amp, phase) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push({ x: W * (0.1 + 0.8 * t), y: H * 0.5 + Math.sin(t * Math.PI * 2 * periods + phase) * H * amp });
    }
    return pts;
  }

  function zigzag(W, H, n, amp) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      pts.push({ x: W * (0.1 + 0.8 * i / n), y: H * 0.5 + (i % 2 ? -1 : 1) * H * amp });
    }
    return pts;
  }

  function spiral(W, H) {
    const pts = [];
    const r0 = Math.min(W, H) * 0.42;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 4;
      const r = r0 * (1 - 0.75 * t);
      pts.push({ x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r });
    }
    return pts;
  }

  // 四角い波（角が多い線）
  function steps(W, H, n, amp) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = W * (0.1 + 0.8 * i / n);
      const y = H * 0.5 + (i % 2 ? -1 : 1) * H * amp;
      if (i > 0) pts.push({ x: x, y: pts[pts.length - 1].y });
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function linesFor(tier, W, H) {
    if (tier === 0) return [wave(W, H, 1, 0.16, 0), wave(W, H, 1.5, 0.14, Math.PI)];
    if (tier === 1) return [wave(W, H, 2, 0.2, 0), zigzag(W, H, 5, 0.18)];
    return [spiral(W, H), steps(W, H, 6, 0.18)];
  }

  BKF.games.register('trace', {
    start: function (ctx) {
      const W = ctx.width();
      const H = ctx.height();
      const band = BAND[ctx.tier];
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const canvas = ctx.el('canvas');
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      const msg = ctx.el('div', 'game-msg', null, '1ほんめ');

      const lines = linesFor(ctx.tier, W, H).map(function (pts) {
        const dense = densify(pts, 4);
        return { pts: dense, covered: dense.map(function () { return false; }), count: 0 };
      });
      let li = 0;
      let drawing = null;   // なぞっている指の点
      const strokes = [];
      const dists = [];

      function grid() {
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = '#dbe9f6';
        g.lineWidth = 1;
        for (let x = 0; x < W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        for (let y = 0; y < H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      }

      function path(pts) {
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        pts.forEach(function (p) { g.lineTo(p.x, p.y); });
      }

      function draw() {
        grid();
        const line = lines[li];
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.strokeStyle = 'rgba(78, 168, 222, 0.18)';
        g.lineWidth = band * 2;
        path(line.pts);
        g.stroke();
        g.strokeStyle = '#4ea8de';
        g.lineWidth = 3;
        g.setLineDash([8, 8]);
        path(line.pts);
        g.stroke();
        g.setLineDash([]);
        // なぞれたところ
        g.strokeStyle = '#06d6a0';
        g.lineWidth = 4;
        line.pts.forEach(function (p, i) {
          if (!line.covered[i] || i === 0) return;
          g.beginPath();
          g.moveTo(line.pts[i - 1].x, line.pts[i - 1].y);
          g.lineTo(p.x, p.y);
          g.stroke();
        });
        // 指の線
        g.strokeStyle = '#ef476f';
        g.lineWidth = 5;
        strokes.forEach(function (s) {
          if (s.line !== li || s.pts.length < 2) return;
          path(s.pts);
          g.stroke();
        });
        const a = line.pts[0];
        const b = line.pts[line.pts.length - 1];
        g.fillStyle = '#06d6a0';
        g.beginPath(); g.arc(a.x, a.y, 12, 0, Math.PI * 2); g.fill();
        g.font = '24px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('🏁', b.x, b.y);
      }

      function addPoint(p) {
        const line = lines[li];
        let best = Infinity;
        line.pts.forEach(function (q, i) {
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < best) best = d;
          if (d <= band && !line.covered[i]) {
            line.covered[i] = true;
            line.count++;
          }
        });
        dists.push(best / band);
        drawing.pts.push(p);
      }

      function coverage(line) { return line.count / line.pts.length; }

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        if (li >= lines.length) return;
        drawing = { line: li, pts: [] };
        strokes.push(drawing);
        addPoint(ctx.pos(e));
        ctx.stage.setPointerCapture && ctx.stage.setPointerCapture(e.pointerId);
        draw();
      });
      ctx.on(ctx.stage, 'pointermove', function (e) {
        if (!drawing || li >= lines.length) return;
        addPoint(ctx.pos(e));
        draw();
        if (coverage(lines[li]) >= 0.97) next();
      });
      function up() {
        if (!drawing || li >= lines.length) return;
        drawing = null;
        if (coverage(lines[li]) >= 0.9) next();
      }
      ctx.on(ctx.stage, 'pointerup', up);
      ctx.on(ctx.stage, 'pointercancel', up);

      function next() {
        drawing = null;
        if (li === lines.length - 1) {
          ctx.pop('できた！', W / 2, H / 2, 'good');
          ctx.after(400, function () { ctx.finish(metrics()); });
          li = lines.length;   // これ以上なぞらない
          return;
        }
        li++;
        msg.textContent = '2ほんめ';
        ctx.pop('つぎの せん！', W / 2, H / 2, 'good');
        draw();
      }

      function metrics() {
        const covers = lines.map(coverage);
        return {
          dev: dists.length ? dists.reduce(function (a, b) { return a + b; }, 0) / dists.length : null,
          cover: covers.reduce(function (a, b) { return a + b; }, 0) / covers.length,
          lines: Math.min(li, lines.length),
        };
      }

      draw();
      return { end: metrics };
    },
  });
})(window);
