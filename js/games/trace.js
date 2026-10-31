/*
 * なぞる線（IFA住宅設計室・設計図の線）
 * 方眼紙の上のお手本の線を2本、指でなぞる。
 * 線の種類は難易度ごとに4つあり、毎回2本をランダムに選ぶ（v2.3.0 で増やした）。大きさ・向き（左右反対）も少しずつ変える。
 *   初級（ゆるい線）：ゆるい波 / やま / たに / ななめの波
 *   中級（曲がりや角がある線）：波 / ジグザグ / やね / ドア（アーチ）
 *   上級（長い線・角の多い線）：ぐるぐる / 四角い波 / いえの形（ひと筆） / かいだん
 *   設計図らしい線（やね・ドア・いえ・かいだん）は、IFA住宅設計室にちなむ。
 * なぞりかたは ひと筆：みどりの まる（スタート）からしか なぞりはじめられない。指をはなしたら、その線はおわり（次の線へ）。
 *   shapes : 出た線の種類（記録だけ。例 "roof,wave"）
 *   misstart : スタートでない所から なぞろうとした回数（記録だけ）
 *   dev   : 指の位置と線のずれの平均（はみ出してもよい幅の半分を 1 とする）→ 手先（−）
 *   cover : お手本の線のうち、なぞれた割合 → ていねい（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const BAND = [20, 16, 14];   // はみ出してもよい幅の半分（px）
  const START_R = 30;          // スタートの まるとして受けつける半径（px）

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

  function spiral(W, H, dir) {
    const pts = [];
    const r0 = Math.min(W, H) * 0.42;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 4 * (dir || 1);
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

  // t（0〜1）ごとの y の割合から、左から右への線を作る
  function curve(W, H, fy) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push({ x: W * (0.1 + 0.8 * t), y: H * fy(t) });
    }
    return pts;
  }

  // 割合で書いた点 [[x, y], ...] を画面の点にする
  function at(W, H, list) {
    return list.map(function (q) { return { x: W * q[0], y: H * q[1] }; });
  }

  // 線の種類。id は記録に残す名前
  const POOLS = [
    // 初級：ゆるい線
    [
      { id: 'wave', make: function (W, H, ctx) { return wave(W, H, ctx.rand(1, 1.5), ctx.rand(0.12, 0.16), ctx.rand(0, Math.PI * 2)); } },
      { id: 'hill', make: function (W, H, ctx) { const h = ctx.rand(0.22, 0.3); return curve(W, H, function (t) { return 0.62 - Math.sin(Math.PI * t) * h; }); } },
      { id: 'valley', make: function (W, H, ctx) { const h = ctx.rand(0.22, 0.3); return curve(W, H, function (t) { return 0.38 + Math.sin(Math.PI * t) * h; }); } },
      { id: 'slope', make: function (W, H, ctx) { const a = ctx.rand(0.05, 0.08); return curve(W, H, function (t) { return 0.7 - 0.4 * t + Math.sin(Math.PI * 2 * t) * a; }); } },
    ],
    // 中級：曲がりや角がある線
    [
      { id: 'wave', make: function (W, H, ctx) { return wave(W, H, ctx.rand(2, 2.5), ctx.rand(0.17, 0.21), ctx.rand(0, Math.PI * 2)); } },
      { id: 'zigzag', make: function (W, H, ctx) { return zigzag(W, H, ctx.randInt(4, 6), ctx.rand(0.15, 0.19)); } },
      { id: 'roof', make: function (W, H, ctx) {
        const top = ctx.rand(0.25, 0.32);
        return at(W, H, [[0.1, 0.7], [0.28, 0.7], [0.5, top], [0.72, 0.7], [0.9, 0.7]]);
      } },
      { id: 'door', make: function (W, H) {
        // ドアの形：下から上がって、上は半円、また下がる
        const pts = at(W, H, [[0.28, 0.82], [0.28, 0.48]]);
        const cx = W * 0.5;
        const cy = H * 0.48;
        const r = W * 0.22;
        for (let i = 1; i < 30; i++) {
          const a = Math.PI + Math.PI * i / 30;
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return pts.concat(at(W, H, [[0.72, 0.48], [0.72, 0.82]]));
      } },
    ],
    // 上級：長い線・角の多い線
    [
      { id: 'spiral', make: function (W, H, ctx) { return spiral(W, H, ctx.pick([1, -1])); } },
      { id: 'steps', make: function (W, H, ctx) { return steps(W, H, ctx.randInt(5, 7), ctx.rand(0.15, 0.19)); } },
      { id: 'house', make: function (W, H) {
        // いえの形をひと筆で：左下 → 左の壁 → やね → 右の壁 → 床（出発の点と重ならないよう、少し手前で終わる）
        return at(W, H, [[0.2, 0.85], [0.2, 0.45], [0.5, 0.15], [0.8, 0.45], [0.8, 0.85], [0.3, 0.85]]);
      } },
      { id: 'stairs', make: function (W, H, ctx) {
        // かいだん：左下から右上へ
        const n = ctx.randInt(4, 5);
        const pts = [{ x: W * 0.1, y: H * 0.85 }];
        for (let i = 0; i < n; i++) {
          const x = W * (0.1 + 0.8 * (i + 1) / n);
          const y = H * (0.85 - 0.7 * (i + 1) / n);
          pts.push({ x: x, y: pts[pts.length - 1].y });
          pts.push({ x: x, y: y });
        }
        return pts;
      } },
    ],
  ];

  // 2本をランダムに選ぶ。半分くらいは左右を反対にする（右から左へ なぞる）
  function linesFor(ctx, W, H) {
    return ctx.shuffle(POOLS[ctx.tier]).slice(0, 2).map(function (kind) {
      let pts = kind.make(W, H, ctx);
      if (Math.random() < 0.5) pts = pts.map(function (q) { return { x: W - q.x, y: q.y }; });
      return { id: kind.id, pts: pts };
    });
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

      const lines = linesFor(ctx, W, H).map(function (l) {
        const dense = densify(l.pts, 4);
        return { id: l.id, pts: dense, covered: dense.map(function () { return false; }), count: 0 };
      });
      let li = 0;
      let drawing = null;   // なぞっている指の点
      let misstart = 0;
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
        if (li >= lines.length || drawing) return;
        // スタート（みどりの まる）からしか なぞりはじめられない
        const p = ctx.pos(e);
        const s = lines[li].pts[0];
        if (Math.hypot(p.x - s.x, p.y - s.y) > START_R) {
          misstart++;
          ctx.pop('みどりの まるから はじめてね', s.x, s.y - 34);
          return;
        }
        drawing = { line: li, pts: [] };
        strokes.push(drawing);
        addPoint(p);
        ctx.stage.setPointerCapture && ctx.stage.setPointerCapture(e.pointerId);
        draw();
      });
      ctx.on(ctx.stage, 'pointermove', function (e) {
        if (!drawing || li >= lines.length) return;
        addPoint(ctx.pos(e));
        draw();
        if (coverage(lines[li]) >= 0.97) next();
      });
      // ひと筆：指をはなしたら、どこまで なぞれていても その線はおわり
      function up() {
        if (!drawing || li >= lines.length) return;
        drawing = null;
        next();
      }
      ctx.on(ctx.stage, 'pointerup', up);
      ctx.on(ctx.stage, 'pointercancel', up);

      function next() {
        drawing = null;
        if (li === lines.length - 1) {
          ctx.pop(coverage(lines[li]) >= 0.9 ? 'できた！' : 'おしまい！', W / 2, H / 2, 'good');
          ctx.after(400, function () { ctx.finish(metrics()); });
          li = lines.length;   // これ以上なぞらない
          return;
        }
        ctx.pop(coverage(lines[li]) >= 0.9 ? 'できた！ つぎの せん！' : 'つぎの せん！', W / 2, H / 2, 'good');
        li++;
        msg.textContent = '2ほんめ';
        draw();
      }

      function metrics() {
        const covers = lines.map(coverage);
        return {
          dev: dists.length ? dists.reduce(function (a, b) { return a + b; }, 0) / dists.length : null,
          cover: covers.reduce(function (a, b) { return a + b; }, 0) / covers.length,
          lines: Math.min(li, lines.length),
          shapes: lines.map(function (l) { return l.id; }).join(','),
          misstart: misstart,
        };
      }

      draw();
      return { end: metrics };
    },
  });
})(window);
