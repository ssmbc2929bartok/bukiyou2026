/*
 * 温度キープ（朝日熱処理工業）
 * ハンドルを回すと温度が上がり、止めると下がる。緑のゾーンに保つ。
 *   回す速さ ω（1秒あたりの回転数）で落ち着く温度は 20 + 600ω ℃。
 *   目標に必要な速さは毎回ランダム（ゲーム全体で いちばん遅い 0.3 〜 いちばん速い 1.5）：
 *     初級 1.2〜1.5（いちばん速い〜少し遅め） / 中級 0.6〜1.2（ちょい遅め〜ちょい速め） / 上級 0.3〜1.5（全部）
 *   （ゆっくり一定に回し続けるほうが難しいので、初級は速めにする）
 *   上級は20秒で、10秒目と15秒目に目標の温度が変わる。3つの速さは全部の範囲からランダムに選び、
 *   かわったのが分かるように、前の速さと MIN_STEP 以上ちがう速さにする（速い・遅いの順番もランダム）。
 *   変わったあとの2秒は、合わせる時間として zone に数えない。
 *   zone : 3秒以降でゾーン内にいた時間の割合 → こつこつ（＋）
 *   over : ゾーンの上を行き過ぎた最大の幅（ゾーンの幅を 1 とする）→ ていねい（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const RANGE = [[1.2, 1.5], [0.6, 1.2], [0.3, 1.5]];   // 難易度ごとの、回す速さの範囲
  const ROOM = 20;
  const GAIN = 600;
  const HALF = 60;        // ゾーンの半分の幅（℃）
  const MAX_T = 1100;     // 温度計の上限
  const TAU = 0.8;        // 温度が追いつく速さ（秒）
  const WARMUP = 3;
  const CHANGES = [0, 10, 15];   // 上級：目標が変わる時刻（秒）
  const MIN_STEP = 0.35;         // 上級：かわるときに、前の速さとこれ以上ちがう速さにする
  const GRACE = 2;        // 目標が変わったあと、数えない時間（秒）

  BKF.games.register('heat', {
    start: function (ctx) {
      const r = RANGE[ctx.tier];
      const plan = [];
      (ctx.tier === 2 ? CHANGES : [0]).forEach(function (at) {
        let omega = ctx.rand(r[0], r[1]);
        const prev = plan.length ? plan[plan.length - 1].omega : null;
        for (let tries = 0; prev !== null && Math.abs(omega - prev) < MIN_STEP && tries < 50; tries++) omega = ctx.rand(r[0], r[1]);
        plan.push({ at: at, omega: omega, target: ROOM + GAIN * omega });
      });
      let stage = 0;
      let target = plan[0].target;

      const furnace = ctx.el('div', 'furnace');
      const glow = ctx.el('div', 'furnace-glow', furnace);
      const metal = ctx.el('div', 'metal', furnace);
      const thermo = ctx.el('div', 'thermo');
      const zone = ctx.el('div', 'thermo-zone', thermo);
      const fill = ctx.el('div', 'thermo-fill', thermo);
      function placeZone() {
        zone.style.bottom = ((target - HALF) / MAX_T * 100) + '%';
      }
      placeZone();
      zone.style.height = (HALF * 2 / MAX_T * 100) + '%';
      const hint = ctx.el('div', 'heat-hint', null, 'ぐるぐる まわそう！');
      const handle = ctx.el('div', 'handle');
      const arm = ctx.el('div', 'handle-arm', handle);
      ctx.el('div', 'handle-knob', arm);

      let temp = ROOM;
      let omega = 0;
      let turned = 0;        // このフレームで回した角度（ラジアン）
      let angle = 0;         // ハンドルの角度（表示用）
      let lastAng = null;
      let inZone = 0;
      let counted = 0;
      let maxOver = 0;

      function center() {
        const rs = handle.getBoundingClientRect();
        return { x: rs.left + rs.width / 2, y: rs.top + rs.height / 2 };
      }

      function onMove(e) {
        if (lastAng === null) return;
        const c = center();
        const a = Math.atan2(e.clientY - c.y, e.clientX - c.x);
        let d = a - lastAng;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        turned += Math.abs(d);
        angle += d;
        lastAng = a;
      }

      ctx.on(ctx.stage, 'pointerdown', function (e) {
        const c = center();
        lastAng = Math.atan2(e.clientY - c.y, e.clientX - c.x);
        ctx.stage.setPointerCapture && ctx.stage.setPointerCapture(e.pointerId);
      });
      ctx.on(ctx.stage, 'pointermove', onMove);
      ctx.on(ctx.stage, 'pointerup', function () { lastAng = null; });
      ctx.on(ctx.stage, 'pointercancel', function () { lastAng = null; });

      ctx.loop(function (dt) {
        if (dt <= 0) return;
        const inst = turned / dt / (Math.PI * 2);
        turned = 0;
        omega += (inst - omega) * Math.min(1, dt * 5);
        const steady = ROOM + GAIN * omega;
        temp += (steady - temp) * Math.min(1, dt / TAU);
        temp = Math.max(ROOM, Math.min(MAX_T, temp));

        const t = ctx.elapsed();
        if (stage + 1 < plan.length && t >= plan[stage + 1].at) {
          stage++;
          target = plan[stage].target;
          zone.classList.add('moving');
          placeZone();
          ctx.pop('おんどが かわったよ！', ctx.width() / 2, ctx.height() * 0.3);
        }
        const since = t - plan[stage].at;
        if (t >= WARMUP && (stage === 0 || since >= GRACE)) {
          counted += dt;
          if (Math.abs(temp - target) <= HALF) inZone += dt;
          maxOver = Math.max(maxOver, temp - (target + HALF));
        }

        arm.style.transform = 'rotate(' + angle + 'rad)';
        fill.style.height = (temp / MAX_T * 100) + '%';
        const heat = Math.max(0, Math.min(1, (temp - ROOM) / (target + HALF)));
        glow.style.opacity = heat;
        metal.style.background = 'rgb(' + Math.round(141 + 114 * heat) + ',' + Math.round(153 - 40 * heat) + ',' + Math.round(174 - 140 * heat) + ')';
        const ok = Math.abs(temp - target) <= HALF;
        hint.textContent = ok ? 'いい かんじ！ そのまま！' : temp < target ? 'もっと はやく まわそう！' : 'すこし ゆっくり！';
        hint.style.color = ok ? '#2a9d8f' : '#5b7590';
      });

      return {
        end: function () {
          return {
            zone: counted > 0 ? inZone / counted : 0,
            over: Math.max(0, maxOver) / (HALF * 2),
            target: plan.map(function (p) { return Math.round(p.target); }).join('/'),
            omega: plan.map(function (p) { return Math.round(p.omega * 100) / 100; }).join('/'),
          };
        },
      };
    },
  });
})(window);
