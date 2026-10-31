/*
 * ミニゲームの共通部品
 *   説明 → 「はじめる」→ ゲーム（タイマー・とばす）→ 「すごい！」
 * 各ゲームは BKF.games.register(id, { start(ctx) }) で登録する。
 *   start(ctx) は { end(reason) } を返す。end は時間切れ・とばすのときに呼ばれ、
 *   そこまでの値（metrics）を返す。ゲームが自分で終わるときは ctx.finish(metrics) を呼ぶ。
 *   delayTimer: true のゲームは、ctx.startTimer() を呼ぶまでタイマーが動かない。
 *   demo(box) があるゲームは、説明画面に動く説明を出す（ないときは指のアニメーション）。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const doc = root.document;
  const DEBUG = new URLSearchParams(root.location.search).has('debug');
  const TIMEUP_MS = 1300;   // 時間切れのとき「じかんぎれ！」を出しておく長さ
  const impls = {};
  const $ = function (id) { return doc.getElementById(id); };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function register(id, impl) {
    impls[id] = impl;
  }

  // この難易度で遊べて、実装済みのゲームから n 個えらぶ
  function choose(tier, n, exclude) {
    return shuffle(BKF.playableGames(tier, { exclude: exclude }).filter(function (id) { return impls[id]; })).slice(0, n);
  }

  // スマホの傾きが使えるか。iPhone は許可を求める（ボタンを押した処理の中で呼ぶこと）
  function requestTilt() {
    return new Promise(function (resolve) {
      const DOE = root.DeviceOrientationEvent;
      if (!DOE) { resolve(false); return; }
      function listen() {
        let got = false;
        function onTilt(e) { if (typeof e.gamma === 'number') got = true; }
        root.addEventListener('deviceorientation', onTilt);
        setTimeout(function () {
          root.removeEventListener('deviceorientation', onTilt);
          resolve(got);
        }, 700);
      }
      if (typeof DOE.requestPermission === 'function') {
        DOE.requestPermission()
          .then(function (state) { if (state === 'granted') listen(); else resolve(false); })
          .catch(function () { resolve(false); });
      } else {
        listen();
      }
    });
  }

  /*
   * ゲームを1つ遊ぶ。結果:
   *   { id, tier, metrics, skipped, reason, ms, firstTouchMs, taps }
   *   傾きが使えなかったときは { id, tier, unavailable: true }
   */
  function run(id, tier) {
    const def = BKF.gameDefs[id];
    const impl = impls[id];

    $('game-icon').textContent = def.icon;
    $('game-company').textContent = def.company + ' に ちなんだ ゲーム';
    $('game-title').textContent = def.title;
    $('game-howto').textContent = def.howto;
    // 難易度ごとのルール（例：温度キープの上級は途中で温度が変わる）
    const note = def.tierNote && def.tierNote[tier];
    $('game-tier-note').textContent = note || '';
    $('game-tier-note').hidden = !note;
    $('game-time').textContent = def.time ? '⏱ じかんは ' + def.time[tier] + 'びょう' : (def.timeNote || '');
    $('game-tier').textContent = BKF.tiers[tier].label;
    $('game-tier-play').textContent = BKF.tiers[tier].label;
    $('game-intro').hidden = false;
    $('game-play').hidden = true;
    $('game-done').hidden = true;
    $('game-start').disabled = false;
    // 動く説明：ゲームの demo か、指が操作して見せるカード（js/data/howto.js）。どちらもなければ指だけ
    const demo = $('game-demo');
    demo.innerHTML = '';
    let howto = null;
    // カードに tiers があれば、その難易度のときだけ出す（例：クリームづくりの色の数）
    const cards = BKF.howtoCards && BKF.howtoCards[id] && BKF.howtoCards[id].filter(function (c) {
      return !c.tiers || c.tiers.indexOf(tier) !== -1;
    });
    if (impl.demo) impl.demo(demo);
    else if (cards && cards.length && BKF.howto) howto = BKF.howto.render(demo, cards);
    else demo.innerHTML = '<div class="game-hand">👆</div>';
    $('game-intro').classList.toggle('has-howto', Boolean(howto));

    // ルールのカードを全部見ずに始めたか（見ていないカードがあって「ほんとうに はじめる？」で始めたら 1）
    let rulesSkipped = howto && cards.length > 1 ? 0 : null;

    return new Promise(function (resolve) {
      $('game-start').onclick = function () {
        // カードが複数あって全部見ていないときは、確かめてから始める（知っている子はそのまま始められる）
        if (howto && !howto.allSeen()) {
          $('popup-howto-unseen').hidden = false;
          $('howto-unseen-start').focus();
          $('howto-unseen-start').onclick = function () {
            $('popup-howto-unseen').hidden = true;
            rulesSkipped = 1;
            begin();
          };
          $('howto-unseen-back').onclick = function () {
            $('popup-howto-unseen').hidden = true;
            howto.showUnseen();
          };
          return;
        }
        begin();
      };

      function begin() {
        $('game-start').disabled = true;
        if (def.needs === 'tilt') {
          requestTilt().then(function (ok) {
            if (!ok && !DEBUG) { resolve({ id: id, tier: tier, unavailable: true }); return; }
            play(ok);
          });
        } else {
          play(true);
        }
      }

      function play(tiltOk) {
        if (howto) howto.stop();
        $('game-intro').hidden = true;
        $('game-play').hidden = false;
        root.scrollTo(0, 0);

        const stage = $('game-stage');
        stage.innerHTML = '';
        stage.className = 'game-stage game-' + id;
        const limit = def.time ? def.time[tier] : null;
        const listeners = [];
        const timeouts = [];
        let ended = false;
        let timerStart = 0;
        let timerRaf = 0;
        let firstTouchMs = null;
        let taps = 0;
        let handle = null;
        const playStart = performance.now();

        function on(target, type, fn, opts) {
          target.addEventListener(type, fn, opts);
          listeners.push([target, type, fn, opts]);
        }

        on(stage, 'pointerdown', function () {
          taps++;
          if (firstTouchMs === null) firstTouchMs = Math.round(performance.now() - playStart);
        }, true);

        function startTimer() {
          if (timerStart || !limit) return;
          timerStart = performance.now();
          (function tick() {
            if (ended) return;
            const left = Math.max(0, limit - (performance.now() - timerStart) / 1000);
            showTime(left);
            if (left <= 0) { end('timeup'); return; }
            timerRaf = requestAnimationFrame(tick);
          })();
        }

        function end(reason, metrics) {
          if (ended) return;
          ended = true;
          cancelAnimationFrame(timerRaf);
          let m = metrics;
          if (!m && handle && handle.end) {
            try { m = handle.end(reason); } catch (err) { console.error(err); }
          }
          listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
          timeouts.forEach(clearTimeout);
          const ms = Math.round(performance.now() - playStart);
          // 時間切れのときは、どのゲームも
          //   1. ゲームの上に「⏰ じかんぎれ！」を出す（TIMEUP_MS）。耐久ゲーム（endurance）は「🏁 しゅうりょう！」
          //   2. ゲームに reveal があれば、答えを見せる（クロスワード：3秒。記録する値は見せる前に取ってある）
          //   3. 「がんばったね！」の画面にする。耐久ゲームは、時間いっぱい がんばれたので「すごい！」
          const finished = reason === 'timeup' && def.endurance;
          if (reason === 'timeup') {
            const note = doc.createElement('div');
            note.className = 'game-timeup' + (finished ? ' finished' : '');
            note.innerHTML = finished ? '<span aria-hidden="true">🏁</span>しゅうりょう！' : '<span aria-hidden="true">⏰</span>じかんぎれ！';
            stage.appendChild(note);
            setTimeout(function () {
              note.remove();
              let revealMs = 0;
              if (handle && handle.reveal) {
                try { revealMs = handle.reveal() || 0; } catch (err) { console.error(err); }
              }
              setTimeout(showDone, revealMs);
            }, TIMEUP_MS);
          } else {
            showDone();
          }

          function showDone() {
            $('game-play').hidden = true;
            $('game-done').hidden = false;
            const tired = reason === 'timeup' && !finished;
            $('game-done-emoji').textContent = tired ? '👏' : '🌟';
            $('game-done-text').textContent = reason === 'skip' ? 'つぎに いこう！' : tired ? 'がんばったね！' : 'すごい！';
            setTimeout(function () {
              stage.innerHTML = '';
              resolve({
                id: id, tier: tier, metrics: m || {}, skipped: reason === 'skip', reason: reason,
                ms: ms, firstTouchMs: firstTouchMs, taps: taps, rulesSkipped: rulesSkipped,
              });
            }, 1100);
          }
        }

        // のこり時間は数字で出す（バーより見やすいという声があった）。のこり5秒からは赤くする
        function showTime(left) {
          const num = $('game-timer-num');
          const sec = Math.ceil(left);
          if (num.textContent !== String(sec)) num.textContent = sec;
          num.parentNode.classList.toggle('hurry', sec <= 5);
        }

        $('game-skip').onclick = function () { end('skip'); };
        // 制限時間なし（time: null）のゲームは、のこり時間を出さない
        $('game-timer-num').parentNode.style.visibility = limit ? '' : 'hidden';
        if (limit) showTime(limit);

        const ctx = {
          stage: stage,
          tier: tier,
          limit: limit,
          debug: DEBUG,
          tilt: tiltOk,
          width: function () { return stage.clientWidth; },
          height: function () { return stage.clientHeight; },
          el: function (tag, cls, parent, html) {
            const e = doc.createElement(tag);
            if (cls) e.className = cls;
            if (html !== undefined) e.innerHTML = html;
            (parent || stage).appendChild(e);
            return e;
          },
          on: on,
          after: function (ms, fn) {
            const t = setTimeout(function () { if (!ended) fn(); }, ms);
            timeouts.push(t);
            return t;
          },
          // 毎フレーム呼ぶ。fn(dt 秒, t 秒)
          loop: function (fn) {
            let last = performance.now();
            (function tick(now) {
              if (ended) return;
              const dt = Math.min(0.05, ((now || performance.now()) - last) / 1000);
              last = now || performance.now();
              fn(dt, (last - playStart) / 1000);
              requestAnimationFrame(tick);
            })();
          },
          pos: function (e) {
            const r = stage.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
          },
          // ふわっと出て消える文字
          pop: function (text, x, y, cls) {
            const p = ctx.el('div', 'game-pop ' + (cls || ''), stage, text);
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            setTimeout(function () { p.remove(); }, 900);
          },
          elapsed: function () {
            return timerStart ? (performance.now() - timerStart) / 1000 : 0;
          },
          ended: function () { return ended; },
          startTimer: startTimer,
          finish: function (metrics) { end('done', metrics); },
          rand: rand,
          randInt: randInt,
          pick: pick,
          shuffle: shuffle,
        };

        if (!impl.delayTimer) startTimer();
        try {
          handle = impl.start(ctx);
        } catch (err) {
          console.error(err);
          end('error', {});
        }
      }
    });
  }

  BKF.games = {
    register: register,
    run: run,
    choose: choose,
    has: function (id) { return Boolean(impls[id]); },
    util: { rand: rand, randInt: randInt, pick: pick, shuffle: shuffle },
  };
})(window);
