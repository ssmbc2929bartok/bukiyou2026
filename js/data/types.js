/*
 * 性格タイプ（F-002 で「最も近い性格タイプ」を出す）
 * 16回ミーティング：10月開催は「よくある性格診断」のタイプにしておく。
 *   vector : 12軸（js/data/axes.js）での特徴。判定のときはタイプ間の平均を引いてから比べる
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.types = [
    {
      id: 'shokunin', emoji: '🛠️', name: 'こつこつ しょくにん タイプ',
      desc: 'ていねいに、さいごまで やりとげる {力|ちから}が あるよ！',
      vector: { steady: 2, careful: 3, craft: 2 },
    },
    {
      id: 'hatsumei', emoji: '💡', name: 'ひらめき はつめいか タイプ',
      desc: 'あたらしい アイデアが どんどん うかぶよ！',
      vector: { idea: 3, craft: 2, challenge: 1, curious: 1 },
    },
    {
      id: 'hakase', emoji: '🔍', name: 'なぞとき はかせ タイプ',
      desc: '「なんで？」を しらべるのが だいすき！',
      vector: { curious: 3, logic: 3, careful: 1 },
    },
    {
      id: 'leader', emoji: '📣', name: 'げんき リーダー タイプ',
      desc: 'みんなの まえで かがやく {力|ちから}が あるよ！',
      vector: { leader: 3, active: 2, challenge: 1, social: 1 },
    },
    {
      id: 'nakama', emoji: '🤝', name: 'みんなの なかま タイプ',
      desc: 'みんなと いっしょだと パワー ぜんかい！',
      vector: { social: 3, kind: 1, active: 1 },
    },
    {
      id: 'supporter', emoji: '💗', name: 'やさしい サポーター タイプ',
      desc: 'こまっている {人|ひと}に すぐ {気|き}づける やさしさが あるよ！',
      vector: { kind: 3, social: 1 },
    },
    {
      id: 'artist', emoji: '🎨', name: 'キラキラ アーティスト タイプ',
      desc: 'すてきな ものを {見|み}つける センスが あるよ！',
      vector: { design: 3, idea: 1, careful: 1, craft: 1 },
    },
    {
      id: 'bouken', emoji: '🚀', name: 'わくわく ぼうけんか タイプ',
      desc: 'まず やってみる ゆうきが あるよ！',
      vector: { challenge: 3, active: 2, curious: 1 },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
