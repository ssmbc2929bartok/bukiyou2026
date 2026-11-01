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
 *   ゲーム集計 … 開催回 × ゲーム × 難易度ごとの、遊んだ回数・クリアした回数・クリア秒数の平均・
 *                とばした回数・時間切れの回数（v2.4.0）
 *   社長回答   … 社長さん用（URL に ?shacho）の回答が1行（v2.6.0）。どの企業の社長さんか（president）、
 *                「ここにない」のときに書いた企業名（presidentOther）、質問の答え、ゲームの値など。
 *                子どもの「回答」や集計のシートには入れない
 *   リンク     … 結果画面の「もっと見る」を押した記録
 *   エラー     … アプリから送られてきた送信エラーの記録
 *
 * 受け口の守り（v2.6.2）
 *   送り先の URL はサイトから誰でも見えるので、いたずらの送信が来ても シートが こわれないようにする。
 *   - 決まった形の項目名だけを保存する（allowedKey）。1回の送信の項目は MAX_KEYS まで
 *   - シートの列は MAX_COLUMNS まで。こえる新しい項目は保存せず、管理者に知らせる
 *   - 集計に数える値は、決まった形のものだけ（質問の答えは 0〜9、ゲームは GAME_IDS など）
 *   - 1分に MAX_PER_MINUTE 回をこえる送信は受け付けない（Apps Script の使える量を守る）
 *   - あやしい回答は保存したうえで suspect 列に理由を書く（short：20秒未満で終わった、time：時刻が おかしい、
 *     burst：短いあいだに たくさん届いた、answers：答えが少ない、president：社長さんの企業が おかしい）
 */

const SHEET_RESULTS = '回答';
const SHEET_COMPANY = '企業集計';
const SHEET_ANSWER = '回答集計';
const SHEET_ERRORS = 'エラー';
const SHEET_LINKS = 'リンク';
const SHEET_GAMES = 'ゲーム集計';
const SHEET_SHACHO = '社長回答';

const COMPANY_HEADERS = ['開催回', '企業', '診断結果になった回数', '気になる企業に選ばれた回数', 'ページを開いた回数'];
const ANSWER_HEADERS = ['開催回', '質問', '選択肢', '回数'];
const LINK_HEADERS = ['受信日時', '開催回', 'sessionId', '企業', 'URL'];
const GAME_HEADERS = ['開催回', 'ゲーム', '難易度', '遊んだ回数', 'クリアした回数', 'クリア秒数の合計', 'クリア秒数の平均', 'とばした回数', '時間切れの回数'];
const TIER_NAMES = ['初級', '中級', '上級'];
const ERROR_HEADERS = ['受信日時', '開催回', 'アプリ版', '発生日時', 'sessionId', '1回目', '2回目', 'オンライン'];

const MAX_BODY_LENGTH = 20000;
const MAX_TEXT_LENGTH = 200;
const DUPLICATE_SECONDS = 6 * 60 * 60;
const MAIL_INTERVAL_SECONDS = 10 * 60;

// 受け口の守り（v2.6.2）
const MAX_KEYS = 300;           // 1回の送信で受け取る項目の数（ふつうは 100 くらい）
const MAX_COLUMNS = 1000;       // シートの列の上限（スプレッドシートの上限は 18,278 列）
const MAX_PER_MINUTE = 120;     // 1分に受け付ける送信の数（すべての種類を合わせて）
const BURST_PER_MINUTE = { kids: 20, shacho: 5 };   // これより多く届いた1分の回答には suspect: burst
const MIN_DURATION_SEC = 20;    // これより早く終わった回答には suspect: short
const GAME_IDS = ['screw', 'crossword', 'memory', 'trace', 'paint', 'cream', 'heat', 'circuit', 'stone', 'ball', 'robot', 'jump', 'bounce'];
const AGE_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', '11+', 'secret'];
const FIELDS = ['eventId', 'appVersion', 'sessionId', 'startedAt', 'finishedAt', 'durationSec', 'age', 'interest',
  'type', 'company', 'company2', 'company3', 'similarity', 'fallback', 'condition', 'tier', 'games', 'screen',
  'mode', 'president', 'presidentOther'];
const KEY_PATTERNS = [
  /^a_q[0-9]{1,3}$/,                                              // 質問の答え
  /^v_[a-z]{1,20}$/,                                              // 回答者ベクトル
  /^s_[a-z]{1,20}$/,                                              // 企業との類似度
  new RegExp('^g_(' + GAME_IDS.join('|') + ')_[A-Za-z]{1,24}$'),  // ゲームの値
];

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents;
    if (!body || body.length > MAX_BODY_LENGTH) return output({ ok: false, error: 'bad request' });
    if (tooMany()) return output({ ok: false, error: 'busy' });
    const data = JSON.parse(body);
    if (data.kind === 'result') return output(saveResult(data));
    if (data.kind === 'error') return output(saveErrors(data));
    if (data.kind === 'click') return output(saveClick(data));
    return output({ ok: false, error: 'unknown kind' });
  } catch (err) {
    notifyAdmin('受信中にエラーが起きました', String((err && err.stack) || err));
    // くわしい中身は送り主に返さない（管理者へのメールとログにだけ残す）
    return output({ ok: false, error: 'server error' });
  }
}

// ブラウザで URL を開いたときの動作確認用
function doGet() {
  return output({ ok: true, app: 'bukiyou2026' });
}

function output(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------ 受け口の守り（v2.6.2）

// 1分ごとに数を数える（name ごと）。数えたあとの数を返す
function countThisMinute(name) {
  const cache = CacheService.getScriptCache();
  const key = 'count_' + name + '_' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n;
}

function tooMany() {
  return countThisMinute('all') > MAX_PER_MINUTE;
}

// 保存してよい項目名か
function allowedKey(key) {
  if (FIELDS.indexOf(key) !== -1) return true;
  return KEY_PATTERNS.some(function (re) { return re.test(key); });
}

// 企業の id（英小文字）か
function companyId(value) {
  const v = String(value || '');
  return /^[a-z]{1,20}$/.test(v) ? v : '';
}

// あやしい回答の理由（なければ空）
function suspectReasons(row) {
  const reasons = [];
  const duration = Number(row.durationSec);
  if (!isFinite(duration) || duration < MIN_DURATION_SEC) reasons.push('short');
  const started = Date.parse(row.startedAt);
  const finished = Date.parse(row.finishedAt);
  const now = Date.now();
  if (!isFinite(started) || !isFinite(finished) || finished < started || finished > now + 10 * 60000 ||
      Math.abs((finished - started) / 1000 - duration) > 10) reasons.push('time');
  const answers = Object.keys(row).filter(function (k) { return k.indexOf('a_') === 0; }).length;
  if (answers < 5) reasons.push('answers');
  const shacho = row.mode === 'shacho';
  if (countThisMinute(shacho ? 'shacho' : 'kids') > BURST_PER_MINUTE[shacho ? 'shacho' : 'kids']) reasons.push('burst');
  if (shacho && !(row.president === 'other' ? String(row.presidentOther || '').trim() : companyId(row.president))) {
    reasons.push('president');
  }
  return reasons.join(',');
}

// ------------------------------------------------------------------ 診断結果

function saveResult(data) {
  const sessionId = String(data.sessionId || '');
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, error: 'bad sessionId' };

  // アプリは失敗すると送り直すので、同じ sessionId は1回だけ保存する
  const cache = CacheService.getScriptCache();
  if (cache.get('session_' + sessionId)) return { ok: true, duplicate: true };

  // 決まった形の項目だけを残す（いたずらで列を増やされないように）
  const keys = Object.keys(data).filter(function (key) { return allowedKey(key); });
  if (keys.length > MAX_KEYS) return { ok: false, error: 'too many fields' };
  if (!/^[0-9A-Za-z_-]{1,30}$/.test(String(data.eventId || ''))) return { ok: false, error: 'bad eventId' };
  if (!/^[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{1,2}$/.test(String(data.appVersion || ''))) return { ok: false, error: 'bad appVersion' };

  const row = { receivedAt: new Date() };
  keys.forEach(function (key) {
    row[key] = cleanValue(data[key]);
  });
  row.suspect = suspectReasons(row);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // 社長さん用の回答は「社長回答」シートにだけ入れて、子どもの回答や集計には数えない（v2.6.0）
    if (row.mode === 'shacho') {
      appendByHeader(getSheet(SHEET_SHACHO), row);
      cache.put('session_' + sessionId, '1', DUPLICATE_SECONDS);
      return { ok: true };
    }
    appendByHeader(getSheet(SHEET_RESULTS), row);

    // 集計には、決まった形の値だけを数える（いたずらで集計の行を増やされないように）
    const eventId = row.eventId;
    const games = String(row.games || '').split(',').filter(function (id) { return GAME_IDS.indexOf(id) !== -1; }).slice(0, 5);
    const companyCounts = [];
    if (companyId(row.company)) companyCounts.push({ key: [eventId, row.company], column: 2 });
    if (companyId(row.interest)) companyCounts.push({ key: [eventId, row.interest], column: 3 });
    increment(getSheet(SHEET_COMPANY, COMPANY_HEADERS), 2, companyCounts);

    const answerCounts = Object.keys(row)
      .filter(function (key) { return key.indexOf('a_') === 0 && /^[0-9]$/.test(String(row[key])); })
      .map(function (key) { return { key: [eventId, key.slice(2), row[key]], column: 3 }; });
    if (AGE_VALUES.indexOf(String(row.age)) !== -1) answerCounts.push({ key: [eventId, 'age', row.age], column: 3 });
    if (row.condition === 'A' || row.condition === 'B') answerCounts.push({ key: [eventId, 'condition', row.condition], column: 3 });
    games.forEach(function (id) {
      answerCounts.push({ key: [eventId, 'game', id], column: 3 });
    });
    increment(getSheet(SHEET_ANSWER, ANSWER_HEADERS), 3, answerCounts);

    // ゲームごとの クリア・クリア秒数・とばした・時間切れ（v2.4.0）
    const tier = TIER_NAMES[Number(row.tier)];
    const gameCounts = [];
    (tier ? games : []).forEach(function (id) {
      const p = 'g_' + cleanKey(id) + '_';
      const key = [eventId, id, tier];
      gameCounts.push({ key: key, column: 3 });
      if (Number(row[p + 'cleared']) === 1) {
        gameCounts.push({ key: key, column: 4 });
        const sec = Number(row[p + 'clearSec']);
        if (row[p + 'clearSec'] !== '' && isFinite(sec)) gameCounts.push({ key: key, column: 5, add: sec });
      }
      if (Number(row[p + 'skipped']) === 1) gameCounts.push({ key: key, column: 7 });
      if (row[p + 'reason'] === 'timeup') gameCounts.push({ key: key, column: 8 });
    });
    increment(getSheet(SHEET_GAMES, GAME_HEADERS), 3, gameCounts, function (r) {
      // クリア秒数の合計は0.1秒で丸め、平均 = 合計 / クリアした回数
      r[5] = Math.round(Number(r[5]) * 10) / 10;
      r[6] = Number(r[4]) > 0 ? Math.round((Number(r[5]) / Number(r[4])) * 10) / 10 : '';
    });
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
  // 社長さん用では送らないが、届いても数えない
  if (data.mode === 'shacho') return { ok: true, ignored: true };
  const company = companyId(data.company);
  if (!company || !/^https?:\/\//.test(String(data.url || ''))) return { ok: false, error: 'bad click' };
  if (!/^[0-9A-Za-z_-]{1,30}$/.test(String(data.eventId || ''))) return { ok: false, error: 'bad eventId' };
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
  let missing = keys.filter(function (k) { return headers.indexOf(k) === -1; });
  // 列は MAX_COLUMNS まで。こえる新しい項目は保存しない（シートが こわれないように）
  if (headers.length + missing.length > MAX_COLUMNS) {
    const dropped = missing.slice(Math.max(0, MAX_COLUMNS - headers.length));
    missing = missing.slice(0, Math.max(0, MAX_COLUMNS - headers.length));
    notifyAdmin('シート「' + sheet.getName() + '」の列が上限に達しました',
      '保存しなかった項目: ' + dropped.slice(0, 50).join(', ') + '\n\nいたずらの送信かもしれません。シートを確認してください。');
  }
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
 *   entries   : [{ key: [...], column: 何列目（0始まり）を増やすか, add: 増やす数（なければ 1） }]
 *   after     : 増やした行ごとに呼ぶ関数（平均を計算しなおすときなど。なくてもよい）
 */
function increment(sheet, keyLength, entries, after) {
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
    values[r][en.column] = (Number(values[r][en.column]) || 0) + (en.add === undefined ? 1 : en.add);
    if (after) after(values[r]);
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
  getSheet(SHEET_GAMES, GAME_HEADERS);
  getSheet(SHEET_SHACHO);
}
