/*
 * F-003 データ集計機能のうち、GAS（スプレッドシート）への送信
 *
 * GAS のウェブアプリには Content-Type: text/plain で POST する。
 * （application/json だとブラウザが事前確認のリクエストを送り、GAS が受け付けないため）
 * 送れなかったときのエラーは端末に残しておき、次に送れたときに管理者へまとめて送る。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF = root.BKF || {};
  const ERROR_KEY = 'bkf.pendingErrors';
  const MAX_ERRORS = 50;

  function post(body) {
    const url = BKF.config.gasUrl;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () {
      if (controller) controller.abort();
    }, BKF.config.sendTimeoutMs);

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (!json || json.ok !== true) throw new Error((json && json.error) || '保存できませんでした');
        return json;
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  function readErrors() {
    try {
      return JSON.parse(root.localStorage.getItem(ERROR_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function writeErrors(list) {
    try {
      if (list.length === 0) root.localStorage.removeItem(ERROR_KEY);
      else root.localStorage.setItem(ERROR_KEY, JSON.stringify(list.slice(-MAX_ERRORS)));
    } catch (e) {
      // 保存できない端末（プライベートモードなど）では諦める
    }
  }

  BKF.api = {
    enabled: function () {
      return Boolean(BKF.config.gasUrl);
    },

    // 診断結果を1件送る
    sendResult: function (payload) {
      return post(Object.assign({ kind: 'result' }, payload));
    },

    // 送れなかったことを記録する（回答の中身は残さない）
    recordError: function (info) {
      const list = readErrors();
      list.push(Object.assign({ at: new Date().toISOString() }, info));
      writeErrors(list);
    },

    // たまっているエラーを管理者に送る。失敗したら次の機会にまた送る
    flushErrors: function () {
      const list = readErrors();
      if (!this.enabled() || list.length === 0) return Promise.resolve();
      return post({
        kind: 'error',
        eventId: BKF.config.eventId,
        appVersion: BKF.config.appVersion,
        errors: list,
      })
        .then(function () { writeErrors(readErrors().slice(list.length)); })
        .catch(function () { /* 次の機会に送る */ });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
