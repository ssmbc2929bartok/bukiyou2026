/**
 * 不器用ファクトリー 性格診断アプリ：データの受け取りと保存（F-003 / R-001）
 *
 * 使い方（くわしくは README.md）
 *   1. 保存先のスプレッドシートを開き、「拡張機能 → Apps Script」にこのファイルの中身を貼る
 *   2. 関数 setup を一度実行して、シートを作る（権限の確認が出たら許可する）
 *   3. 「デプロイ → 新しいデプロイ → ウェブアプリ」
 *      次のユーザーとして実行：自分 / アクセスできるユーザー：全員
 *   4. 表示された URL を js/config.js の gasUrl に貼る
 *   エラーをメールで受け取るときは「プロジェクトの設定 → スクリプト プロパティ」に
 *   ADMIN_EMAIL を追加する。
 *
 * シート
 *   回答       … 1回の診断が1行（R-001 の元データ）
 *   企業集計   … 開催回 × 企業ごとの「診断結果になった回数」「気になる企業に選ばれた回数」
 *                「結果画面からページを開いた回数」
 *   回答集計   … 開催回 × 質問 × 選択肢ごとの回数（回答のばらつき・かたよりの確認用）。
 *                年れい・実験条件（A/B）・出たゲームの回数も数える
 *   リンク     … 結果画面の「もっと見る」を押した記録
 *   エラー     … アプリから送られてきた送信エラーの記録
 */

const SHEET_RESULTS = '回答';
const SHEET_COMPANY = '企業集計';
const SHEET_ANSWER = '回答集計';
const SHEET_ERRORS = 'エラー';
const SHEET_LINKS = 'リンク';

const COMPANY_HEADERS = ['開催回', '企業', '診断結果になった回数', '気になる企業に選ばれた回数', 'ページを開いた回数'];
const ANSWER_HEADERS = ['開催回', '質問', '選択肢', '回数'];
const LINK_HEADERS = ['受信日時', '開催回', 'sessionId', '企業', 'URL'];
const ERROR_HEADERS = ['受信日時', '開催回', 'アプリ版', '発生日時', 'sessionId', '1回目', '2回目', 'オンライン'];

const MAX_BODY_LENGTH = 20000;
const MAX_TEXT_LENGTH = 200;
const DUPLICATE_SECONDS = 6 * 60 * 60;
const MAIL_INTERVAL_SECONDS = 10 * 60;

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents;
    if (!body || body.length > MAX_BODY_LENGTH) return output({ ok: false, error: 'bad request' });
    const data = JSON.parse(body);
    if (data.kind === 'result') return output(saveResult(data));
    if (data.kind === 'error') return output(saveErrors(data));
    if (data.kind === 'click') return output(saveClick(data));
    return output({ ok: false, error: 'unknown kind' });
  } catch (err) {
    notifyAdmin('受信中にエラーが起きました', String((err && err.stack) || err));
    return output({ ok: false, error: String(err) });
  }
}

// ブラウザで URL を開いたときの動作確認用
function doGet() {
  return output({ ok: true, app: 'bukiyou2026' });
}

function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------ 診断結果

function saveResult(data) {
  const sessionId = String(data.sessionId || '');
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, error: 'bad sessionId' };

  // アプリは失敗すると送り直すので、同じ sessionId は1回だけ保存する
  const cache = CacheService.getScriptCache();
  if (cache.get('session_' + sessionId)) return { ok: true, duplicate: true };

  const row = { receivedAt: new Date() };
  Object.keys(data).forEach(function (key) {
    if (key === 'kind') return;
    row[cleanKey(key)] = cleanValue(data[key]);
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendByHeader(getSheet(SHEET_RESULTS), row);

    const eventId = row.eventId;
    const companyCounts = [];
    if (row.company) companyCounts.push({ key: [eventId, row.company], column: 2 });
    if (row.interest) companyCounts.push({ key: [eventId, row.interest], column: 3 });
    increment(getSheet(SHEET_COMPANY, COMPANY_HEADERS), 2, companyCounts);

    const answerCounts = Object.keys(row)
      .filter(function (key) { return key.indexOf('a_') === 0; })
      .map(function (key) { return { key: [eventId, key.slice(2), row[key]], column: 3 }; });
    answerCounts.push({ key: [eventId, 'age', row.age], column: 3 });
    if (row.condition) answerCounts.push({ key: [eventId, 'condition', row.condition], column: 3 });
    String(row.games || '').split(',').filter(String).forEach(function (id) {
      answerCounts.push({ key: [eventId, 'game', id], column: 3 });
    });
    increment(getSheet(SHEET_ANSWER, ANSWER_HEADERS), 3, answerCounts);
  } finally {
    lock.releaseLock();
  }

  cache.put('session_' + sessionId, '1', DUPLICATE_SECONDS);
  return { ok: true };
}

// ------------------------------------------------------------------ 結果画面のリンク

function saveClick(data) {
  const sessionId = String(data.sessionId || '');
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, error: 'bad sessionId' };
  const company = cleanKey(data.company);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet(SHEET_LINKS, LINK_HEADERS);
    sheet.appendRow([new Date(), cleanValue(data.eventId), sessionId, company, cleanValue(data.url)]);
    increment(getSheet(SHEET_COMPANY, COMPANY_HEADERS), 2, [{ key: [cleanValue(data.eventId), company], column: 4 }]);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

// ------------------------------------------------------------------ 送信エラー

function saveErrors(data) {
  const errors = Array.isArray(data.errors) ? data.errors.slice(0, 50) : [];
  if (errors.length === 0) return { ok: true };

  const sheet = getSheet(SHEET_ERRORS, ERROR_HEADERS);
  const now = new Date();
  const rows = errors.map(function (er) {
    return [
      now,
      cleanValue(data.eventId),
      cleanValue(data.appVersion),
      cleanValue(er.at),
      cleanValue(er.sessionId),
      cleanValue(er.first),
      cleanValue(er.second),
      cleanValue(er.online),
    ];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ERROR_HEADERS.length).setValues(rows);

  notifyAdmin(
    'データ送信エラーが ' + rows.length + ' 件ありました',
    '開催回: ' + data.eventId + '\n' +
      rows.map(function (r) { return r[3] + '  ' + r[5] + ' / ' + r[6]; }).join('\n') +
      '\n\nシート「' + SHEET_ERRORS + '」を確認してください。'
  );
  return { ok: true };
}

// ADMIN_EMAIL があればメールで知らせる（10分に1通まで）
function notifyAdmin(subject, body) {
  const to = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!to) return;
  const cache = CacheService.getScriptCache();
  if (cache.get('mail_sent')) return;
  cache.put('mail_sent', '1', MAIL_INTERVAL_SECONDS);
  try {
    MailApp.sendEmail(to, '[性格診断アプリ] ' + subject, body);
  } catch (err) {
    console.error(err);
  }
}

// ------------------------------------------------------------------ シート操作

function getSheet(name, headers) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(name);
  if (!sheet) sheet = book.insertSheet(name);
  if (headers && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (headers && sheet.getLastColumn() < headers.length) {
    // 前の版で作ったシートに、あとから足した見出しを付け足す
    const have = sheet.getLastColumn();
    sheet.getRange(1, have + 1, 1, headers.length - have).setValues([headers.slice(have)]);
  }
  return sheet;
}

// 1行目の見出しに合わせて行を足す。知らない項目は見出しを右に足す
function appendByHeader(sheet, row) {
  const keys = Object.keys(row);
  let headers = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missing = keys.filter(function (k) { return headers.indexOf(k) === -1; });
  if (missing.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
    sheet.setFrozenRows(1);
  }
  const values = headers.map(function (h) { return row[h] === undefined ? '' : row[h]; });
  sheet.appendRow(values);
}

/*
 * 集計シートの回数を増やす
 *   keyLength : 先頭から何列がキーか
 *   entries   : [{ key: [...], column: 何列目（0始まり）を +1 するか }]
 */
function increment(sheet, keyLength, entries) {
  if (entries.length === 0) return;
  const width = sheet.getLastColumn();
  const values = sheet.getDataRange().getValues();
  const index = {};
  for (let r = 1; r < values.length; r++) {
    index[JSON.stringify(values[r].slice(0, keyLength).map(String))] = r;
  }
  entries.forEach(function (en) {
    const id = JSON.stringify(en.key.map(String));
    let r = index[id];
    if (r === undefined) {
      const fresh = [];
      for (let c = 0; c < width; c++) fresh.push(c < keyLength ? en.key[c] : 0);
      values.push(fresh);
      r = values.length - 1;
      index[id] = r;
    }
    values[r][en.column] = (Number(values[r][en.column]) || 0) + 1;
  });
  sheet.getRange(1, 1, values.length, width).setValues(values);
}

// 見出しに使える名前だけにする
function cleanKey(key) {
  return String(key).replace(/[^0-9A-Za-z_]/g, '').slice(0, 40) || 'unknown';
}

// 文字は短くし、= などで始まる文字は数式として扱われないようにする
function cleanValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const text = String(value).slice(0, MAX_TEXT_LENGTH);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// ------------------------------------------------------------------ 準備・確認

// 最初に一度だけ実行する。シートを作り、権限を許可するための関数
function setup() {
  getSheet(SHEET_RESULTS);
  getSheet(SHEET_COMPANY, COMPANY_HEADERS);
  getSheet(SHEET_ANSWER, ANSWER_HEADERS);
  getSheet(SHEET_ERRORS, ERROR_HEADERS);
  getSheet(SHEET_LINKS, LINK_HEADERS);
}
