/*
 * クロスワード（不器用ファクトリー）。中級・上級だけ。
 * 問題は毎回、js/data/crossword.js の言葉から自動で作る。
 *   中級：最大4×4・3語（2〜3文字）・絵のヒント・1文字だけ最初から埋める
 *   上級：最大6×6・4語・文のヒント・社名の言葉を1つ以上・2文字だけ最初から埋める
 *   文字タイルは、答えの文字＋まぎらわしい文字3つ。
 *   correct : 最初から埋めてあるマス以外で、正しく埋めた割合 → かんがえる（＋）
 *   sec     : 全部正しく埋めるまでの秒数（できなければ制限時間）→ かんがえる（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;

  // longHint : 5文字以上の長い言葉で、ほかの言葉と交わるのが1つ以下のものに、数に関係なく1文字埋めるか。
  //            入れる・入れないを遊びくらべている（?debug&games&play=crossword&tier=2&longHint=0 で入れない）
  const OPT = {
    1: { W: 4, H: 4, count: 3, requireStar: false, given: 1, longHint: true },
    2: { W: 6, H: 6, count: 4, requireStar: true, given: 2, longHint: true },
  };

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // その場所に言葉を置けるか。置けるなら交わる文字の数、置けないなら -1
  function canPlace(grid, word, r, c, dir, W, H) {
    const dr = dir === 'D' ? 1 : 0;
    const dc = dir === 'A' ? 1 : 0;
    const len = word.length;
    const er = r + dr * (len - 1);
    const ec = c + dc * (len - 1);
    if (r < 0 || c < 0 || er >= H || ec >= W) return -1;
    if (grid.has((r - dr) + ',' + (c - dc)) || grid.has((er + dr) + ',' + (ec + dc))) return -1;
    let cross = 0;
    for (let i = 0; i < len; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const k = rr + ',' + cc;
      if (grid.has(k)) {
        if (grid.get(k) !== word[i]) return -1;
        cross++;
      } else {
        // 関係ないマスどうしがくっついて言葉にならないように
        const n1 = dir === 'A' ? (rr - 1) + ',' + cc : rr + ',' + (cc - 1);
        const n2 = dir === 'A' ? (rr + 1) + ',' + cc : rr + ',' + (cc + 1);
        if (grid.has(n1) || grid.has(n2)) return -1;
      }
    }
    return cross === len ? -1 : cross;
  }

  /*
   * 問題を作る。戻り値 { words: [{ ...言葉, chars, r, c, dir }], cells: Map } か null
   * うまく置けなければ最初からやり直す（200回まで）。
   */
  function generate(bank, opt) {
    for (let t = 0; t < 200; t++) {
      const words = shuffle(bank).map(function (b) { return Object.assign({ chars: Array.from(b.w) }, b); });
      const grid = new Map();
      const placed = [];
      const used = {};
      const first = words.find(function (x) { return x.chars.length <= opt.W; });
      const r0 = Math.floor(Math.random() * opt.H);
      const c0 = Math.floor(Math.random() * (opt.W - first.chars.length + 1));
      first.chars.forEach(function (ch, i) { grid.set(r0 + ',' + (c0 + i), ch); });
      placed.push(Object.assign({}, first, { r: r0, c: c0, dir: 'A' }));
      used[first.co] = true;
      for (let wi = 0; wi < words.length && placed.length < opt.count; wi++) {
        const cand = words[wi];
        if (used[cand.co] || placed.some(function (p) { return p.w === cand.w; })) continue;
        const opts = [];
        placed.forEach(function (p) {
          p.chars.forEach(function (ch, i) {
            cand.chars.forEach(function (ch2, j) {
              if (ch !== ch2) return;
              const pr = p.r + (p.dir === 'D' ? i : 0);
              const pc = p.c + (p.dir === 'A' ? i : 0);
              const dir = p.dir === 'A' ? 'D' : 'A';
              const r = dir === 'D' ? pr - j : pr;
              const c = dir === 'A' ? pc - j : pc;
              if (canPlace(grid, cand.chars, r, c, dir, opt.W, opt.H) > 0) opts.push({ r: r, c: c, dir: dir });
            });
          });
        });
        if (!opts.length) continue;
        const o = opts[Math.floor(Math.random() * opts.length)];
        cand.chars.forEach(function (ch, i) {
          grid.set((o.r + (o.dir === 'D' ? i : 0)) + ',' + (o.c + (o.dir === 'A' ? i : 0)), ch);
        });
        placed.push(Object.assign({}, cand, o));
        used[cand.co] = true;
      }
      if (placed.length < opt.count) continue;
      if (opt.requireStar && !placed.some(function (p) { return p.star; })) continue;
      return { words: placed, cells: grid };
    }
    return null;
  }

  BKF.crosswordGenerate = generate;
  BKF.crosswordOptions = OPT;
  if (!BKF.games) return;   // Node で生成だけ確かめるとき

  BKF.games.register('crossword', {
    start: function (ctx) {
      const opt = OPT[Math.max(1, ctx.tier)];
      const bank = ctx.tier === 2 ? BKF.crosswordAdv : BKF.crosswordMid;
      const puzzle = BKF.crosswordGenerate(bank, opt);
      if (!puzzle) { ctx.after(10, function () { ctx.finish({ correct: null, sec: null, failed: 1 }); }); return {}; }

      // 使っている範囲だけにする
      let minR = 99, maxR = 0, minC = 99, maxC = 0;
      puzzle.cells.forEach(function (v, k) {
        const rc = k.split(',').map(Number);
        minR = Math.min(minR, rc[0]); maxR = Math.max(maxR, rc[0]);
        minC = Math.min(minC, rc[1]); maxC = Math.max(maxC, rc[1]);
      });
      const rows = maxR - minR + 1;
      const cols = maxC - minC + 1;
      const W = ctx.width();
      const H = ctx.height();
      let size = 0;          // マスの大きさ。文字ボタンを並べたあとに、残りの高さから決める（layout）

      // マスの情報
      const cells = {};
      // 番号は始まりのマスごと（同じマスから始まるヨコとタテは同じ番号）
      const startNo = {};
      puzzle.words.slice()
        .sort(function (a, b) { return a.r - b.r || a.c - b.c; })
        .forEach(function (w) {
          const k = (w.r - minR) + ',' + (w.c - minC);
          if (!startNo[k]) startNo[k] = Object.keys(startNo).length + 1;
        });
      puzzle.words.forEach(function (w) { w.no = startNo[(w.r - minR) + ',' + (w.c - minC)]; });
      puzzle.words.forEach(function (w, wi) {
        w.keys = w.chars.map(function (ch, i) {
          const r = w.r + (w.dir === 'D' ? i : 0) - minR;
          const c = w.c + (w.dir === 'A' ? i : 0) - minC;
          const k = r + ',' + c;
          if (!cells[k]) cells[k] = { r: r, c: c, answer: ch, value: '', given: false, words: [] };
          cells[k].words.push(wi);
          return k;
        });
      });
      // 最初から埋めておく字。
      //   1. 5文字以上の長い言葉で、ほかの言葉と交わるのが1つ以下のものは、数に関係なく1文字ずつ
      //   2. give の言葉（取りちがえやすい・むずかしい言葉）に、1つの言葉に1文字ずつ（必ず入れる）
      //   3. 2 で埋めた字が 中級1つ・上級2つ に足りないときは、ほかの言葉の字で足す（1 で埋めた字は数に入れない）
      // どれも、ほかの言葉と交わりの少ないマスを先に選ぶ（交わるマスを埋めると、2つの言葉のヒントになってしまう）。
      function giveCell(k) {
        cells[k].given = true;
        cells[k].value = cells[k].answer;
      }
      function leastCrossed(keys) {
        const fewest = Math.min.apply(null, keys.map(function (k) { return cells[k].words.length; }));
        return ctx.pick(keys.filter(function (k) { return cells[k].words.length === fewest; }));
      }
      function crossings(w) {
        const others = {};
        w.keys.forEach(function (k) {
          cells[k].words.forEach(function (wi) { if (puzzle.words[wi] !== w) others[wi] = true; });
        });
        return Object.keys(others).length;
      }
      function hasGiven(w) { return w.keys.some(function (k) { return cells[k].given; }); }
      let longHint = opt.longHint;
      if (ctx.debug) {
        const q = new URLSearchParams(root.location.search).get('longHint');
        if (q !== null) longHint = q !== '0';
      }
      if (longHint) {
        puzzle.words.forEach(function (w) {
          if (w.chars.length >= 5 && crossings(w) <= 1 && !hasGiven(w)) giveCell(leastCrossed(w.keys));
        });
      }
      let givenCount = 0;
      ctx.shuffle(puzzle.words.filter(function (w) { return w.give; })).forEach(function (w) {
        if (hasGiven(w)) return;
        giveCell(leastCrossed(w.keys));
        givenCount++;
      });
      ctx.shuffle(puzzle.words.filter(function (w) { return !w.give; })).forEach(function (w) {
        if (givenCount >= opt.given || w.keys.some(function (k) { return cells[k].given; })) return;
        const lone = w.keys.filter(function (k) { return cells[k].words.length === 1; });
        if (!lone.length) return;
        giveCell(ctx.pick(lone));
        givenCount++;
      });
      const open = Object.keys(cells).filter(function (k) { return !cells[k].given; });

      const gridEl = ctx.el('div', 'cw-grid');
      const cellEls = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const k = r + ',' + c;
          const b = ctx.el('button', 'cw-cell' + (cells[k] ? '' : ' empty'), gridEl);
          b.type = 'button';
          cellEls.push(b);
          if (!cells[k]) continue;
          cells[k].el = b;
          ctx.on(b, 'click', function () { tapCell(k); });
        }
      }
      const hintEl = ctx.el('div', 'cw-hint');
      const tiles = ctx.el('div', 'cw-tiles');

      // 文字タイル：答えの文字＋まぎらわしい文字3つ
      const need = [];
      open.forEach(function (k) { if (need.indexOf(cells[k].answer) === -1) need.push(cells[k].answer); });
      const decoys = ctx.shuffle(BKF.crosswordDecoys.filter(function (ch) { return need.indexOf(ch) === -1; })).slice(0, 3);
      ctx.shuffle(need.concat(decoys)).forEach(function (ch) {
        const b = ctx.el('button', 'game-btn sub', tiles, ch);
        b.type = 'button';
        ctx.on(b, 'click', function () { put(ch); });
      });
      const del = ctx.el('button', 'game-btn', tiles, 'けす');
      del.type = 'button';
      ctx.on(del, 'click', erase);

      // 下から 文字ボタン → ヒント → 盤 の順に、重ならないように置く。
      // 前は盤を高さの42%と決め打ちしていたので、上級の長いヒントが文字ボタンに重なることがあった。
      // ヒントには会社の説明も出るので、その分の高さ（HINT_H）を先に取り、残りで盤の大きさを決める。
      const HINT_H = ctx.tier === 2 ? 118 : 124;   // 中級は絵が大きく、会社の名前を当てる言葉には説明も出る
      (function layout() {
        const gap = 3;
        const tilesTop = H - 6 - tiles.offsetHeight;
        const space = tilesTop - 8 - HINT_H - 8 - 8;
        size = Math.floor(Math.min((W - 24 - gap * (cols - 1)) / cols, (space - gap * (rows - 1)) / rows, 54));
        size = Math.max(24, size);
        gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', ' + size + 'px)';
        gridEl.style.gridTemplateRows = 'repeat(' + rows + ', ' + size + 'px)';
        cellEls.forEach(function (b) { b.style.fontSize = Math.round(size * 0.55) + 'px'; });
        const gridBottom = 8 + rows * size + gap * (rows - 1);
        hintEl.style.top = (gridBottom + 8) + 'px';
        hintEl.style.bottom = (H - tilesTop + 8) + 'px';
      })();

      let cur = 0;          // えらんでいる言葉
      let cursor = null;    // 入れるマス
      let doneAt = null;

      function firstEmpty(wi) {
        const keys = puzzle.words[wi].keys.filter(function (k) { return !cells[k].given; });
        return keys.find(function (k) { return !cells[k].value; }) || keys[0];
      }

      function selectWord(wi, k) {
        cur = wi;
        cursor = k && !cells[k].given ? k : firstEmpty(wi);
        render();
      }

      function tapCell(k) {
        const ws = cells[k].words;
        const wi = ws.length > 1 && ws.indexOf(cur) !== -1 && cursor === k ? ws[(ws.indexOf(cur) + 1) % ws.length] : (ws.indexOf(cur) !== -1 ? cur : ws[0]);
        selectWord(wi, k);
      }

      function advance() {
        const keys = puzzle.words[cur].keys.filter(function (k) { return !cells[k].given; });
        const i = keys.indexOf(cursor);
        const nextEmpty = keys.slice(i + 1).find(function (k) { return !cells[k].value; });
        if (nextEmpty) { cursor = nextEmpty; return; }
        // この言葉が埋まったら、まだ空いている言葉へ
        for (let s = 1; s <= puzzle.words.length; s++) {
          const wi = (cur + s) % puzzle.words.length;
          const k = puzzle.words[wi].keys.find(function (kk) { return !cells[kk].given && !cells[kk].value; });
          if (k) { cur = wi; cursor = k; return; }
        }
      }

      function put(ch) {
        if (doneAt || !cursor) return;
        cells[cursor].value = ch;
        advance();
        render();
        check();
      }

      function erase() {
        if (doneAt || !cursor) return;
        if (cells[cursor].value) {
          cells[cursor].value = '';
        } else {
          const keys = puzzle.words[cur].keys.filter(function (k) { return !cells[k].given; });
          const i = keys.indexOf(cursor);
          if (i > 0) { cursor = keys[i - 1]; cells[cursor].value = ''; }
        }
        render();
      }

      function correctCount() {
        return open.filter(function (k) { return cells[k].value === cells[k].answer; }).length;
      }

      function check() {
        if (correctCount() === open.length) {
          doneAt = ctx.elapsed();
          ctx.pop('せいかい！', W / 2, H * 0.3, 'good');
          ctx.after(700, function () { ctx.finish(metrics()); });
        } else if (open.every(function (k) { return cells[k].value; })) {
          ctx.pop('まちがいが あるよ', W / 2, H * 0.3, 'bad');
        }
      }

      function render() {
        const w = puzzle.words[cur];
        Object.keys(cells).forEach(function (k) {
          const cell = cells[k];
          const okWord = cell.words.some(function (wi) {
            return puzzle.words[wi].keys.every(function (kk) { return cells[kk].value === cells[kk].answer; });
          });
          cell.el.className = 'cw-cell' + (cell.given ? ' given' : '') + (w.keys.indexOf(k) !== -1 ? ' in-word' : '') +
            (k === cursor ? ' cursor' : '') + (okWord ? ' ok' : '');
          const no = startNo[k];
          cell.el.innerHTML = (no ? '<span class="cw-num">' + no + '</span>' : '') + (cell.value || '');
        });
        const label = (w.dir === 'A' ? 'ヨコ' : 'タテ') + w.no + '（' + w.chars.length + 'もじ）';
        hintEl.innerHTML = '<b>' + label + '</b><br>' + (w.emoji ? '<span class="cw-hint-emoji">' + w.emoji + '</span>' : '') +
          BKF.util.rubyHtml(w.hint) + companyNote(w);
        // 入りきらないときは、字を小さくして収める
        hintEl.style.fontSize = '';
        for (let f = 14; f > 10 && hintEl.scrollHeight > hintEl.clientHeight + 1; f--) hintEl.style.fontSize = (f - 1) + 'px';
      }

      // どの言葉も 不器用ファクトリーに出ている会社と関係があると分かるように、関係する会社を添える。
      //   上級：すべての言葉に、会社の名前と説明（js/data/companies.js の desc。トレーディングカードの説明をもとにした文）
      //   中級：会社の名前を当てる言葉（star）だけ説明を添える（ほかの言葉は、ヒントの文に会社の名前が入っている）
      function companyNote(w) {
        if (!w.star && ctx.tier !== 2) return '';
        const co = BKF.crosswordCompany(w.co);
        if (!co) return '';
        // 会社の名前を当てる言葉では、名前を出すと答えが分かるので、説明だけにする
        const name = w.star ? '' : '<b>' + BKF.util.rubyHtml(hideAnswer(co.name, w.w)) + '</b>：';
        return '<span class="cw-hint-co">' + co.icon + ' ' + name + BKF.util.rubyHtml(hideAnswer(co.desc, w.w)) + '</span>';
      }

      // 説明の中に答えがそのまま出てくるとき（例：エムズコーポレーションの説明の「しさくひん」）は、そこを □ でかくす。
      // 答えは小さい字を大きい字で書いているので、比べるときは説明の小さい字・カタカナも大きいひらがなにそろえる。
      // かくすときは、ルビの漢字をよみ（ひらがな）にした文で □ にする。
      function hideAnswer(text, answer) {
        const kana = text.replace(/\{[^|}]*\|([^}]*)\}/g, '$1');
        const plain = kana
          .replace(/[ァ-ヶ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); })
          .replace(/[ぁぃぅぇぉっゃゅょゎ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) + 1); });
        if (plain.indexOf(answer) === -1) return text;
        let out = '';
        let i = 0;
        for (let at = plain.indexOf(answer); at !== -1; at = plain.indexOf(answer, i)) {
          out += kana.slice(i, at) + '□'.repeat(answer.length);
          i = at + answer.length;
        }
        return out + kana.slice(i);
      }

      function metrics() {
        return {
          correct: open.length ? correctCount() / open.length : null,
          sec: doneAt !== null ? doneAt : ctx.limit,
          words: puzzle.words.map(function (w) { return w.w; }).join(','),
        };
      }

      selectWord(0);
      return { end: metrics };
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
