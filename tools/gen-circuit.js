/*
 * 回路ゲームの問題を作る
 *   node tools/gen-circuit.js > js/data/circuit.js
 *
 * 1. 盤面に、交差しない線をランダムに引き、その両端を「点」にする（必ず解ける）
 * 2. 作った問題を解いて「遠回りが必要な組」の数を数える
 *    ある組が遠回り必要 ＝ その組をいちばん短い道（マンハッタン距離）でつなぐと、ほかの組がつなげない
 * 3. 条件に合うものを各難易度 10問ずつ選ぶ
 *    初級：4×4・2組・遠回りなし（全部の組を同時にいちばん短い道でつなげる）
 *    中級：5×5・3組・遠回り1組
 *    上級：6×6・4組・遠回り2組以上
 */
'use strict';

const SPEC = [
  { n: 4, k: 2, ok: function (d, allShort) { return allShort; } },
  { n: 5, k: 3, ok: function (d) { return d === 1; } },
  { n: 6, k: 4, ok: function (d) { return d >= 2; } },
];
const PER_TIER = 10;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function rnd(n) { return Math.floor(Math.random() * n); }

// ランダムな線をひいて問題を作る
function makePuzzle(n, k) {
  const occ = Array.from({ length: n }, function () { return Array(n).fill(-1); });
  const pairs = [];
  for (let p = 0; p < k; p++) {
    let made = false;
    for (let tries = 0; tries < 50 && !made; tries++) {
      const free = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (occ[r][c] < 0) free.push([r, c]);
      if (!free.length) return null;
      const start = free[rnd(free.length)];
      const target = 2 + rnd(n + 2);
      const path = [start];
      occ[start[0]][start[1]] = p;
      while (path.length < target + 1) {
        const last = path[path.length - 1];
        const nexts = DIRS.map(function (d) { return [last[0] + d[0], last[1] + d[1]]; })
          .filter(function (q) { return q[0] >= 0 && q[1] >= 0 && q[0] < n && q[1] < n && occ[q[0]][q[1]] < 0; });
        if (!nexts.length) break;
        const q = nexts[rnd(nexts.length)];
        occ[q[0]][q[1]] = p;
        path.push(q);
      }
      const a = path[0];
      const b = path[path.length - 1];
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) >= 2) {
        pairs.push([a[0], a[1], b[0], b[1]]);
        made = true;
      } else {
        path.forEach(function (q) { occ[q[0]][q[1]] = -1; });
      }
    }
    if (!made) return null;
  }
  return pairs;
}

/*
 * 解けるか調べる。shortest[p] が true の組は、いちばん短い道だけを使う。
 * 戻り値 true / false
 */
function solvable(n, pairs, shortest) {
  const occ = Array.from({ length: n }, function () { return Array(n).fill(-1); });
  pairs.forEach(function (pr, p) { occ[pr[0]][pr[1]] = p; occ[pr[2]][pr[3]] = p; });
  let budget = 200000;

  function reachable(p) {
    // まだつないでいない組が、空いているマスを通ってつながるか
    const pr = pairs[p];
    const seen = Array.from({ length: n }, function () { return Array(n).fill(false); });
    const stack = [[pr[0], pr[1]]];
    seen[pr[0]][pr[1]] = true;
    while (stack.length) {
      const cur = stack.pop();
      if (cur[0] === pr[2] && cur[1] === pr[3]) return true;
      DIRS.forEach(function (d) {
        const r = cur[0] + d[0];
        const c = cur[1] + d[1];
        if (r < 0 || c < 0 || r >= n || c >= n || seen[r][c]) return;
        if (occ[r][c] >= 0 && !(r === pr[2] && c === pr[3])) return;
        seen[r][c] = true;
        stack.push([r, c]);
      });
    }
    return false;
  }

  function solve(p) {
    if (--budget < 0) return false;
    if (p === pairs.length) return true;
    for (let q = p; q < pairs.length; q++) if (!reachable(q)) return false;
    const pr = pairs[p];
    const manhattan = Math.abs(pr[0] - pr[2]) + Math.abs(pr[1] - pr[3]);
    const maxLen = shortest[p] ? manhattan : manhattan + 8;
    const path = [];

    function walk(r, c, len) {
      if (budget < 0) return false;
      if (r === pr[2] && c === pr[3]) {
        return solve(p + 1);
      }
      if (len >= maxLen) return false;
      const remain = Math.abs(r - pr[2]) + Math.abs(c - pr[3]);
      if (len + remain > maxLen) return false;
      for (let i = 0; i < 4; i++) {
        const nr = r + DIRS[i][0];
        const nc = c + DIRS[i][1];
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        const isEnd = nr === pr[2] && nc === pr[3];
        if (!isEnd && occ[nr][nc] >= 0) continue;
        if (!isEnd) occ[nr][nc] = p;
        path.push([nr, nc]);
        const ok = walk(nr, nc, len + 1);
        path.pop();
        if (!isEnd) occ[nr][nc] = -1;
        if (ok) return true;
      }
      return false;
    }
    return walk(pr[0], pr[1], 0);
  }

  return solve(0);
}

function analyse(n, pairs) {
  const none = pairs.map(function () { return false; });
  if (!solvable(n, pairs, none)) return null;
  let detour = 0;
  pairs.forEach(function (pr, p) {
    const s = none.slice();
    s[p] = true;
    if (!solvable(n, pairs, s)) detour++;
  });
  const allShort = solvable(n, pairs, pairs.map(function () { return true; }));
  return { detour: detour, allShort: allShort };
}

const out = SPEC.map(function (spec) {
  const list = [];
  const seen = {};
  for (let t = 0; t < 200000 && list.length < PER_TIER; t++) {
    const pairs = makePuzzle(spec.n, spec.k);
    if (!pairs) continue;
    const key = JSON.stringify(pairs.slice().sort());
    if (seen[key]) continue;
    seen[key] = true;
    const a = analyse(spec.n, pairs);
    if (a && spec.ok(a.detour, a.allShort)) list.push({ n: spec.n, pairs: pairs, detour: a.detour });
  }
  return list;
});

const counts = out.map(function (l) { return l.length; }).join(' / ');
process.stdout.write([
  '/*',
  ' * 回路ゲームの問題（tools/gen-circuit.js で作ったもの。手で直さない）',
  ' *   pairs : [行1, 列1, 行2, 列2] … 同じ色の点の位置',
  ' *   detour: 遠回りが必要な組の数',
  ' * 問題数（初級 / 中級 / 上級）: ' + counts,
  ' */',
  '(function (root) {',
  "  'use strict';",
  '  const BKF = root.BKF = root.BKF || {};',
  '  BKF.circuitPuzzles = ' + JSON.stringify(out, null, 0).replace(/\],\[\{/g, '],\n  [{').replace(/\},\{/g, '},\n    {') + ';',
  "})(typeof window !== 'undefined' ? window : globalThis);",
  '',
].join('\n'));
process.stderr.write('問題数（初級 / 中級 / 上級）: ' + counts + '\n');
