/*
 * 絵合わせのカード（枚方市にちなむもの＋参加企業の製品）
 *   emoji : 画像がないときに出す絵文字
 *   img   : 画像のパス（いらすとやの画像を assets/img/memory/ に置いたら書く）
 * いらすとやは 1作品につき20点まで。ロボット（ブロック命令）の1点と合わせて数える。
 * 製品版で企業ロゴなどを使うときも、ここを差し替えるだけでよい。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.memoryItems = [
    { id: 'river', name: 'かわ（淀川）', emoji: '🏞️', img: '' },
    { id: 'boat', name: 'ふね（くらわんか舟）', emoji: '⛵', img: '' },
    { id: 'lantern', name: 'ちょうちん（枚方宿）', emoji: '🏮', img: '' },
    { id: 'ferris', name: 'かんらんしゃ', emoji: '🎡', img: '' },
    { id: 'case', name: 'アルミケース（アクテック）', emoji: '🧰', img: '' },
    { id: 'cream', name: 'ハンドクリーム（香椎化学工業）', emoji: '🧴', img: '' },
    { id: 'album', name: 'そつぎょうアルバム（ダイコロ）', emoji: '📚', img: '' },
    { id: 'screw', name: 'ねじ（大豊製作所）', emoji: '🔩', img: '' },
    { id: 'speaker', name: 'スピーカー（ノボル電機）', emoji: '🔊', img: '' },
    { id: 'pliers', name: 'ペンチ（室本鉄工）', emoji: '🔧', img: '' },
    { id: 'house', name: 'いえ（IFA住宅設計室）', emoji: '🏠', img: '' },
    { id: 'vegetable', name: 'やさい（吉泉産業）', emoji: '🥕', img: '' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
