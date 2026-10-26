/*
 * 回路（ノボル電機）
 * 同じ色の点どうしを、指でなぞってつなぐ。線は交差できない（ぶつかったらその線は消える）。
 * 全部つながるとスピーカーから音の波が出る（音は出さない）。問題は js/data/circuit.js から選ぶ。
 *   redraws : 引き直した回数（ぶつかって消えた・もう一度引き直した）→ チャレンジ（＋）・かんがえる（−）
 *   solved  : 全部つなげたら 1 → かんがえる（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#4cc9f0', '#f78c6b', '#9b5de5'];

  BKF.games.register('circuit', {
    start: function (ctx) {
      const puzzle = ctx.pick(BKF.circuitPuzzles[ctx.tier]);
      const n = puzzle.n;
      const W = ctx.width();
      const H = ctx.height();
      const size = Math.floor(Math.min(W - 24, H - 80) / n);
      const speaker = ctx.el('div', 'circuit-speaker', null, '🔈');
      const board = ctx.el('div', 'circuit-board');
      board.style.width = (size * n) + 'px';
      board.style.height = (size * n) + 'px';
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const canvas = ctx.el('canvas', null, board);
      canvas.width = size * n * dpr;
      canvas.height = size * n * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);

      // 点（端）の位置
      const ends = {};
      puzzle.pairs.forEach(function (p, i) {
        ends[p[0] + ',' + p[1]] = i;
        ends[p[2] + ',' + p[3]] = i;
      });
      const paths = puzzle.pairs.map(function () { return null; });   // つないだ（つなぎかけの）線
      const done = puzzle.pairs.map(function () { return false; });
      let active = null;    // なぞっている色
      let redraws = 0;
      let finished = false;

      function cellAt(e) {
        const r = board.getBoundingClientRect();
        const c = Math.floor((e.clientX - r.left) / size);
        const rr = Math.floor((e.clientY - r.top) / size);
        if (c < 0 || rr < 0 || c >= n || rr >= n) return null;
        return [rr, c];
      }

      function owner(cell) {
        for (let i = 0; i < paths.length; i++) {
          if (paths[i] && paths[i].some(function (q) { return q[0] === cell[0] && q[1] === cell[1]; })) return i;
        }
        return -1;
      }

      function draw() {
        g.clearRect(0, 0, size * n, size * n);
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.lineWidth = 1;
        for (let i = 1; i < n; i++) {
          g.beginPath(); g.moveTo(i * size, 0); g.lineTo(i * size, size * n); g.stroke();
          g.beginPath(); g.moveTo(0, i * size); g.lineTo(size * n, i * size); g.stroke();
        }
        g.lineCap = 'round';
        g.lineJoin = 'round';
        paths.forEach(function (path, i) {
          if (!path || path.length < 2) return;
          g.strokeStyle = COLORS[i];
          g.lineWidth = size * 0.3;
          g.beginPath();
          path.forEach(function (q, j) {
            const x = q[1] * size + size / 2;
            const y = q[0] * size + size / 2;
            if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
          });
          g.stroke();
        });
        puzzle.pairs.forEach(function (p, i) {
          [[p[0], p[1]], [p[2], p[3]]].forEach(function (q) {
            g.fillStyle = COLORS[i];
            g.beginPath();
            g.arc(q[1] * size + size / 2, q[0] * size + size / 2, size * 0.32, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = '#ffffff';
            g.lineWidth = 3;
            g.stroke();
          });
        });
      }

      function crash(at) {
        paths[active] = null;
        done[active] = false;
        active = null;
        redraws++;
        const r = board.getBoundingClientRect();
        const s = ctx.stage.getBoundingClientRect();
        ctx.pop('つながらないよ', r.left - s.left + at[1] * size + size / 2, r.top - s.top + at[0] * size, 'bad');
        draw();
      }

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        if (finished) return;
        const cell = cellAt(e);
        if (!cell) return;
        const color = ends[cell[0] + ',' + cell[1]];
        if (color === undefined) return;
        if (paths[color]) redraws++;      // もう一度引き直す
        paths[color] = [cell];
        done[color] = false;
        active = color;
        ctx.stage.setPointerCapture && ctx.stage.setPointerCapture(e.pointerId);
        draw();
      });

      // となりのマスへ1つ進む。進めなければ false
      function stepTo(cell) {
        const path = paths[active];
        // 来た道をもどるときは線を短くする
        const back = path.findIndex(function (q) { return q[0] === cell[0] && q[1] === cell[1]; });
        if (back !== -1) {
          path.length = back + 1;
          return true;
        }
        const end = ends[cell[0] + ',' + cell[1]];
        if (end !== undefined && end !== active) { crash(cell); return false; }
        const own = owner(cell);
        if (own !== -1 && own !== active) { crash(cell); return false; }
        path.push(cell);
        if (end === active) {
          done[active] = true;
          active = null;
          if (done.every(Boolean)) {
            finished = true;
            speaker.textContent = '🔊 ♪ ♫';
            speaker.classList.add('on');
            ctx.after(900, function () { ctx.finish(metrics()); });
          }
          return false;
        }
        return true;
      }

      ctx.on(ctx.stage, 'pointermove', function (e) {
        if (active === null) return;
        const cell = cellAt(e);
        if (!cell) return;
        // 指が速く動いてマスを飛ばしたときは、1マスずつたどる
        for (let guard = 0; guard < n * 2 && active !== null; guard++) {
          const path = paths[active];
          const last = path[path.length - 1];
          const dr = cell[0] - last[0];
          const dc = cell[1] - last[1];
          if (dr === 0 && dc === 0) break;
          const next = Math.abs(dr) >= Math.abs(dc)
            ? [last[0] + Math.sign(dr), last[1]]
            : [last[0], last[1] + Math.sign(dc)];
          if (!stepTo(next)) break;
        }
        draw();
      });

      function up() { active = null; }
      ctx.on(ctx.stage, 'pointerup', up);
      ctx.on(ctx.stage, 'pointercancel', up);

      function metrics() {
        return {
          redraws: redraws,
          solved: done.every(Boolean) ? 1 : 0,
          connected: done.filter(Boolean).length,
          puzzle: BKF.circuitPuzzles[ctx.tier].indexOf(puzzle),
        };
      }

      draw();
      return { end: metrics };
    },
  });
})(window);
