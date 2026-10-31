/*
 * ミニゲームの遊び方を、指が実際に操作して見せる説明（説明画面の動く説明）
 * 「やり方が わからなそう」という声があったので、v2.2.0 で全ゲームに付けた。
 *
 * カード（js/data/howto.js）を1枚ずつ見せる。自動でめくれ、左右のスワイプや下の点でも切りかえられる。
 * カードの中は小さな場面（横100 × 縦100 の座標。左上が 0,0）で、部品と指を同じ長さでくり返し動かす。
 *
 *   card = { caption, dur, parts: [...], lines: [...], finger: [...] }
 *   part   : { html, x, y, size, cls, kf }   kf は Web Animations のキーフレーム（offset 0〜1）
 *   line   : { d, color, width, dash, from, to, hide }   SVG の線。from〜to のあいだに描いていく（from がなければ最初から見える）。
 *            hide があれば、その offset で消える（かいろで、ぶつかった線が消える場面）
 *            d は M・L・Q・C・T と数字の組だけで書く（横の座標を2倍して、横2:縦1 の場面に合わせるため）
 *   finger : [[x, y, offset, 'tap' | 'down' | 'up'], ...] または { follow: 線の番号, from, to }（線をなぞる）
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const doc = root.document;
  const SVG = 'http://www.w3.org/2000/svg';
  const LOOPS = 2;           // 1枚を何回くり返したら次のカードへ進むか

  function el(tag, cls, parent, html) {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  // 場面は 横2:縦1。線の横の座標を2倍して、viewBox 0 0 200 100 にのせる（線の太さがゆがまないように）
  function widen(d) {
    let k = 0;
    return d.replace(/-?\d*\.?\d+/g, function (n) { return k++ % 2 === 0 ? String(Number(n) * 2) : n; });
  }

  // 線の上の点を、offset ごとに取り出す（指で線をなぞるとき）
  function followPath(path, from, to, steps) {
    const len = path.getTotalLength();
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const p = path.getPointAtLength(len * i / steps);
      pts.push([p.x / 2, p.y, from + (to - from) * i / steps, i === 0 ? 'down' : i === steps ? 'up' : null]);
    }
    return pts;
  }

  // 指の動き [[x, y, offset, 動作]] → キーフレーム。tap は押しこむ、down〜up のあいだは押したまま
  function fingerFrames(points) {
    const frames = [];
    let pressed = false;
    points.forEach(function (p, i) {
      const act = p[3];
      const o = p[2];
      const pos = { left: p[0] + '%', top: p[1] + '%' };
      if (act === 'tap') {
        const prev = frames.length ? frames[frames.length - 1].offset : 0;
        frames.push(Object.assign({ offset: Math.max(prev, o - 0.03), transform: 'scale(1)' }, pos));
        frames.push(Object.assign({ offset: o, transform: 'scale(0.82)' }, pos));
        const next = points[i + 1] ? points[i + 1][2] : 1;
        frames.push(Object.assign({ offset: Math.min(next, o + 0.04), transform: 'scale(1)' }, pos));
        return;
      }
      if (act === 'down') pressed = true;
      frames.push(Object.assign({ offset: o, transform: pressed ? 'scale(0.86)' : 'scale(1)' }, pos));
      if (act === 'up') pressed = false;
    });
    if (frames[0].offset > 0) frames.unshift(Object.assign({}, frames[0], { offset: 0 }));
    const last = frames[frames.length - 1];
    if (last.offset < 1) frames.push(Object.assign({}, last, { offset: 1 }));
    // 同じ offset が続くと Web Animations がエラーにならないよう、少しずつずらす
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].offset <= frames[i - 1].offset) frames[i].offset = Math.min(1, frames[i - 1].offset + 0.0001);
    }
    return frames;
  }

  // タップした所に出る波紋
  function rippleFrames(o) {
    return [
      { offset: 0, opacity: 0, transform: 'scale(0.3)' },
      { offset: Math.max(0.0001, o - 0.0001), opacity: 0, transform: 'scale(0.3)' },
      { offset: o, opacity: 0.9, transform: 'scale(0.4)' },
      { offset: Math.min(0.9999, o + 0.14), opacity: 0, transform: 'scale(1.6)' },
      { offset: 1, opacity: 0, transform: 'scale(1.6)' },
    ];
  }

  function buildScene(card, scene) {
    const anims = [];
    const dur = card.dur || 3200;
    const opts = { duration: dur, iterations: Infinity, easing: 'linear' };
    let svg = null;
    const paths = [];
    (card.lines || []).forEach(function (ln) {
      if (!svg) {
        svg = doc.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 200 100');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'howto-svg');
        scene.appendChild(svg);
      }
      const p = doc.createElementNS(SVG, 'path');
      p.setAttribute('d', widen(ln.d));
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', ln.color || '#1e88e5');
      p.setAttribute('stroke-width', ln.width || 3);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      if (ln.dash) p.setAttribute('stroke-dasharray', ln.dash);
      svg.appendChild(p);
      paths.push(p);
      if (ln.from !== undefined) {
        const len = p.getTotalLength ? p.getTotalLength() : 100;
        p.style.strokeDasharray = len + ' ' + len;
        anims.push({ el: p, kf: [
          { offset: 0, strokeDashoffset: len },
          { offset: ln.from, strokeDashoffset: len },
          { offset: ln.to, strokeDashoffset: 0 },
          { offset: 1, strokeDashoffset: 0 },
        ] });
      }
      if (ln.hide !== undefined) {
        anims.push({ el: p, kf: [
          { offset: 0, opacity: 1 },
          { offset: ln.hide, opacity: 1 },
          { offset: Math.min(1, ln.hide + 0.04), opacity: 0 },
          { offset: 1, opacity: 0 },
        ] });
      }
    });
    (card.parts || []).forEach(function (pt) {
      const e = el('div', 'howto-part' + (pt.cls ? ' ' + pt.cls : ''), scene, pt.html || '');
      e.style.left = pt.x + '%';
      e.style.top = pt.y + '%';
      if (pt.size) e.style.fontSize = pt.size + 'px';
      if (pt.kf) anims.push({ el: e, kf: pt.kf });
    });
    if (card.finger) {
      const pts = Array.isArray(card.finger)
        ? card.finger
        : followPath(paths[card.finger.follow], card.finger.from, card.finger.to, 24);
      // 線をなぞるときは、なぞる前とあとに少し離れた所にいる
      if (!Array.isArray(card.finger)) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        pts.unshift([a[0] + 6, a[1] + 14, Math.max(0, card.finger.from - 0.12)]);
        pts.push([b[0] + 6, b[1] + 14, Math.min(1, card.finger.to + 0.12)]);
      }
      pts.forEach(function (p) {
        if (p[3] !== 'tap') return;
        const r = el('div', 'howto-ripple', scene);
        r.style.left = p[0] + '%';
        r.style.top = p[1] + '%';
        anims.push({ el: r, kf: rippleFrames(p[2]) });
      });
      const f = el('div', 'howto-finger', scene, '<span>👆</span>');
      anims.push({ el: f, kf: fingerFrames(pts) });
    }
    return function play() {
      return anims.map(function (a) {
        try { return a.el.animate(a.kf, opts); } catch (err) { console.error(err); return null; }
      }).filter(Boolean);
    };
  }

  function render(box, cards) {
    box.innerHTML = '';
    const wrap = el('div', 'howto', box);
    const track = el('div', 'howto-track', wrap);
    const dots = el('div', 'howto-dots', cards.length > 1 ? wrap : null);
    const plays = [];
    const cardEls = cards.map(function (card, i) {
      const c = el('div', 'howto-card', track);
      const scene = el('div', 'howto-scene', c);
      plays.push(buildScene(card, scene));
      el('p', 'howto-caption', c, card.caption || '');
      const d = el('button', 'howto-dot', dots);
      d.type = 'button';
      d.setAttribute('aria-label', (i + 1) + 'まいめ');
      d.addEventListener('click', function () { show(i, true); });
      return c;
    });
    let index = 0;
    let running = [];
    let timer = 0;
    let manual = false;
    const seen = cards.map(function () { return false; });   // 見たカード（全部見たかを core.js が聞く）

    function show(i, byUser) {
      if (byUser) manual = true;
      index = (i + cards.length) % cards.length;
      seen[index] = true;
      track.style.transform = 'translateX(' + (-100 * index) + '%)';
      cardEls.forEach(function (c, k) { c.setAttribute('aria-hidden', k === index ? 'false' : 'true'); });
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === index); });
      running.forEach(function (a) { a.cancel(); });
      running = plays[index]();
      clearTimeout(timer);
      // 自動でめくるのは、さわるまで（さわったら、その子のペースにまかせる）
      if (cards.length > 1 && !manual) {
        timer = setTimeout(function () {
          if (box.isConnected) show(index + 1);
        }, (cards[index].dur || 3200) * LOOPS);
      }
    }

    // 左右のスワイプでめくる
    let sx = null;
    wrap.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    wrap.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1), true);
    });
    wrap.addEventListener('pointercancel', function () { sx = null; });

    show(0);
    return {
      allSeen: function () { return seen.every(Boolean); },
      // まだ見ていないカードを出す（「ルールを みる」を押したとき）
      showUnseen: function () {
        const i = seen.indexOf(false);
        if (i !== -1) show(i, true);
      },
      stop: function () {
        clearTimeout(timer);
        running.forEach(function (a) { a.cancel(); });
      },
    };
  }

  BKF.howto = { render: render };
})(window);
