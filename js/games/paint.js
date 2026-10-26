/*
 * 塗り絵（ダイコロ）
 * 形の中にうすい線で区画がある。上のお手本と同じ配色を目指して自由に塗る。
 * 道具：ふつうのふで・ふとふで・ほそふで（6色、消しゴムなし）。「できた！」か時間切れで終わり。
 *   初級：丸いワッペン / 中級：星（細い先） / 上級：歯車（細い歯）
 *   outside : 塗った所のうち、形の外の割合 → ていねい（−）
 *   thin    : 細い所を塗ったうち、ほそふでで塗った割合 → ひらめき（＋）（細い所がない初級は記録しない）
 *   match   : 区画ごとにいちばん多い色が、お手本の色と同じだった区画の割合 → センス（＋）
 *   cover   : 形の中を塗れた割合（記録だけ）
 * 判定は画面を 4px のマス目に分けて、どのマスが何色・どの道具で塗られたかで数える。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5'];
  const TOOLS = [
    { id: 'normal', label: 'ふつう', r: 9 },
    { id: 'wide', label: 'ふと', r: 18 },
    { id: 'thin', label: 'ほそ', r: 4.5 },
  ];
  const CELL = 4;
  const TOP = 78;
  const BOTTOM = 104;

  function circle(cx, cy, r) {
    const p = new Path2D();
    p.arc(cx, cy, r, 0, Math.PI * 2);
    return p;
  }

  function star(cx, cy, R, r) {
    const p = new Path2D();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? r : R;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    p.closePath();
    return p;
  }

  function gear(cx, cy, R) {
    const p = new Path2D();
    p.arc(cx, cy, R * 0.62, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const w = R * 0.11;
      const pts = [[-w, R * 0.55], [w, R * 0.55], [w, R], [-w, R]].map(function (q) {
        return [cx + q[0] * Math.cos(a) - q[1] * Math.sin(a), cy + q[0] * Math.sin(a) + q[1] * Math.cos(a)];
      });
      p.moveTo(pts[0][0], pts[0][1]);
      pts.slice(1).forEach(function (q) { p.lineTo(q[0], q[1]); });
      p.closePath();
    }
    return p;
  }

  /*
   * 形の定義
   *   shape   : 形全体
   *   regions : 区画（先に当てはまったものが、その点の区画）
   *   thin    : 細い所かどうか（(x, y) → true/false）
   */
  function design(tier, cx, cy, R) {
    if (tier === 0) {
      return {
        shape: circle(cx, cy, R),
        regions: [circle(cx, cy, R * 0.5), circle(cx, cy, R)],
        lines: [circle(cx, cy, R * 0.5)],
        thin: null,
      };
    }
    if (tier === 1) {
      const s = star(cx, cy, R, R * 0.45);
      return {
        shape: s,
        regions: [circle(cx, cy, R * 0.36), s],
        lines: [circle(cx, cy, R * 0.36)],
        thin: function (x, y) { return Math.hypot(x - cx, y - cy) > R * 0.66; },
      };
    }
    const gshape = gear(cx, cy, R);
    return {
      shape: gshape,
      regions: [circle(cx, cy, R * 0.25), circle(cx, cy, R * 0.62), gshape],
      lines: [circle(cx, cy, R * 0.25), circle(cx, cy, R * 0.62)],
      thin: function (x, y) { return Math.hypot(x - cx, y - cy) > R * 0.62; },
    };
  }

  BKF.games.register('paint', {
    start: function (ctx) {
      const W = ctx.width();
      const H = ctx.height();
      const AW = W;
      const AH = H - TOP - BOTTOM;
      const S = Math.min(AW, AH);
      const scale = S / 300;
      const dpr = Math.min(2, root.devicePixelRatio || 1);

      const top = ctx.el('div', 'paint-top', null, '<span>おてほんと おなじ いろで ぬろう！</span>');
      const sample = ctx.el('canvas', 'paint-sample', top);
      sample.style.position = 'static';
      sample.style.width = '64px';
      sample.style.height = '64px';

      function layer() {
        const c = ctx.el('canvas');
        c.style.top = TOP + 'px';
        c.style.height = AH + 'px';
        c.style.bottom = 'auto';
        c.width = AW * dpr;
        c.height = AH * dpr;
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        return { c: c, g: g };
      }
      const paintLayer = layer();
      const lineLayer = layer();
      lineLayer.c.style.pointerEvents = 'none';

      const cx = AW / 2;
      const cy = AH / 2;
      const R = S * 0.44;
      const d = design(ctx.tier, cx, cy, R);
      const sampleColors = ctx.shuffle(COLORS.map(function (c, i) { return i; })).slice(0, d.regions.length);

      // 線（形の外側と区画の線）
      const lg = lineLayer.g;
      lg.lineJoin = 'round';
      lg.strokeStyle = '#2b2d42';
      lg.lineWidth = 4;
      lg.stroke(d.shape);
      lg.strokeStyle = 'rgba(43, 45, 66, 0.35)';
      lg.lineWidth = 2;
      lg.setLineDash([6, 6]);
      d.lines.forEach(function (p) { lg.stroke(p); });

      // お手本
      const sg = sample.getContext('2d');
      sample.width = 64 * dpr;
      sample.height = 64 * dpr;
      sg.scale(dpr * 64 / AW, dpr * 64 / AW);
      sg.translate(0, (AW - AH) / 2);
      for (let i = d.regions.length - 1; i >= 0; i--) {
        sg.fillStyle = COLORS[sampleColors[i]];
        sg.fill(d.regions[i]);
      }
      sg.strokeStyle = '#2b2d42';
      sg.lineWidth = 4;
      sg.stroke(d.shape);

      // マス目ごとの情報
      const gw = Math.ceil(AW / CELL);
      const gh = Math.ceil(AH / CELL);
      const n = gw * gh;
      const inside = new Uint8Array(n);
      const region = new Int8Array(n).fill(-1);
      const thinCell = new Uint8Array(n);
      const color = new Int8Array(n).fill(-1);
      const tool = new Int8Array(n).fill(-1);
      const probe = document.createElement('canvas').getContext('2d');
      for (let j = 0; j < gh; j++) {
        for (let i = 0; i < gw; i++) {
          const x = i * CELL + CELL / 2;
          const y = j * CELL + CELL / 2;
          const k = j * gw + i;
          if (!probe.isPointInPath(d.shape, x, y)) continue;
          inside[k] = 1;
          for (let r = 0; r < d.regions.length; r++) {
            if (probe.isPointInPath(d.regions[r], x, y)) { region[k] = r; break; }
          }
          if (d.thin && d.thin(x, y)) thinCell[k] = 1;
        }
      }

      // 道具と色
      const bar = ctx.el('div', 'paint-bar');
      const toolRow = ctx.el('div', 'paint-row', bar);
      const colorRow = ctx.el('div', 'paint-row', bar);
      let curTool = 0;
      let curColor = 0;
      const toolBtns = TOOLS.map(function (t, i) {
        const b = ctx.el('button', 'game-btn sub paint-tool', toolRow,
          '<span class="dot" style="width:' + (t.r * 1.2) + 'px;height:' + (t.r * 1.2) + 'px"></span>' + t.label);
        b.type = 'button';
        ctx.on(b, 'click', function () { curTool = i; refresh(); });
        return b;
      });
      const doneBtn = ctx.el('button', 'game-btn paint-tool', toolRow, 'できた！');
      doneBtn.type = 'button';
      ctx.on(doneBtn, 'click', function () { ctx.finish(metrics()); });
      const colorBtns = COLORS.map(function (c, i) {
        const b = ctx.el('button', 'paint-color', colorRow);
        b.type = 'button';
        b.style.background = c;
        ctx.on(b, 'click', function () { curColor = i; refresh(); });
        return b;
      });
      function refresh() {
        toolBtns.forEach(function (b, i) { b.classList.toggle('sel', i === curTool); });
        colorBtns.forEach(function (b, i) { b.classList.toggle('sel', i === curColor); });
      }
      refresh();

      // 塗る
      const pg = paintLayer.g;
      pg.lineCap = 'round';
      pg.lineJoin = 'round';
      let last = null;

      function mark(x, y, r) {
        const i0 = Math.max(0, Math.floor((x - r) / CELL));
        const i1 = Math.min(gw - 1, Math.floor((x + r) / CELL));
        const j0 = Math.max(0, Math.floor((y - r) / CELL));
        const j1 = Math.min(gh - 1, Math.floor((y + r) / CELL));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const px = i * CELL + CELL / 2;
            const py = j * CELL + CELL / 2;
            if (Math.hypot(px - x, py - y) <= r) {
              const k = j * gw + i;
              color[k] = curColor;
              tool[k] = curTool;
            }
          }
        }
      }

      function paintTo(p) {
        const r = TOOLS[curTool].r * scale;
        pg.strokeStyle = COLORS[curColor];
        pg.fillStyle = COLORS[curColor];
        pg.lineWidth = r * 2;
        const from = last || p;
        pg.beginPath();
        pg.moveTo(from.x, from.y);
        pg.lineTo(p.x, p.y);
        pg.stroke();
        pg.beginPath();
        pg.arc(p.x, p.y, r, 0, Math.PI * 2);
        pg.fill();
        const dist = Math.hypot(p.x - from.x, p.y - from.y);
        const steps = Math.max(1, Math.ceil(dist / (r / 2)));
        for (let s = 0; s <= steps; s++) {
          mark(from.x + (p.x - from.x) * s / steps, from.y + (p.y - from.y) * s / steps, r);
        }
        last = p;
      }

      function areaPos(e) {
        const p = ctx.pos(e);
        return { x: p.x, y: p.y - TOP };
      }

      ctx.on(paintLayer.c, 'pointerdown', function (e) {
        last = null;
        paintTo(areaPos(e));
        paintLayer.c.setPointerCapture && paintLayer.c.setPointerCapture(e.pointerId);
      });
      ctx.on(paintLayer.c, 'pointermove', function (e) {
        if (last) paintTo(areaPos(e));
      });
      ctx.on(paintLayer.c, 'pointerup', function () { last = null; });
      ctx.on(paintLayer.c, 'pointercancel', function () { last = null; });

      function metrics() {
        let painted = 0;
        let out = 0;
        let insideAll = 0;
        let insidePainted = 0;
        let thinPainted = 0;
        let thinByThin = 0;
        const perRegion = d.regions.map(function () { return { cells: 0, painted: 0, colors: COLORS.map(function () { return 0; }) }; });
        for (let k = 0; k < n; k++) {
          if (inside[k]) {
            insideAll++;
            perRegion[region[k]].cells++;
          }
          if (color[k] < 0) continue;
          painted++;
          if (!inside[k]) { out++; continue; }
          insidePainted++;
          const pr = perRegion[region[k]];
          pr.painted++;
          pr.colors[color[k]]++;
          if (thinCell[k]) {
            thinPainted++;
            if (TOOLS[tool[k]].id === 'thin') thinByThin++;
          }
        }
        let matched = 0;
        perRegion.forEach(function (pr, r) {
          if (pr.cells === 0 || pr.painted / pr.cells < 0.15) return;
          const top = pr.colors.indexOf(Math.max.apply(null, pr.colors));
          if (top === sampleColors[r]) matched++;
        });
        return {
          outside: painted ? out / painted : null,
          thin: d.thin && thinPainted >= 5 ? thinByThin / thinPainted : null,
          match: matched / d.regions.length,
          cover: insideAll ? insidePainted / insideAll : 0,
        };
      }

      return { end: metrics };
    },
  });
})(window);
