/*
 * アプリ全体の設定
 * 開催回ごとに変えるのは eventId / companyIds / gasUrl の3つ。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.config = {
    appVersion: '1.0.0',

    // 開催回の識別子。スプレッドシートの「eventId」列に入る。
    eventId: '2026-10',

    // GAS ウェブアプリの URL（gas/Code.gs をデプロイしたときの「ウェブアプリ URL」）。
    // 空のときはデータを送らずに結果だけ表示する（動作確認用）。
    gasUrl: '',

    // この回に参加する企業の id（js/data/companies.js）。空の配列なら全社を対象にする。
    companyIds: [],

    // 出題する質問の id と順番（js/data/questions.js）。F-001「質問内容は固定」。
    questionIds: [
      'q50', 'q03', 'q02', 'q09', 'q11',
      'q29', 'q07', 'q01', 'q23', 'q41',
      'q08', 'q18', 'q06', 'q22', 'q32',
      'q37', 'q05', 'q45', 'q38', 'q35',
    ],

    // 1回の送信を待つ時間（ミリ秒）。これを過ぎたら失敗として扱う。
    sendTimeoutMs: 8000,

    // 結果画面の「にている ところ」に出す軸の数
    reasonCount: 3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
