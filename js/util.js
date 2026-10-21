/*
 * 共通の小さな関数
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};
  const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  BKF.util = {
    escapeHtml: escapeHtml,

    // '{天気|てんき}' → <ruby>天気<rt>てんき</rt></ruby>、'\n' → <br>
    rubyHtml: function (text) {
      return escapeHtml(text)
        .replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>')
        .replace(/\n/g, '<br>');
    },

    // ルビと改行を外した文字（スプレッドシートや読み上げ用）
    plain: function (text) {
      return String(text).replace(RUBY, '$1').replace(/\n/g, ' ');
    },

    // 回答ごとに付ける ID
    uuid: function () {
      if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },

    wait: function (ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
