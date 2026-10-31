/*
 * ブロック命令（大阪工業大学）
 * 矢印ブロック（画面の上下左右）を並べて、ロボットをゴール（大阪工業大学 枚方キャンパスの建物）まで動かす。
 * 「ぜんぶ じっこう」と「1つずつ じっこう」がある。壁や外にぶつかったら止まって最初に戻る。
 *   初級：4×4・まっすぐ / 中級：5×5・曲がる / 上級：6×6・並べられる数に上限があり「×2」「×3」が必要
 *   道は毎回自動で作る（先にゴールまでの道を作り、そのまわりに壁を置く）。
 *   retries : やり直した回数 → かんがえる（−）
 *   step    : 「1つずつ」を押した割合 → チャレンジ（＋）・かんがえる（−）
 *   first   : 最初に実行するまでの秒数 → リーダー（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const SIZE = [4, 5, 6];
  const DIRS = { up: [-1, 0, '↑'], down: [1, 0, '↓'], left: [0, -1, '←'], right: [0, 1, '→'] };
  const STEP_MS = 260;

  // ゴールまでの道を作る。segs: 曲がる回数+1、len: 1区間の長さの範囲
  function makePath(ctx, n, segs, len) {
    for (let t = 0; t < 500; t++) {
      let r = ctx.randInt(0, n - 1);
      let c = ctx.randInt(0, n - 1);
      const cells = [[r, c]];
      const seen = {};
      seen[r + ',' + c] = true;
      const moves = [];
      let prev = null;
      let ok = true;
      for (let s = 0; s < segs && ok; s++) {
        const options = Object.keys(DIRS).filter(function (d) {
          if (!prev) return true;
          // 前と同じ向き・逆向きは使わない（曲がる）
          return DIRS[d][0] !== 0 ? DIRS[prev][0] === 0 : DIRS[prev][1] === 0;
        });
        const dir = ctx.pick(options);
        const L = ctx.randInt(len[0], len[1]);
        for (let i = 0; i < L; i++) {
          r += DIRS[dir][0];
          c += DIRS[dir][1];
          if (r < 0 || c < 0 || r >= n || c >= n || seen[r + ',' + c]) { ok = false; break; }
          seen[r + ',' + c] = true;
          cells.push([r, c]);
        }
        moves.push({ dir: dir, count: L });
        prev = dir;
      }
      if (ok) return { cells: cells, moves: moves };
    }
    return null;
  }

  /*
   * 曲がる回数がいちばん少ない道（＝必要なブロックの数がいちばん少ない道）
   * 戻り値 { segments: まっすぐの区間の数, cells: 通るマス } か null
   */
  function fewestTurns(n, walls, start, goal) {
    const queue = [{ r: start[0], c: start[1], segs: 0, dir: null, cells: [] }];
    const best = {};
    while (queue.length) {
      queue.sort(function (a, b) { return a.segs - b.segs; });
      const cur = queue.shift();
      if (cur.r === goal[0] && cur.c === goal[1]) return { segments: cur.segs, cells: cur.cells };
      Object.keys(DIRS).forEach(function (d) {
        const r = cur.r + DIRS[d][0];
        const c = cur.c + DIRS[d][1];
        if (r < 0 || c < 0 || r >= n || c >= n || walls[r + ',' + c]) return;
        const segs = cur.segs + (d === cur.dir ? 0 : 1);
        const key = r + ',' + c + ',' + d;
        if (best[key] !== undefined && best[key] <= segs) return;
        best[key] = segs;
        queue.push({ r: r, c: c, segs: segs, dir: d, cells: cur.cells.concat([[r, c]]) });
      });
    }
    return null;
  }

  BKF.games.register('robot', {
    start: function (ctx) {
      const tier = ctx.tier;
      const n = SIZE[tier];
      let plan;
      let walls;
      let onPath;
      // 用意した道より少ないブロックで行ける近道があれば、その道に壁を足してふさぐ。
      // 道そのもののマスを通る近道（U字の道など）はふさげないので、道から作り直す。
      for (let attempt = 0; attempt < 40; attempt++) {
        plan = tier === 0 ? makePath(ctx, n, 1, [2, 3])
          : tier === 1 ? makePath(ctx, n, ctx.randInt(2, 3), [1, 3])
          : makePath(ctx, n, ctx.randInt(3, 4), [2, 3]);
        onPath = {};
        plan.cells.forEach(function (q) { onPath[q[0] + ',' + q[1]] = true; });
        walls = {};
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (!onPath[r + ',' + c] && Math.random() < 0.35) walls[r + ',' + c] = true;
          }
        }
        let short = fewestTurns(n, walls, plan.cells[0], plan.cells[plan.cells.length - 1]);
        for (let guard = 0; guard < 60 && short && short.segments < plan.moves.length; guard++) {
          const block = short.cells.filter(function (q) { return !onPath[q[0] + ',' + q[1]]; });
          if (!block.length) break;
          const q = ctx.pick(block);
          walls[q[0] + ',' + q[1]] = true;
          short = fewestTurns(n, walls, plan.cells[0], plan.cells[plan.cells.length - 1]);
        }
        if (!short || short.segments >= plan.moves.length) break;
      }
      const maxBlocks = tier === 0 ? 6 : tier === 1 ? 8 : plan.moves.length;
      const start = plan.cells[0];
      const goal = plan.cells[plan.cells.length - 1];

      const W = ctx.width();
      const H = ctx.height();
      const board = ctx.el('div', 'robot-board');
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const el = ctx.el('div', 'robot-cell' + (walls[r + ',' + c] ? ' wall' : ''), board);
          // ゴールのマス：たてものの絵に「ゴール」と書いて、どこへ向かうのかを分かるようにする
          if (r === goal[0] && c === goal[1]) {
            el.classList.add('goal');
            el.innerHTML = '<img src="assets/img/oit-tower.webp" alt=""><span class="robot-goal-label">ゴール</span>';
          }
        }
      }
      const sprite = ctx.el('img', 'robot-sprite', board);
      sprite.src = 'assets/img/robot.png';
      sprite.alt = 'ロボット';

      const program = ctx.el('div', 'robot-program');
      const pad = ctx.el('div', 'robot-pad');
      let cell = 0;          // マスの大きさ。ボタンを並べたあとに、残りの高さから決める（layout）

      let blocks = [];
      let pos = start.slice();
      let busy = false;
      let stepIndex = 0;     // 「1つずつ」で次に動かすブロック
      let retries = 0;
      let allRuns = 0;
      let stepRuns = 0;
      let firstRun = null;
      let solved = false;

      function place(p) {
        sprite.style.left = (3 + p[1] * (cell + 3)) + 'px';
        sprite.style.top = (3 + p[0] * (cell + 3)) + 'px';
      }

      function renderProgram() {
        let html = '';
        for (let i = 0; i < maxBlocks; i++) {
          const b = blocks[i];
          if (b) {
            html += '<span class="robot-block' + (i === stepIndex && stepIndex > 0 ? ' now' : '') + '">' +
              DIRS[b.dir][2] + (b.count > 1 ? '×' + b.count : '') + '</span>';
          } else {
            html += '<span class="robot-block slot">・</span>';
          }
        }
        program.innerHTML = html;
      }

      // ボタンは2段：上に やじるし・×2・×3・けす、下に 1つずつ・ぜんぶ じっこう
      const rowTop = ctx.el('div', 'robot-row', pad);
      const rowRun = ctx.el('div', 'robot-row run', pad);

      function button(label, cls, fn, row) {
        const b = ctx.el('button', 'game-btn ' + (cls || ''), row || rowTop, label);
        b.type = 'button';
        ctx.on(b, 'click', function () { if (!busy && !solved) fn(); });
        return b;
      }

      ['up', 'down', 'left', 'right'].forEach(function (d) {
        button(DIRS[d][2], 'sub', function () {
          if (blocks.length >= maxBlocks) { ctx.pop('もう いっぱい！', W / 2, H - 120, 'bad'); return; }
          blocks.push({ dir: d, count: 1 });
          renderProgram();
        });
      });
      if (tier === 2) {
        [2, 3].forEach(function (k) {
          button('×' + k, 'sub', function () {
            if (!blocks.length) return;
            blocks[blocks.length - 1].count = k;
            renderProgram();
          });
        });
      }
      button('けす', 'sub erase', function () {
        blocks.pop();
        if (stepIndex > blocks.length) stepIndex = blocks.length;
        renderProgram();
      });
      button('1つずつ', '', function () { run(true); }, rowRun);
      button('ぜんぶ じっこう', '', function () { run(false); }, rowRun);

      // 下から ボタン → ならべた ブロック → 盤 の順に、重ならないように置く。
      // 前は盤の大きさを決め打ちしていたので、低い画面ではブロックの列がボタンの下にかくれていた。
      function layout() {
        const gap = 3;
        const progH = 44;
        const padTop = H - 8 - pad.offsetHeight;
        const progTop = padTop - 10 - progH;
        const boardSpace = progTop - 10 - 8 - gap * 2;
        cell = Math.floor(Math.min((W - 24 - gap * (n + 1)) / n, (boardSpace - gap * (n - 1)) / n, 64));
        board.style.gridTemplateColumns = 'repeat(' + n + ', ' + cell + 'px)';
        board.style.gridTemplateRows = 'repeat(' + n + ', ' + cell + 'px)';
        sprite.style.width = cell + 'px';
        sprite.style.height = cell + 'px';
        // 盤が小さくて余ったときは、盤とブロックの列をボタンのすぐ上に寄せる
        const boardH = n * cell + gap * (n + 1);
        const boardTop = Math.max(8, progTop - 10 - boardH);
        board.style.top = boardTop + 'px';
        program.style.top = (boardTop + boardH + 10) + 'px';      }
      layout();

      function reset() {
        retries++;
        stepIndex = 0;
        pos = start.slice();
        place(pos);
        renderProgram();
      }

      // 1マス動く。ぶつかったら false
      function move(dir) {
        const next = [pos[0] + DIRS[dir][0], pos[1] + DIRS[dir][1]];
        if (next[0] < 0 || next[1] < 0 || next[0] >= n || next[1] >= n || walls[next[0] + ',' + next[1]]) {
          sprite.classList.remove('bump');
          void sprite.offsetWidth;
          sprite.classList.add('bump');
          return false;
        }
        pos = next;
        place(pos);
        return true;
      }

      function atGoal() { return pos[0] === goal[0] && pos[1] === goal[1]; }

      function win() {
        solved = true;
        ctx.el('div', 'robot-goal-show', null, '<img src="assets/img/oit-campus.webp" alt="">ゴール！');
        ctx.after(1300, function () { ctx.finish(metrics()); });
      }

      // ブロック from〜to-1 を順に動かす
      function play(from, to, done) {
        const steps = [];
        blocks.slice(from, to).forEach(function (b) {
          for (let i = 0; i < b.count; i++) steps.push(b.dir);
        });
        let i = 0;
        busy = true;
        (function next() {
          if (i >= steps.length) { busy = false; done(true); return; }
          const ok = move(steps[i++]);
          if (!ok) {
            ctx.after(600, function () { busy = false; done(false); });
            return;
          }
          if (atGoal()) { busy = false; win(); return; }
          ctx.after(STEP_MS, next);
        })();
      }

      function run(stepMode) {
        if (!blocks.length) { ctx.pop('やじるしを ならべてね', W / 2, H - 120); return; }
        if (firstRun === null) firstRun = ctx.elapsed();
        if (stepMode) {
          stepRuns++;
          if (stepIndex >= blocks.length) { reset(); return; }
          const from = stepIndex;
          stepIndex++;
          renderProgram();
          play(from, from + 1, function (ok) {
            if (solved) return;
            if (!ok || stepIndex >= blocks.length) {
              ctx.pop(ok ? 'ゴールに とどかなかった' : 'ぶつかった！', W / 2, H - 120, 'bad');
              reset();
            }
          });
        } else {
          allRuns++;
          if (stepIndex > 0) { pos = start.slice(); place(pos); stepIndex = 0; }
          play(0, blocks.length, function (ok) {
            if (solved) return;
            ctx.pop(ok ? 'ゴールに とどかなかった' : 'ぶつかった！', W / 2, H - 120, 'bad');
            reset();
          });
        }
      }

      function metrics() {
        const runs = allRuns + stepRuns;
        return {
          retries: retries,
          step: runs ? stepRuns / runs : null,
          first: firstRun,
          solved: solved ? 1 : 0,
          blocks: blocks.length,
          need: plan.moves.length,
        };
      }

      place(pos);
      renderProgram();
      return { end: metrics };
    },
  });
})(window);
