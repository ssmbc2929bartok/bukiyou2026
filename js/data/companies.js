/*
 * 企業データ（結果表示 S-004 と「気になる企業」で使う）
 * 結果に出すのは、不器用ファクトリーのトレーディングカードのページ
 * （https://bukiyo-factory.osaka/trading-card）に載っている企業のうち、
 * 枚方信用金庫・大阪工業大学・KUZUHA MALL・枚方市を除いた18社。
 * この回に出す企業は js/config.js の companyIds で選べる。
 *
 *   short  : 画面に出す短い名前
 *   icon   : 何を作っている会社かが分かる絵文字
 *   desc   : 子ども向けの説明（{漢字|よみ} でルビ）
 *   adult  : 保護者向けの説明
 *   url    : 結果画面の「もっと見る」で開くページ。トレーディングカードのページの「公式サイト」と同じ。
 *            空のときはトレーディングカードのページを開く
 *   vector : 12軸（js/data/axes.js）での会社の特徴。0〜3 の手打ちの仮の値。
 *            判定のときは企業間の平均を引いてから比べる。社長アンケートの結果で置き換える。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.tradingCardUrl = 'https://bukiyo-factory.osaka/trading-card';

  BKF.companies = [
    {
      id: 'ifa', name: '株式会社IFA住宅設計室', short: 'IFA住宅設計室', icon: '🏠', color: '#a3b18a',
      desc: 'けんちくかと いっしょに、すてきな {家|いえ}づくりを して いるよ。',
      adult: '枚方・交野・寝屋川を中心に、注文住宅やリノベーションなどの家づくり',
      url: 'https://www.ifainc.jp/',
      vector: { design: 3, idea: 3, kind: 2, social: 1 },
    },
    {
      id: 'actech', name: 'アクテック株式会社', short: 'アクテック', icon: '🧰', color: '#e76f51',
      desc: 'だいじな ものを まもる アルミの ケースや、やわらかい ケースを {作|つく}って いるよ。',
      adult: 'アルミケース・ソフトケースの製造・販売（1台から製作）',
      url: 'https://www.actec1972.co.jp/',
      vector: { kind: 1, steady: 2, careful: 2, craft: 3, design: 1, social: 1 },
    },
    {
      id: 'asahi', name: '朝日熱処理工業株式会社', short: '朝日熱処理工業', icon: '🔥', color: '#e63946',
      desc: '{金|きん}ぞくを あつく して、つよく {長|なが}もちに する しごとを して いるよ。',
      adult: '金属部品を熱処理して強度を高め、長く使えるようにする',
      url: 'https://www.asahi-nets.com/',
      vector: { challenge: 3, active: 3, steady: 2, curious: 1 },
    },
    {
      id: 'ebisu', name: 'エビス電子株式会社', short: 'エビス電子', icon: '💡', color: '#f6bd60',
      desc: '{電気|でんき}の ぶひんを とどけたり、とくべつな ひかりの LEDを あつかったり して いるよ。',
      adult: '電子部品の販売商社。赤外線・紫外線などの特殊LEDが得意',
      url: 'https://www.ebisudenshi.co.jp/',
      vector: { social: 3, logic: 2, curious: 2, kind: 1, challenge: 1 },
    },
    {
      id: 'ms', name: '株式会社エムズコーポレーション', short: 'エムズコーポレーション', icon: '🖨️', color: '#8e7dbe',
      desc: '3Dプリンターなどで、あたらしい せいひんの ためしづくり（しさくひん）を して いるよ。',
      adult: '3Dプリンターや加工技術を使った製品の試作品づくり',
      url: 'https://www.ms-corporation.jp/',
      vector: { craft: 2, idea: 2, curious: 1, logic: 1 },
    },
    {
      id: 'ishizai', name: '大阪石材工業株式会社', short: '大阪石材工業', icon: '🪨', color: '#8d8d8d',
      desc: '{石|いし}を けずったり ほったり して、おはかや たてものの {石|いし}を {作|つく}って いるよ。',
      adult: '墓石や建築石材などの販売・設計・加工・施工',
      url: 'https://www.osaka-sekizai.jp/',
      vector: { craft: 3, steady: 3, design: 2, active: 1 },
    },
    {
      id: 'kashii', name: '香椎化学工業株式会社', short: '香椎化学工業', icon: '🧴', color: '#f4a3c0',
      desc: 'はだを まもる クリームなどを、{研究|けんきゅう}して {作|つく}って いるよ。',
      adult: '1952年から、スキンケアを中心とした化粧品・医薬部外品の研究開発・製造',
      url: 'https://cathy.co.jp/',
      vector: { kind: 3, curious: 2, logic: 2, careful: 2, design: 1 },
    },
    {
      id: 'sanesu', name: 'サンエス工業株式会社', short: 'サンエス工業', icon: '🌬️', color: '#4cc9f0',
      desc: 'へやの {空気|くうき}を ととのえる せつびや、ものに {色|いろ}を ぬる こうじょうの せつびを {作|つく}って いるよ。',
      adult: '空調設備・塗装プラント設備の設計・施工と関連部材の製作',
      url: 'https://www.sanesu-ind.co.jp/',
      vector: { logic: 2, active: 2, social: 2, careful: 1 },
    },
    {
      id: 'daicolor', name: 'ダイコロ株式会社', short: 'ダイコロ', icon: '📚', color: '#ff8fab',
      desc: 'みんなの {思|おも}い{出|で}を のこす、そつぎょうアルバムを {作|つく}って いるよ。',
      adult: '卒業アルバムの製作（創立70周年）。トレーディングカードの印刷も担当',
      url: 'https://www.daicolo.co.jp/',
      vector: { social: 3, design: 3, kind: 2, idea: 1 },
    },
    {
      id: 'taiho', name: '株式会社大豊製作所', short: '大豊製作所', icon: '🔩', color: '#6c8ea4',
      desc: '{大|おお}きな はたらく くるまに つかう、{金|きん}ぞくの ぶひんを {作|つく}って いるよ。',
      adult: '建設機械メーカーの1次サプライヤーとして、金属部品を少量多品種で製造',
      url: 'https://www.kk-taiho.jp/',
      vector: { careful: 3, logic: 2, steady: 2, craft: 2, challenge: 1 },
    },
    {
      id: 'take', name: '株式会社テイク・システムズ', short: 'テイク・システムズ', icon: '📱', color: '#2a9d8f',
      desc: 'スマホなどの {画面|がめん}を しらべる きかいを、せっけいして {作|つく}って いるよ。',
      adult: 'スマートフォンなどのディスプレイ検査機の設計・開発',
      url: 'https://www.take-systems.co.jp/',
      vector: { logic: 3, careful: 3, curious: 2, idea: 1 },
    },
    {
      id: 'noboru', name: '株式会社ノボル電機', short: 'ノボル電機', icon: '🔊', color: '#4ea8de',
      desc: '{大|おお}きな {音|おと}を とどける スピーカーや アンプを {作|つく}って いるよ。',
      adult: '昭和25年創業の業務用拡声音響装置メーカー',
      url: 'https://www.noborudenki.co.jp/',
      vector: { leader: 2, social: 2, curious: 1, craft: 1, active: 1 },
    },
    {
      id: 'factory', name: '株式会社ファクトリー', short: 'ファクトリー', icon: '🛋️', color: '#c9a227',
      desc: 'お{店|みせ}や {家|いえ}の なかを、すてきに つくりかえる しごとを して いるよ。',
      adult: 'インテリアにこだわった内装・工事。地域の伝統行事の復興にも取り組む',
      url: 'https://www.factory-corp.com/',
      vector: { design: 3, craft: 2, social: 2, leader: 1 },
    },
    {
      id: 'fukui', name: '株式会社福井製作所', short: '福井製作所', icon: '🚢', color: '#3d5a80',
      desc: 'きかいや {船|ふね}を まもる「あんぜんべん」を {作|つく}って いるよ。{世界|せかい}で たくさん つかわれて いるよ。',
      adult: '1936年創業の安全弁専門メーカー。LNG船用安全弁は世界シェア90%超',
      url: '',
      vector: { careful: 3, kind: 2, logic: 2, steady: 1, leader: 1 },
    },
    {
      id: 'hosokawa', name: 'ホソカワミクロン株式会社', short: 'ホソカワミクロン', icon: '⏳', color: '#457b9d',
      desc: 'こなを まぜたり こまかく したり する きかいを、{世界|せかい}に とどけて いるよ。',
      adult: '粉体機器の世界最大手（1916年設立、本社は枚方市）',
      url: 'https://www.hosokawamicron.co.jp/jp/',
      vector: { curious: 3, logic: 2, leader: 1, challenge: 2, active: 1 },
    },
    {
      id: 'muromoto', name: '室本鉄工株式会社', short: '室本鉄工', icon: '🔧', color: '#b5651d',
      desc: 'ペンチなど、しょくにんさんが つかう どうぐを {作|つく}って いるよ。',
      adult: '作業工具「MERRY」と空気工具「NILE」の老舗工具メーカー',
      url: 'https://www.muromoto.co.jp/',
      vector: { craft: 3, steady: 2, careful: 1, active: 1 },
    },
    {
      id: 'melos', name: '株式会社MELOS', short: 'MELOS', icon: '🧪', color: '#9d4edd',
      desc: 'プラスチックや {金|きん}ぞく、ゴムで、あたらしい アイデアを カタチに して いるよ。',
      adult: 'プラスチック・金属・ゴムなど多様な材料による新商品開発の支援',
      url: 'https://go-melos.jp/',
      vector: { idea: 3, challenge: 3, social: 1, curious: 1 },
    },
    {
      id: 'yoshiizumi', name: '吉泉産業株式会社', short: '吉泉産業', icon: '🥗', color: '#80b918',
      desc: 'やさいや お{肉|にく}を きれいに きる きかいを {作|つく}って いるよ。',
      adult: '業務用フードスライサーなど食品加工機械の開発・販売',
      url: 'https://yoshiizumi.com/',
      vector: { careful: 3, design: 2, kind: 2, active: 1 },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
