/*
 * ボール転がし（サンエス工業）
 * ダクトのコースを横から見た図。スマホを左右に傾けてボールを転がし、穴から下の段へ落としてゴールへ。
 * 段ごとに穴が2つあり、片方はダクトで下の段へつながり、もう片方は行き止まり（その段の最初からやり直し）。
 * コースの一部はダクトのカバーでかくれている（初級1 / 中級2 / 上級3か所）。
 * かくれた所は、カバーの下から出ているダクトの出口の位置から、どちらの穴が正しいかを予想する。
 * 始める前の角度を基準にする。傾きが使えない端末では別のゲームに変える（core.js）。
 * ?debug のときだけ、傾きの代わりに ◀ ▶ ボタン（矢印キー）で動かせる。
 * 「ゲームに慣れていない人には難しい」という声があったので、説明画面とゲームの最初に、
 * スマホを左右に傾けるとボールが転がるアニメーションを出す。
 *   hiddenFails : かくれた所で違う穴に落ちた回数 → かんがえる（−）
 *   walls       : 壁に勢いよく当たった回数 → ていねい（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const LEVELS = 4;           // 段の数（いちばん下の段にゴール）
  const HIDDEN = [1, 2, 3];

  // スマホを傾けるとボールが転がるアニメーション（説明画面とゲームの最初に出す）
  function tiltDemo(box, small) {
    box.innerHTML =
      '<div class="tilt-demo' + (small ? ' small' : '') + '">' +
      '<div class="tilt-phone"><div class="tilt-floor"></div><div class="tilt-ball"></div></div>' +
      '<div class="tilt-labels"><span>← ひだりに かたむける</span><span>みぎに かたむける →</span></div>' +
      '</div>';
  }

  BKF.games.register('ball', {
    demo: function (box) { tiltDemo(box, false); },
    start: function (ctx) {
      const W = ctx.width();
      const H = ctx.height();
      const R = Math.max(10, Math.min(W, H) * 0.035);
      const HW = R * 2.8;          // 穴の幅
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const canvas = ctx.el('canvas');
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.scale(dpr, dpr);
      const msg = ctx.el('div', 'game-msg', null, 'スマホを かたむけてね');
      // 最初のうちは、傾け方のアニメーションを出しておく（ボールが動いたら消す）
      const hint = ctx.el('div', 'ball-hint');
      tiltDemo(hint, true);

      // コースを作る
      const levels = [];
      for (let i = 0; i < LEVELS; i++) {
        levels.push({ y: H * (0.16 + i * 0.22), holes: [], good: -1, hidden: false });
      }
      // 穴は入ってきた所の左と右に1つずつ置く（どちらへ転がすかを選ぶ）。
      // 違う穴が途中にあると、正しい穴にたどり着く前に落ちてしまうため。
      // 次の段でも左右に穴を置けるように、正しい穴は端に寄りすぎない所にする。
      let entryX = ctx.rand(W * 0.4, W * 0.6);
      const startX = entryX;
      const gap = HW * 1.6;       // 入ってきた所と穴のあいだ
      const edge = HW * 1.2;      // 穴と壁のあいだ
      for (let i = 0; i < LEVELS - 1; i++) {
        const lv = levels[i];
        const lastHoles = i === LEVELS - 2;
        const lo = lastHoles ? edge : HW * 2.8;
        const hi = lastHoles ? W - edge : W - HW * 2.8;
        const canLeft = entryX - gap >= lo;
        const canRight = entryX + gap <= hi;
        const good = canLeft && canRight ? (Math.random() < 0.5 ? 0 : 1) : canLeft ? 0 : 1;
        lv.holes = [
          good === 0 ? ctx.rand(lo, entryX - gap) : ctx.rand(edge, entryX - gap),
          good === 1 ? ctx.rand(entryX + gap, hi) : ctx.rand(entryX + gap, W - edge),
        ];
        lv.good = good;
        lv.entry = entryX;
        entryX = lv.holes[good];
      }
      const last = levels[LEVELS - 1];
      last.entry = entryX;
      last.goalSide = entryX < W / 2 ? 1 : -1;   // 入ってきた所の反対側にゴール
      ctx.shuffle([0, 1, 2]).slice(0, HIDDEN[ctx.tier]).forEach(function (i) { levels[i].hidden = true; });

      // ボール
      let level = 0;
      let x = startX;
      let y = levels[0].y - R;
      let vx = 0;
      let vy = 0;
      let state = 'roll';     // roll / fall / pocket / goal
      let fallTo = null;
      let walls = 0;
      let fails = 0;
      let hiddenFails = 0;
      let reached = false;

      // 傾き
      let tilt = 0;
      let base = null;
      if (ctx.tilt) {
        ctx.on(root, 'deviceorientation', function (e) {
          if (typeof e.gamma !== 'number') return;
          if (base === null) base = e.gamma;
          tilt = e.gamma - base;
        });
      }
      if (!ctx.tilt || ctx.debug) {
        const pad = ctx.el('div', 'ball-pad');
        [['◀', -18], ['▶', 18]].forEach(function (b) {
          const btn = ctx.el('button', 'game-btn sub', pad, b[0]);
          btn.type = 'button';
          ctx.on(btn, 'pointerdown', function (e) { e.stopPropagation(); tilt = b[1]; });
          ctx.on(btn, 'pointerup', function () { tilt = 0; });
          ctx.on(btn, 'pointerleave', function () { tilt = 0; });
        });
        ctx.on(root, 'keydown', function (e) {
          if (e.key === 'ArrowLeft') tilt = -18;
          if (e.key === 'ArrowRight') tilt = 18;
        });
        ctx.on(root, 'keyup', function () { tilt = 0; });
      }

      function draw() {
        g.fillStyle = '#eef6fb';
        g.fillRect(0, 0, W, H);
        levels.forEach(function (lv, i) {
          const next = levels[i + 1];
          // ダクト（正しい穴から下の段へ）と行き止まり
          if (next) {
            lv.holes.forEach(function (hx, k) {
              if (k === lv.good) {
                g.fillStyle = '#bde0fe';
                g.fillRect(hx - HW / 2, lv.y, HW, next.y - lv.y);
                g.strokeStyle = '#8ecae6';
                g.lineWidth = 3;
                g.strokeRect(hx - HW / 2, lv.y, HW, next.y - lv.y);
              } else {
                g.fillStyle = '#d4a373';
                g.fillRect(hx - HW / 2, lv.y, HW, (next.y - lv.y) * 0.45);
                g.fillStyle = '#bc8a5f';
                g.fillRect(hx - HW / 2 - 4, lv.y + (next.y - lv.y) * 0.45, HW + 8, 8);
              }
            });
          }
          // 段（穴のところは切れている）
          g.fillStyle = '#8d99ae';
          const gaps = lv.holes.slice().sort(function (a, b) { return a - b; });
          let from = 0;
          gaps.forEach(function (hx) {
            g.fillRect(from, lv.y, hx - HW / 2 - from, 12);
            from = hx + HW / 2;
          });
          g.fillRect(from, lv.y, W - from, 12);
          // カバー
          if (lv.hidden && next) {
            const top = lv.y + 12;   // 段のすぐ下から（穴の先が見えないように）
            const bottom = next.y - 16;
            const grad = g.createLinearGradient(0, top, 0, bottom);
            grad.addColorStop(0, '#ced4da');
            grad.addColorStop(1, '#adb5bd');
            g.fillStyle = grad;
            g.fillRect(8, top, W - 16, bottom - top);
            g.fillStyle = '#868e96';
            [[16, top + 8], [W - 16, top + 8], [16, bottom - 8], [W - 16, bottom - 8]].forEach(function (p) {
              g.beginPath(); g.arc(p[0], p[1], 3, 0, Math.PI * 2); g.fill();
            });
            g.fillStyle = '#495057';
            g.font = 'bold ' + Math.round(R * 1.6) + 'px sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('？', W / 2, (top + bottom) / 2);
          }
        });
        // ゴール
        const gx = last.goalSide > 0 ? W - 34 : 34;
        g.font = Math.round(R * 2.2) + 'px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.fillText('🏁', gx, last.y - 2);
        // ボール
        g.fillStyle = '#ef476f';
        g.beginPath();
        g.arc(x, y, R, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.beginPath();
        g.arc(x - R * 0.35, y - R * 0.35, R * 0.3, 0, Math.PI * 2);
        g.fill();
      }

      function backToEntry() {
        const lv = levels[level];
        x = lv.entry;
        y = lv.y - R;
        vx = 0;
        state = 'roll';
      }

      ctx.loop(function (dt) {
        const lv = levels[level];
        if (state === 'roll') {
          if (hint.parentNode && Math.abs(vx) > 60) hint.remove();
          const t = Math.max(-25, Math.min(25, tilt));
          vx += (t / 25) * 700 * dt;
          vx *= Math.max(0, 1 - 1.2 * dt);
          x += vx * dt;
          const minX = R + 6;
          const maxX = W - R - 6;
          if (x < minX || x > maxX) {
            if (Math.abs(vx) > 90) walls++;
            x = Math.max(minX, Math.min(maxX, x));
            vx = -vx * 0.3;
          }
          if (level === LEVELS - 1) {
            if ((last.goalSide > 0 && x > W - 50) || (last.goalSide < 0 && x < 50)) {
              state = 'goal';
              reached = true;
              msg.textContent = 'ゴール！';
              ctx.after(700, function () { ctx.finish(metrics()); });
            }
          } else {
            lv.holes.forEach(function (hx, k) {
              if (state === 'roll' && Math.abs(x - hx) < HW / 2 - R * 0.3) {
                state = 'fall';
                x = hx;
                vx = 0;
                vy = 0;
                const next = levels[level + 1];
                fallTo = k === lv.good
                  ? { y: next.y - R, ok: true }
                  : { y: lv.y + (next.y - lv.y) * 0.45 - R, ok: false };
              }
            });
          }
        } else if (state === 'fall') {
          vy += 1500 * dt;
          y += vy * dt;
          if (y >= fallTo.y) {
            y = fallTo.y;
            if (fallTo.ok) {
              level++;
              state = 'roll';
              msg.textContent = level === LEVELS - 1 ? 'ゴールは もうすぐ！' : 'いいね！';
            } else {
              state = 'pocket';
              fails++;
              if (lv.hidden) hiddenFails++;
              msg.textContent = 'あれ？ ちがう あな';
              ctx.after(700, function () {
                backToEntry();
                msg.textContent = 'もういちど！';
              });
            }
          }
        }
        draw();
      });

      function metrics() {
        return {
          hiddenFails: hiddenFails,
          walls: walls,
          fails: fails,
          reached: reached ? 1 : 0,
          level: level,
        };
      }

      draw();
      return { end: metrics };
    },
  });
})(window);
