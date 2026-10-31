/*
 * 全員ジャンプ（枚方信用金庫）
 * 「3、2、1、ジャンプ！」に合わせてボタンを押す。3回。全難易度共通。
 * 3回目は1人が画面の外から「まって〜」と走ってきて、「ジャンプ！」の0.8秒後に着く。
 * ほかの仲間は待って、着いたら「せーの！」で、少しあとに「ジャンプ！」で全員で跳ぶ（せーの は3回目だけ）。
 *   sync   : 1〜2回目のずれ（ミリ秒）の平均 → なかよし（−）
 *   waited : 3回目に、仲間が着くのを待って一緒に跳んだら 1 → なかよし（＋）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const BEAT = 800;          // 「3」「2」「1」の間隔
  const LATE = 800;          // 3回目に仲間が遅れる時間
  const SENO = 700;          // 3回目：仲間が着いて「せーの！」から、みんなが跳ぶまで
  const WINDOW = 1500;       // 跳ぶ時間のあと、押すのを待つ時間
  const FRIENDS = ['🐻', '🐰', '🐱', '🐶'];

  BKF.games.register('jump', {
    start: function (ctx) {
      const W = ctx.width();
      const xs = [0.12, 0.31, 0.5, 0.69, 0.88].map(function (r) { return r * W; });
      const order = [0, 1, 'me', 2, 3];
      const runnerIndex = 3;     // 走ってくる仲間（🐶）
      const els = order.map(function (who, i) {
        const el = ctx.el('div', 'jumper' + (who === 'me' ? ' me' : ''), null, who === 'me' ? '🐥' : FRIENDS[who]);
        el.style.left = xs[i] + 'px';
        return el;
      });
      const runner = els[order.indexOf(runnerIndex)];
      const count = ctx.el('div', 'jump-count');
      const button = ctx.el('button', 'game-btn jump-button', null, 'ジャンプ！');
      button.type = 'button';

      const errors = [];
      let waited = null;
      let r3Error = null;
      let round = 0;
      let press = null;          // このラウンドで押した時刻
      let canPress = false;

      function hop(el) {
        el.classList.remove('up');
        void el.offsetWidth;
        el.classList.add('up');
      }

      ctx.on(button, 'pointerdown', function (e) {
        e.preventDefault();
        if (!canPress || press !== null) return;
        press = performance.now();
        hop(els[order.indexOf('me')]);
      });

      function metrics() {
        return {
          sync: errors.length ? errors.reduce(function (a, b) { return a + b; }, 0) / errors.length : null,
          waited: waited,
          r3: r3Error,
        };
      }

      function playRound() {
        round++;
        press = null;
        canPress = true;
        const third = round === 3;
        const start = performance.now();
        const jumpAt = start + BEAT * 3;
        const arriveAt = jumpAt + LATE;
        const groupAt = third ? arriveAt + SENO : jumpAt;

        if (third) {
          // 走ってくる仲間は画面の外から
          runner.style.transition = 'none';
          runner.style.left = (W + 60) + 'px';
          runner.innerHTML = FRIENDS[runnerIndex] + '<span class="bubble">まって〜</span>';
          void runner.offsetWidth;
          runner.style.transition = 'left ' + ((BEAT * 3 + LATE) / 1000) + 's linear';
          runner.style.left = xs[order.indexOf(runnerIndex)] + 'px';
        }

        ['3', '2', '1'].forEach(function (n, i) {
          ctx.after(BEAT * i, function () { count.textContent = n; });
        });
        ctx.after(BEAT * 3, function () { count.textContent = 'ジャンプ！'; });
        if (third) {
          // 仲間が着いたら「せーの！」
          ctx.after(arriveAt - start, function () {
            runner.innerHTML = FRIENDS[runnerIndex];
            count.textContent = 'せーの！';
          });
        }
        ctx.after(groupAt - start, function () {
          if (third) count.textContent = 'ジャンプ！';
          els.forEach(function (el, i) { if (order[i] !== 'me') hop(el); });
        });
        ctx.after(groupAt - start + WINDOW, function () {
          canPress = false;
          if (third) {
            if (press !== null) {
              waited = Math.abs(press - groupAt) < Math.abs(press - jumpAt) ? 1 : 0;
              r3Error = Math.round(press - groupAt);
            }
          } else {
            errors.push(press !== null ? Math.abs(press - jumpAt) : WINDOW);
          }
          count.textContent = '';
          if (round < 3) ctx.after(700, playRound);
          else ctx.after(500, function () { ctx.finish(metrics()); });
        });
      }

      ctx.after(600, playRound);
      return { end: metrics };
    },
  });
})(window);
