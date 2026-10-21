/*
 * 企業データ（結果表示 S-004 と「気になる企業」で使う）
 * 前提条件「開催ごとにアンケート結果の表示企業を変更する」：
 *   この回に出す企業は js/config.js の companyIds で選ぶ。新しい企業はここに足す。
 *
 *   short  : 画面に出す短い名前
 *   icon   : 何を作っている会社かが分かる絵文字
 *   desc   : 子ども向けの説明（{漢字|よみ} でルビ）
 *   adult  : 保護者向けの説明
 *   vector : 12軸（js/data/axes.js）での会社の特徴。0〜3 の手打ちの仮の値。
 *            判定のときは企業間の平均を引いてから比べる。社長アンケートの結果で置き換える。
 *
 * 会社の説明は「不器用 FACTORY in ひらかた 2023」チラシ（枚方市プレスリリース 2023/10/30）を元にした。
 * 公開前に各社・事務局に内容を確認すること。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.companies = [
    {
      id: 'actech', name: 'アクテック株式会社', short: 'アクテック', icon: '🧰', color: '#e76f51',
      desc: 'だいじな ものを まもる アルミの ケースや、やわらかい ケースを {作|つく}って いるよ。',
      adult: 'アルミケース・ソフトケースの製造・販売',
      vector: { kind: 1, steady: 2, careful: 2, craft: 3, design: 1, social: 1 },
    },
    {
      id: 'kashii', name: '香椎化学工業株式会社', short: '香椎化学工業', icon: '🧴', color: '#f4a3c0',
      desc: 'はだを まもる クリームなどを、{研究|けんきゅう}して {作|つく}って いるよ。',
      adult: 'スキンケア商品を中心とした化粧品・医薬部外品の研究開発・製造',
      vector: { kind: 3, curious: 2, logic: 2, careful: 2, design: 1 },
    },
    {
      id: 'daiho', name: '株式会社大豊製作所', short: '大豊製作所', icon: '🔩', color: '#6c8ea4',
      desc: '{大|おお}きな はたらく くるまに つかう、{金|きん}ぞくの ぶひんを {作|つく}って いるよ。',
      adult: '建設機械メーカー向けの金属部品（少量多品種）の製造・販売',
      vector: { steady: 3, careful: 3, craft: 3, active: 1, challenge: 1 },
    },
    {
      id: 'ebisu', name: 'エビス電子株式会社', short: 'エビス電子', icon: '🔌', color: '#f6bd60',
      desc: '{電気|でんき}の ぶひんを とどけたり、きかいを せっけい したり して いるよ。',
      adult: '電子部品の販売商社。電子機器の設計・加工も手がける',
      vector: { social: 3, logic: 2, curious: 2, kind: 1, challenge: 1 },
    },
    {
      id: 'noboru', name: '株式会社ノボル電機', short: 'ノボル電機', icon: '🔊', color: '#4ea8de',
      desc: '{大|おお}きな {音|おと}を とどける スピーカーや アンプを {作|つく}って いるよ。',
      adult: '業務用スピーカー・アンプなど拡声音響装置の製造・販売',
      vector: { leader: 3, social: 2, curious: 1, craft: 1, active: 1 },
    },
    {
      id: 'ifa', name: '株式会社IFA住宅設計室', short: 'IFA住宅設計室', icon: '🏠', color: '#a3b18a',
      desc: 'けんちくかと いっしょに、すてきな {家|いえ}づくりを して いるよ。',
      adult: '建築家との注文住宅・建て替え・リノベーション',
      vector: { design: 3, idea: 3, kind: 2, social: 1 },
    },
    {
      id: 'asahi', name: '朝日熱処理工業株式会社', short: '朝日熱処理工業', icon: '🔥', color: '#e63946',
      desc: '{金|きん}ぞくを あつく して、つよく {長|なが}もちに する しごとを して いるよ。',
      adult: '熱処理で金属の強度を高め、長く使えるようにする',
      vector: { challenge: 3, active: 3, steady: 2, curious: 1 },
    },
    {
      id: 'melos', name: '株式会社MELOS', short: 'MELOS', icon: '🧪', color: '#9d4edd',
      desc: 'プラスチックや {金|きん}ぞく、ゴムで、あたらしい アイデアを カタチに して いるよ。',
      adult: 'プラスチック・金属・シリコンゴムなどを加工する新商品開発支援',
      vector: { idea: 3, challenge: 3, craft: 2, curious: 1 },
    },
    {
      id: 'take', name: '株式会社テイク・システムズ', short: 'テイク・システムズ', icon: '📱', color: '#2a9d8f',
      desc: 'スマホなどの {画面|がめん}を しらべる きかいを、せっけいして {作|つく}って いるよ。',
      adult: 'スマートフォンやカーナビなどのディスプレイ検査機の設計・開発',
      vector: { logic: 3, careful: 3, curious: 2, idea: 1 },
    },
    {
      id: 'yoshiizumi', name: '吉泉産業株式会社', short: '吉泉産業', icon: '🥗', color: '#80b918',
      desc: 'やさいや お{肉|にく}を きれいに きる きかいを {作|つく}って いるよ。',
      adult: '業務用フードスライサーの開発・販売',
      vector: { kind: 2, design: 2, careful: 2, logic: 1, curious: 1 },
    },
    {
      id: 'daicolor', name: 'ダイコロ株式会社', short: 'ダイコロ', icon: '📚', color: '#ff8fab',
      desc: 'みんなの {思|おも}い{出|で}を のこす、そつぎょうアルバムを {作|つく}って いるよ。',
      adult: '卒業アルバムの制作（日本トップシェア）',
      vector: { social: 3, design: 3, kind: 2, idea: 1 },
    },
    {
      id: 'hosokawa', name: 'ホソカワミクロン株式会社', short: 'ホソカワミクロン', icon: '⏳', color: '#457b9d',
      desc: 'こなを まぜたり こまかく したり する きかいを、{世界|せかい}に とどけて いるよ。',
      adult: '粉体機器の世界最大手（1916年 枚方で創業）',
      vector: { curious: 3, logic: 2, leader: 2, challenge: 2, active: 1 },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
