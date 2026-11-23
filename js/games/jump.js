/*
 * 全員ジャンプ（枚方信用金庫）
 * 「3、2、1、ジャンプ！」に合わせてボタンを押して、仲間と いっしょに跳ぶ。5回。
 * v2.7.0 で作りなおした（前は3回で、3回目に おくれてくる仲間を待つ場面があったが、分かりにくかったので なくした）。
 *   - 数字のまわりで輪が ちぢみ、目印の輪と重なったときが「ジャンプ！」（押す瞬間が目で分かる）
 *   - 押すたびに「ぴったり！」「はやい！」「おそい！」と出し、ぴったりなら上の ★ が1つ付く
 *   - 数える速さ（1つ数える長さ）：初級は いつも 0.8秒 / 中級は 0.65・0.8・0.95秒 / 上級は 0.45・0.65・0.9秒 から回ごとにランダム
 *   - ぴったりの幅：初級 ±0.20秒 / 中級 ±0.17秒 / 上級 ±0.15秒
 *   sync    : ずれ（ミリ秒）の平均。押さなかった回は 1000 → なかよし（−）
 *   perfect : ぴったりの回数（記録だけ）。3回以上でクリア
 *   early / late / miss : はやい・おそい・押さなかった回数（記録だけ）
 *   beats   : 回ごとの数える速さ（ミリ秒。記録だけ）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const ROUNDS = 5;
  const BEATS = [[800], [650, 800, 950], [450, 650, 900]];   // 「3」「2」「1」の間隔（難易度ごと。回ごとにランダム）
  const PERFECT = [200, 170, 150];   // ぴったりの幅（ミリ秒）
  const WINDOW = 1000;       // 跳ぶ時間のあと、押すのを待つ時間（押さなかった回の ずれ も これ）
  const CLEAR = 3;           // ぴったりが これ以上でクリア
  const FRIENDS = ['🐻', '🐰', '🐱', '🐶'];

  // 毎回「3・2・1・ジャンプ！」と数えるので、ゲームの前の「3・2・1・スタート！」は出さない
  BKF.games.register('jump', {
    countdown: false,
    start: function (ctx) {
      const W = ctx.width();
      const xs = [0.12, 0.31, 0.5, 0.69, 0.88].map(function (r) { return r * W; });
      const order = [0, 1, 'me', 2, 3];
      const els = order.map(function (who, i) {
        const el = ctx.el('div', 'jumper' + (who === 'me' ? ' me' : ''), null, who === 'me' ? '🐥' : FRIENDS[who]);
        el.style.left = xs[i] + 'px';
        return el;
      });
      const me = els[order.indexOf('me')];
      const stars = ctx.el('div', 'jump-stars');
      const target = ctx.el('div', 'jump-target');
      const ring = ctx.el('div', 'jump-ring');
      const count = ctx.el('div', 'jump-count');
      const button = ctx.el('button', 'game-btn jump-button', null, 'ジャンプ！');
      button.type = 'button';

      const errors = [];
      const beats = [];
      let perfect = 0;
      let early = 0;
      let late = 0;
      let miss = 0;
      let round = 0;
      let press = null;          // このラウンドで押した時刻
      let jumpAt = 0;            // このラウンドで みんなが跳ぶ時刻
      let canPress = false;
      let ringAnim = null;

      function showStars(results) {
        let html = '';
        for (let i = 0; i < ROUNDS; i++) {
          html += '<span class="' + (results[i] === 1 ? 'on' : results[i] === 0 ? 'off' : '') + '">' + (results[i] === 1 ? '★' : '☆') + '</span>';
        }
        stars.innerHTML = html;
      }
      const results = [];
      showStars(results);

      function hop(el) {
        el.classList.remove('up');
        void el.offsetWidth;
        el.classList.add('up');
      }

      function say(text, cls) {
        ctx.pop(text, xs[order.indexOf('me')], ctx.height() * 0.42, cls);
      }

      // 押した瞬間に、ずれを見て「ぴったり！」「はやい！」「おそい！」
      function judge() {
        const diff = press - jumpAt;
        errors.push(Math.min(WINDOW, Math.abs(diff)));
        if (Math.abs(diff) <= PERFECT[ctx.tier]) {
          perfect++;
          results.push(1);
          say('ぴったり！', 'good');
        } else {
          results.push(0);
          if (diff < 0) { early++; say('はやい！', 'bad'); } else { late++; say('おそい！', 'bad'); }
        }
        showStars(results);
      }

      ctx.on(button, 'pointerdown', function (e) {
        e.preventDefault();
        if (!canPress || press !== null) return;
        press = performance.now();
        hop(me);
        judge();
      });

      function metrics() {
        return {
          sync: errors.length ? errors.reduce(function (a, b) { return a + b; }, 0) / errors.length : null,
          perfect: perfect,
          early: early,
          late: late,
          miss: miss,
          beats: beats.join('/'),
          cleared: perfect >= CLEAR ? 1 : 0,
        };
      }

      function playRound() {
        round++;
        press = null;
        canPress = true;
        const beat = ctx.pick(BEATS[ctx.tier]);
        beats.push(beat);
        jumpAt = performance.now() + beat * 3;

        // 輪が ちぢんで、目印の輪と重なったときが「ジャンプ！」
        target.classList.remove('hit');
        ring.style.opacity = '1';
        if (ringAnim) ringAnim.cancel();
        if (ring.animate) {
          ringAnim = ring.animate(
            [{ transform: 'translate(-50%, -50%) scale(2.8)' }, { transform: 'translate(-50%, -50%) scale(1)' }],
            { duration: beat * 3, easing: 'linear', fill: 'forwards' }
          );
        }

        count.classList.remove('word');
        ['3', '2', '1'].forEach(function (n, i) {
          ctx.after(beat * i, function () { count.textContent = n; });
        });
        ctx.after(beat * 3, function () {
          count.classList.add('word');
          count.textContent = 'ジャンプ！';
          ring.style.opacity = '0';
          target.classList.add('hit');
          els.forEach(function (el) { if (el !== me) hop(el); });
        });
        ctx.after(beat * 3 + WINDOW, function () {
          canPress = false;
          if (press === null) {
            miss++;
            errors.push(WINDOW);
            results.push(0);
            showStars(results);
            say('おしてね！', 'bad');
          }
          count.textContent = '';
          target.classList.remove('hit');
          if (round < ROUNDS) {
            ctx.after(500, playRound);
          } else {
            count.classList.add('word');
            count.textContent = 'ぴったり ' + perfect + 'かい！';
            if (perfect >= CLEAR) ctx.clear();
            ctx.after(1300, function () { ctx.finish(metrics()); });
          }
        });
      }

      ctx.after(600, playRound);
      return { end: metrics };
    },
  });
})(window);
