/*
 * アプリ全体の設定
 * 開催回ごとに変えるのは eventId / companyIds / gasUrl の3つ。
 */
(function (root) {
  'use strict';
  const BKF = (root.BKF = root.BKF || {});

  BKF.config = {
    // 版の番号。変えたら README の「バージョンと変更履歴」にも書く。画面の下とスプレッドシートに出る
    appVersion: '2.2.0',

    // 開催回の識別子。スプレッドシートの「eventId」列に入る。
    eventId: '2026-10',

    // GAS ウェブアプリの URL（gas/Code.gs をデプロイしたときの「ウェブアプリ URL」）。
    // 空のときはデータを送らずに結果だけ表示する（動作確認用）。
    gasUrl:
      'https://script.google.com/macros/s/AKfycbwcn-oUlhxpAoUqDB7IWmgqUP0NVankXTHlKHib_zGyVxcI5LGMHem2j0ANNefKOftG/exec',

    // この回に参加する企業の id（js/data/companies.js）。空の配列なら全社を対象にする。
    companyIds: [],

    // 出題する質問の id と順番（js/data/questions.js）。F-001「質問内容は固定」。
    // 2026/10 の打ち合わせで20問から10問に減らした（ゲームで測りにくい軸を中心に残す）。
    questionIds: [
      'q50',
      'q23',
      'q38',
      'q07',
      'q22',
      'q02',
      'q32',
      'q41',
      'q03',
      'q29',
    ],

    // ミニゲームの実験条件。開始時にランダムでどちらかにする（docs/games.md）。
    //   after : 何問目のあとにゲームを入れるか
    gameConditions: {
      A: { after: [5, 10] },
      B: { after: [5, 10] },
    },

    // この回は出さないミニゲームの id（js/data/games.js）。空の配列なら全部のゲームを出す。
    //   screw ねじしめ / crossword クロスワード / memory えあわせ / trace せんを なぞろう /
    //   paint ぬりえ / cream クリームづくり / heat おんどキープ / circuit かいろを つなごう /
    //   stone いしわり / ball ボールころがし / robot ロボットを うごかそう /
    //   jump みんなで ジャンプ / bounce ケースを まもれ
    //   例：disabledGames: ['ball', 'jump'],
    disabledGames: [jump, robot],

    // 1回の送信を待つ時間（ミリ秒）。これを過ぎたら失敗として扱う。
    sendTimeoutMs: 8000,

    // 結果画面の「にている ところ」に出す軸の数
    reasonCount: 3,
  };
})(typeof window !== 'undefined' ? window : globalThis);
