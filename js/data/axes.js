/*
 * 性格の軸（d = 12）
 * 質問の選択肢・性格タイプ・企業は、すべてこの12軸のベクトルで表す。
 * 10月開催は手打ちの仮の軸。開催後に回答データと社長アンケートで見直す。
 *
 *   label : 子ども向けの表示（結果画面の「にている ところ」）
 *   adult : 保護者・運営向けの説明
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};

  BKF.axes = [
    { id: 'social',    icon: '🤝', label: 'なかよし',   adult: '協調性・チームワーク' },
    { id: 'leader',    icon: '📣', label: 'リーダー',   adult: '発信力・主体性' },
    { id: 'kind',      icon: '💗', label: 'やさしさ',   adult: '思いやり・共感' },
    { id: 'steady',    icon: '🐢', label: 'こつこつ',   adult: '計画性・粘り強さ' },
    { id: 'challenge', icon: '🚀', label: 'チャレンジ', adult: '挑戦心・行動力' },
    { id: 'idea',      icon: '💡', label: 'ひらめき',   adult: '発想力・創造性' },
    { id: 'curious',   icon: '🔍', label: 'なぜなぜ',   adult: '好奇心・探究心' },
    { id: 'logic',     icon: '🧠', label: 'かんがえる', adult: '論理的思考' },
    { id: 'careful',   icon: '📏', label: 'ていねい',   adult: '正確さ・丁寧さ' },
    { id: 'craft',     icon: '🖐️', label: 'てさき',     adult: '手先の器用さ・ものづくり' },
    { id: 'active',    icon: '🏃', label: 'げんき',     adult: '活発さ・体を動かす' },
    { id: 'design',    icon: '🎨', label: 'センス',     adult: '美的感覚・デザイン' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
