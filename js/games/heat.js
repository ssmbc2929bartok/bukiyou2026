/*
 * 温度キープ（朝日熱処理工業）
 * ハンドルを回すと温度が上がり、止めると下がる。緑のゾーンに保つ。
 *   回す速さ ω（1秒あたりの回転数）で落ち着く温度は 20 + 600ω ℃。
 *   目標に必要な速さは毎回ランダム：初級 0.3〜0.5 / 中級 0.5〜1.0 / 上級 0.8〜1.5
 *   zone : 3秒以降でゾーン内にいた時間の割合 → こつこつ（＋）
 *   over : ゾーンの上を行き過ぎた最大の幅（ゾーンの幅を 1 とする）→ ていねい（−）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const RANGE = [[0.3, 0.5], [0.5, 1.0], [0.8, 1.5]];
  const ROOM = 20;
  const GAIN = 600;
  const HALF = 60;        // ゾーンの半分の幅（℃）
  const MAX_T = 1100;     // 温度計の上限
  const TAU = 0.8;        // 温度が追いつく速さ（秒）
  const WARMUP = 3;

  BKF.games.register('heat', {
    start: function (ctx) {
      const r = RANGE[ctx.tier];
      const omegaTarget = ctx.rand(r[0], r[1]);
      const target = ROOM + GAIN * omegaTarget;

      const furnace = ctx.el('div', 'furnace');
      const glow = ctx.el('div', 'furnace-glow', furnace);
      const metal = ctx.el('div', 'metal', furnace);
      const thermo = ctx.el('div', 'thermo');
      const zone = ctx.el('div', 'thermo-zone', thermo);
      const fill = ctx.el('div', 'thermo-fill', thermo);
      zone.style.bottom = ((target - HALF) / MAX_T * 100) + '%';
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
        if (t >= WARMUP) {
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
            target: Math.round(target),
            omega: Math.round(omegaTarget * 100) / 100,
          };
        },
      };
    },
  });
})(window);
