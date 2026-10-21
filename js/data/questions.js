/*
 * 質問データ（F-001）
 * 質問文は questions_kanji_g3.txt（小学3年生までの漢字に調整したもの）を使う。
 *   no   : questions_kanji_g3.txt の行番号
 *   text : 質問文。{漢字|よみ} と書くとルビになる
 *   hint : 質問の下に出す一言（省略すると「ひとつ えらんでね！」）
 *   choices[].w : その選択肢を選んだときに足す効果ベクトル（js/data/axes.js の軸 id）
 * 「どれでもない」はすべての質問に自動で付く（効果ベクトルは 0）。
 * 選択肢の文言と効果ベクトルは仮。開催後の回答データで見直す。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.questions = [
    {
      id: 'q01', no: 1,
      text: '{天気|てんき}よほうでは{雨|あめ}、\nでも{空|そら}は{晴|は}れている。\nかさを{持|も}っていく？',
      choices: [
        { text: '{持|も}っていく', emoji: '☂️', w: { logic: 2, careful: 1 } },
        { text: '{持|も}っていかない', emoji: '☀️', w: { challenge: 2, active: 1 } },
        { text: 'おりたたみを\n{持|も}っていく', emoji: '🎒', w: { steady: 1, idea: 1, careful: 1 } },
      ],
    },
    {
      id: 'q02', no: 2,
      text: 'なぞなぞはすき？',
      choices: [
        { text: 'じぶんで\nとくのが すき', emoji: '🧩', w: { logic: 2, steady: 1 } },
        { text: '{友|とも}だちに\n{出|だ}すのが すき', emoji: '🗣️', w: { leader: 2, social: 1 } },
        { text: 'あたらしいのを\n{考|かんが}えたい', emoji: '💡', w: { idea: 2, curious: 1 } },
      ],
    },
    {
      id: 'q03', no: 3,
      text: 'おもちゃは{何|なに}でえらぶ？',
      choices: [
        { text: '{見|み}た{目|め}が\nかっこいい・かわいい', emoji: '🌟', w: { design: 3 } },
        { text: 'うごく しくみが\nおもしろい', emoji: '⚙️', w: { curious: 2, logic: 1 } },
        { text: 'みんなで\n{遊|あそ}べる', emoji: '🎲', w: { social: 2, active: 1 } },
      ],
    },
    {
      id: 'q05', no: 5,
      text: '{知|し}らない{遊|あそ}びを{教|おそ}わったら？',
      choices: [
        { text: 'すぐに\nやってみる', emoji: '🙌', w: { challenge: 3, active: 1 } },
        { text: 'まずは {見|み}て\nおぼえる', emoji: '🧐', w: { careful: 2, logic: 1 } },
        { text: 'ルールを かえて\nアレンジする', emoji: '🔀', w: { idea: 2, leader: 1 } },
      ],
    },
    {
      id: 'q06', no: 6,
      text: '{夏休|なつやす}みの{宿題|しゅくだい}、どうやる？',
      choices: [
        { text: 'まいにち\n{少|すこ}しずつ', emoji: '📅', w: { steady: 3, careful: 1 } },
        { text: 'さいしょに\n{一気|いっき}に', emoji: '🔥', w: { challenge: 2, active: 1 } },
        { text: '{友|とも}だちと\nいっしょに', emoji: '✏️', w: { social: 2 } },
      ],
    },
    {
      id: 'q07', no: 7,
      text: '{発表会|はっぴょうかい}はすき？',
      choices: [
        { text: 'だいすき！\nまえに {出|で}たい', emoji: '🎤', w: { leader: 3, challenge: 1 } },
        { text: 'みんなと いっしょ\nなら すき', emoji: '👫', w: { social: 2, kind: 1 } },
        { text: 'じゅんびや\nうらかたが すき', emoji: '🔧', w: { steady: 1, kind: 1, craft: 1 } },
      ],
    },
    {
      id: 'q08', no: 8,
      text: 'お{絵|え}かきするならどっち？',
      choices: [
        { text: '{思|おも}いついた\nものを かく', emoji: '💭', w: { idea: 3 } },
        { text: '{見|み}た ものを\nそっくりに かく', emoji: '🖼️', w: { careful: 2, design: 1 } },
      ],
    },
    {
      id: 'q09', no: 9,
      text: 'おり{紙|がみ}で{何|なに}か{作|つく}るのはすき？',
      choices: [
        { text: 'せつめい どおりに\nきれいに おる', emoji: '📐', w: { careful: 2, steady: 1, craft: 1 } },
        { text: 'じぶんで {考|かんが}えた\n{形|かたち}を おる', emoji: '🦢', w: { idea: 2, craft: 1 } },
        { text: '{色|いろ}や もようを\nえらぶのが すき', emoji: '🎨', w: { design: 3 } },
      ],
    },
    {
      id: 'q11', no: 11,
      text: '{外|そと}でおにごっこするのはすき？',
      choices: [
        { text: 'おにに なって\nおいかけたい', emoji: '🏃', w: { active: 2, challenge: 1, leader: 1 } },
        { text: 'さくせんを たてて\nにげたい', emoji: '🗺️', w: { logic: 2, active: 1 } },
        { text: '{見|み}ている ほうが\nすき', emoji: '👀', w: { curious: 1, careful: 1, kind: 1 } },
      ],
    },
    {
      id: 'q18', no: 18,
      text: '{紙|かみ}ひこうき、とぶまで{何回|なんかい}もためす？',
      choices: [
        { text: 'とぶまで\nずっと ためす', emoji: '✈️', w: { steady: 3, challenge: 1 } },
        { text: 'おり{方|かた}を\nしらべる', emoji: '📚', w: { logic: 2, curious: 1 } },
        { text: '{友|とも}だちに\n{聞|き}いてみる', emoji: '🙋', w: { social: 2 } },
      ],
    },
    {
      id: 'q22', no: 22,
      text: 'げきをするなら、どの{役|やく}がいい？',
      choices: [
        { text: 'しゅやく', emoji: '👑', w: { leader: 3 } },
        { text: 'どうぐや いしょうを\n{作|つく}る', emoji: '🎭', w: { craft: 2, design: 1 } },
        { text: 'おはなしを\n{考|かんが}える', emoji: '📝', w: { idea: 2, logic: 1 } },
      ],
    },
    {
      id: 'q23', no: 23,
      text: '{友|とも}だちが{転|ころ}んだらどうする？',
      choices: [
        { text: 'すぐに\nかけよる', emoji: '💨', w: { active: 2, kind: 1 } },
        { text: '{大人|おとな}を\nよびに いく', emoji: '📣', w: { leader: 1, logic: 1, social: 1 } },
        { text: '「だいじょうぶ？」と\n{声|こえ}を かける', emoji: '💬', w: { kind: 2, social: 1 } },
      ],
    },
    {
      id: 'q29', no: 29,
      text: 'YouTubeを{見|み}て、{何|なに}をまねした？',
      hint: 'すきな ものを えらんでね！',
      choices: [
        { text: 'こうさく', emoji: '✂️', w: { craft: 3, idea: 1 } },
        { text: 'りょうり', emoji: '🍳', w: { kind: 2, careful: 1, craft: 1 } },
        { text: 'ゲーム', emoji: '🎮', w: { challenge: 2, logic: 1 } },
      ],
    },
    {
      id: 'q32', no: 32,
      text: '{風|かぜ}や{音|おと}のふしぎは{気|き}になる？',
      choices: [
        { text: 'なんでだろう？と\nしらべる', emoji: '🔍', w: { curious: 3, logic: 1 } },
        { text: '{音|おと}で {遊|あそ}ぶのが\nすき', emoji: '🥁', w: { active: 1, design: 1, social: 1 } },
        { text: '{風|かぜ}で {動|うご}く ものを\n{作|つく}りたい', emoji: '🎐', w: { craft: 2, idea: 1 } },
      ],
    },
    {
      id: 'q35', no: 35,
      text: '{楽|たの}しい{思|おも}い{出|で}をのこしたい？',
      choices: [
        { text: '{写真|しゃしん}に\nとる', emoji: '📸', w: { design: 2, careful: 1 } },
        { text: '{絵|え}や {日記|にっき}に\nかく', emoji: '📓', w: { steady: 2, idea: 1 } },
        { text: '{友|とも}だちと\n{話|はな}す', emoji: '😆', w: { social: 2, leader: 1 } },
      ],
    },
    {
      id: 'q37', no: 37,
      text: 'ぴったりそろえるのはすき？',
      choices: [
        { text: 'くつや {本|ほん}を\nきちんと ならべる', emoji: '👟', w: { careful: 3, steady: 1 } },
        { text: '{色|いろ}ごとに\n{分|わ}けるのが すき', emoji: '🌈', w: { design: 2, careful: 1 } },
        { text: 'ばらばらでも\n{気|き}に しない', emoji: '🌀', w: { challenge: 1, idea: 1, active: 1 } },
      ],
    },
    {
      id: 'q38', no: 38,
      text: '{何|なに}かを{作|つく}るとき、どう{作|つく}りたい？',
      choices: [
        { text: 'みんなで\n{力|ちから}を あわせて', emoji: '🤝', w: { social: 3, kind: 1 } },
        { text: 'ひとりで\nじっくり', emoji: '🔨', w: { steady: 2, careful: 1, craft: 1 } },
        { text: '{思|おも}いついたまま\nどんどん', emoji: '⚡', w: { idea: 2, challenge: 1 } },
      ],
    },
    {
      id: 'q41', no: 41,
      text: 'おもちゃが{動|うご}くしくみを{知|し}りたい？',
      choices: [
        { text: 'ばらばらに して\nしらべたい', emoji: '🔩', w: { curious: 2, challenge: 1, craft: 1 } },
        { text: 'せつめいを\n{読|よ}みたい', emoji: '📖', w: { logic: 2, curious: 1 } },
        { text: '{動|うご}かして {遊|あそ}ぶ\nほうが すき', emoji: '🚗', w: { active: 2 } },
      ],
    },
    {
      id: 'q45', no: 45,
      text: 'すてる{物|もの}で{何|なに}か{作|つく}ってみたい？',
      choices: [
        { text: 'ロボットを\n{作|つく}りたい', emoji: '🤖', w: { craft: 2, curious: 1, logic: 1 } },
        { text: 'かざりや\nアクセサリー', emoji: '💍', w: { design: 3, craft: 1 } },
        { text: 'みんなで {遊|あそ}べる\nゲーム', emoji: '🎯', w: { social: 2, kind: 1 } },
      ],
    },
    {
      id: 'q50', no: 50,
      text: 'ヒーローならどれになる？',
      hint: 'すきな ヒーローを えらんでね！',
      choices: [
        { text: 'わるものを たおす\nつよい ヒーロー', emoji: '🦸', w: { active: 2, challenge: 2, leader: 1 } },
        { text: 'みんなを まもる\nヒーロー', emoji: '🛡️', w: { social: 1, steady: 1, careful: 1, kind: 1 } },
        { text: 'けがを なおす\nヒーロー', emoji: '🩹', w: { kind: 3 } },
        { text: 'ふしぎな わざを\nつかう ヒーロー', emoji: '✨', w: { idea: 2, curious: 1, design: 1 } },
      ],
    },
  ];

  // 属性の質問（14回ミーティング「属性項目は質問画面で扱う」）。診断の計算には使わない。
  BKF.ageQuestion = {
    id: 'age',
    text: 'なんさい？',
    hint: 'おうちの {人|ひと}と いっしょに えらんでね',
    options: [
      { value: '3', label: '3さい' },
      { value: '4', label: '4さい' },
      { value: '5', label: '5さい' },
      { value: '6', label: '6さい' },
      { value: '7', label: '7さい' },
      { value: '8', label: '8さい' },
      { value: '9', label: '9さい' },
      { value: '10', label: '10さい' },
      { value: '11+', label: '11さい\nいじょう' },
      { value: 'secret', label: 'ひみつ' },
    ],
  };

  // 結果発表の前に聞く「気になる企業」。ニューラルネットワークの正解ラベルに使う。診断の計算には使わない。
  BKF.interestQuestion = {
    id: 'interest',
    text: '{気|き}になる かいしゃは どれ？',
    hint: 'いちばん {気|き}になる かいしゃを えらんでね',
    noneLabel: 'まだ わからない',
    noneEmoji: '🤔',
  };
})(typeof window !== 'undefined' ? window : globalThis);
