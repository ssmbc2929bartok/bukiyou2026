/*
 * 画面の流れ
 *   S-001 トップ → S-002 質問（年れい → 10問（あいだにミニゲーム）→ 気になる企業）→ S-003 回答確認
 *   → F-002 診断 → F-003 送信 → S-004 結果 → S-001 に戻る
 *   S-005 未記入ポップアップ / S-006 データ送信エラー
 * ミニゲームの数は条件 A/B でちがう（docs/games.md）。年れいを答えたときに、出すゲームを決める。
 */
(function (root) {
  'use strict';
  const BKF = root.BKF;
  const U = BKF.util;
  const D = BKF.diagnosis;
  const doc = root.document;
  const NUMBERS = ['①', '②', '③', '④', '⑤', '⑥'];
  const OTHER_TEXT = 'どれでもない';
  const OTHER_EMOJI = '🤔';
  const MIN_LOADING_MS = 1600;
  const DEBUG = new URLSearchParams(root.location.search).has('debug');

  const $ = function (id) { return doc.getElementById(id); };

  const questions = D.activeQuestions();
  const companies = D.activeCompanies();

  // 質問画面で順に出すもの。slots: [{ after: 何問目のあと, id: ゲーム }]
  function buildSteps(slots) {
    const list = [{ kind: 'age' }];
    questions.forEach(function (q, i) {
      list.push({ kind: 'question', question: q });
      slots.forEach(function (slot) {
        if (slot.after === i + 1) list.push({ kind: 'game', gameId: slot.id, result: null });
      });
    });
    list.push({ kind: 'interest' });
    return list;
  }

  let steps = buildSteps([]);
  let state;

  function resetState() {
    state = {
      sessionId: U.uuid(),
      startedAt: new Date(),
      stepIndex: 0,
      answers: {},
      age: null,
      interest: null,
      pending: null,
      returnToConfirm: false,
      condition: Math.random() < 0.5 ? 'A' : 'B',
      tier: null,
      games: [],      // 遊んだゲームの結果（遊んだ順）
      replaced: {},   // 傾きが使えず変えたゲーム { もとの id: 変えた先の id }
    };
    steps = buildSteps([]);
  }

  // 年れいから難易度を決め、出すゲームを選ぶ（まだゲームを遊んでいないときだけ）
  function planGames() {
    if (state.games.length > 0) return;
    state.tier = BKF.tierOf(state.age);
    const after = BKF.config.gameConditions[state.condition].after;
    const ids = BKF.games.choose(state.tier, after.length);
    steps = buildSteps(ids.map(function (id, i) { return { after: after[i], id: id }; }));
  }

  // ---------------------------------------------------------------- 画面切り替え

  function show(screenId) {
    doc.querySelectorAll('.screen').forEach(function (s) {
      s.hidden = s.id !== screenId;
    });
    const screen = $(screenId);
    doc.body.dataset.bg = screen.dataset.bg;
    root.scrollTo(0, 0);
    const heading = screen.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  function openModal(id) {
    $(id).hidden = false;
    const button = $(id).querySelector('button:not([hidden])');
    if (button) button.focus();
  }

  function closeModal(id) {
    $(id).hidden = true;
  }

  // ---------------------------------------------------------------- S-002 質問画面

  // 今のステップの見出しと選択肢
  function stepView(step) {
    if (step.kind === 'age') {
      const a = BKF.ageQuestion;
      return {
        text: a.text,
        hint: a.hint,
        progress: 'はじめに',
        layout: 'compact',
        saved: state.age,
        choices: a.options.map(function (o, i) {
          const last = i === a.options.length - 1;
          return {
            value: o.value,
            text: o.label,
            cls: last ? 'choice-other' : 'choice-' + ((i % 4) + 1),
            wide: last && a.options.length % 3 === 1,
          };
        }),
      };
    }

    if (step.kind === 'interest') {
      const iq = BKF.interestQuestion;
      return {
        text: iq.text,
        hint: iq.hint,
        progress: 'さいごの しつもん',
        layout: 'companies',
        saved: state.interest,
        choices: companies
          .map(function (c, i) {
            return { value: c.id, text: c.short, emoji: c.icon, cls: 'choice-' + ((i % 4) + 1) };
          })
          .concat([{
            value: 'none', text: iq.noneLabel, emoji: iq.noneEmoji, cls: 'choice-other',
            wide: companies.length % 2 === 0,
          }]),
      };
    }

    const q = step.question;
    const no = questions.indexOf(q) + 1;
    return {
      text: q.text,
      hint: q.hint || 'ひとつ えらんでね！',
      progress: no + ' / ' + questions.length,
      layout: '',
      saved: state.answers[q.id],
      choices: q.choices
        .map(function (c, j) {
          return { value: j + 1, text: c.text, emoji: c.emoji, number: NUMBERS[j], cls: 'choice-' + (j + 1) };
        })
        .concat([{
          value: 0, text: OTHER_TEXT, emoji: OTHER_EMOJI, number: '？', cls: 'choice-other',
          wide: q.choices.length % 2 === 0,
        }]),
    };
  }

  // ---------------------------------------------------------------- ミニゲーム

  // 質問のとちゅうでゲームに変わるとき、「ミニゲーム！」と大きく出してから説明画面へ。
  // 急にゲームの画面になると「なにこれ？」となりやすかったため。タップすれば すぐ進む。
  function announceGame(step, then) {
    const games = steps.filter(function (s) { return s.kind === 'game'; });
    const box = $('game-call');
    $('game-call-count').textContent = games.length > 1
      ? (games.indexOf(step) + 1) + 'こめ ／ ぜんぶで ' + games.length + 'こ'
      : '';
    box.hidden = false;
    box.classList.remove('play');
    void box.offsetWidth;
    box.classList.add('play');
    let done = false;
    function go() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      box.hidden = true;
      box.onclick = null;
      then();
    }
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(go, reduce ? 1200 : 2000);
    box.onclick = go;
  }

  function runGame(step) {
    show('screen-game');
    BKF.games.run(step.gameId, state.tier).then(function (res) {
      if (res.unavailable) {
        // 傾きが使えない端末・許可されなかったとき → お知らせを出してから、まだ出していないゲームに変える
        const planned = steps.filter(function (s) { return s.kind === 'game'; }).map(function (s) { return s.gameId; });
        const alt = BKF.games.choose(state.tier, 1, planned.concat(Object.keys(state.replaced)))[0];
        state.replaced[step.gameId] = alt || '';
        openModal('popup-game-change');
        $('game-change-ok').onclick = function () {
          closeModal('popup-game-change');
          if (alt) {
            step.gameId = alt;
            runGame(step);
            return;
          }
          done({ id: step.gameId, tier: state.tier, metrics: {}, skipped: true, reason: 'unavailable' });
        };
        return;
      }
      done(res);
    });

    function done(res) {
      step.result = res;
      state.games.push(res);
      state.stepIndex++;
      renderStep('next');
    }
  }

  function renderStep(direction) {
    const step = steps[state.stepIndex];
    if (step.kind === 'game') {
      // 遊んだゲームはもう一度は出さない（もどるときは飛ばす）
      if (step.result) {
        state.stepIndex += direction === 'back' ? -1 : 1;
        renderStep(direction);
      } else {
        announceGame(step, function () { runGame(step); });
      }
      return;
    }
    const view = stepView(step);
    state.pending = view.saved === undefined ? null : view.saved;

    $('q-text').innerHTML = U.rubyHtml(view.text);
    $('q-text').classList.toggle('long', U.plain(view.text).length > 22);
    $('q-hint').innerHTML = U.rubyHtml(view.hint);
    $('q-progress').textContent = view.progress;
    $('q-progress-bar').style.width = Math.round((state.stepIndex / steps.length) * 100) + '%';

    const back = $('q-back');
    const canGoBack = state.returnToConfirm || state.stepIndex > 0;
    back.setAttribute('aria-disabled', canGoBack ? 'false' : 'true');
    back.tabIndex = canGoBack ? 0 : -1;

    const box = $('q-choices');
    box.className = 'choices' + (view.layout ? ' ' + view.layout : '');
    box.innerHTML = '';
    view.choices.forEach(function (c) {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'choice ' + c.cls + (c.wide ? ' wide' : '');
      button.dataset.value = String(c.value);
      const selected = state.pending !== null && String(state.pending) === String(c.value);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.innerHTML =
        (c.number ? '<span class="number" aria-hidden="true">' + c.number + '</span>' : '') +
        (c.emoji && view.layout === 'companies' ? '<span class="picture" aria-hidden="true">' + c.emoji + '</span>' : '') +
        '<span class="text">' + U.rubyHtml(c.text) + '</span>' +
        (c.emoji && view.layout !== 'companies' ? '<span class="picture" aria-hidden="true">' + c.emoji + '</span>' : '');
      button.addEventListener('click', function () { select(button, c.value); });
      box.appendChild(button);
    });

    $('q-message').textContent = state.pending === null ? 'ひとつ えらぼう！' : 'これで いいかな？';

    const card = $('screen-question').querySelector('.survey');
    card.classList.remove('slide-in', 'slide-back');
    void card.offsetWidth; // アニメーションをやり直す
    card.classList.add(direction === 'back' ? 'slide-back' : 'slide-in');

    show('screen-question');
  }

  function select(button, value) {
    state.pending = value;
    $('q-choices').querySelectorAll('.choice').forEach(function (b) {
      b.classList.remove('selected');
      b.setAttribute('aria-pressed', 'false');
    });
    button.classList.add('selected');
    button.setAttribute('aria-pressed', 'true');
    $('q-message').textContent = 'これで いいかな？';
    // 「これに きめた！」が画面の外にあるときは見えるところまで動かす
    const rect = $('q-submit').getBoundingClientRect();
    if (rect.bottom > root.innerHeight) {
      $('q-submit').scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  function submitStep() {
    if (state.pending === null) {
      openModal('popup-unanswered'); // S-005
      return;
    }
    const step = steps[state.stepIndex];
    if (step.kind === 'age') {
      state.age = state.pending;
      planGames();
    } else if (step.kind === 'interest') state.interest = state.pending;
    else state.answers[step.question.id] = state.pending;

    if (state.returnToConfirm || state.stepIndex === steps.length - 1) {
      state.returnToConfirm = false;
      renderConfirm();
      return;
    }
    state.stepIndex++;
    renderStep('next');
  }

  function goBack() {
    if (state.returnToConfirm) {
      state.returnToConfirm = false;
      renderConfirm();
      return;
    }
    if (state.stepIndex === 0) return;
    state.stepIndex--;
    while (state.stepIndex > 0 && steps[state.stepIndex].kind === 'game') state.stepIndex--;
    renderStep('back');
  }

  // ---------------------------------------------------------------- S-003 回答確認画面

  function answerLabel(step) {
    const view = stepView(step);
    const choice = view.choices.filter(function (c) { return String(c.value) === String(view.saved); })[0];
    return choice || { text: '（まだ）', emoji: '' };
  }

  function renderConfirm() {
    const list = $('confirm-list');
    list.innerHTML = '';
    steps.forEach(function (step, i) {
      if (step.kind === 'game') return;
      const view = stepView(step);
      const choice = answerLabel(step);
      const li = doc.createElement('li');
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'confirm-item';
      const mark = step.kind === 'question' ? String(questions.indexOf(step.question) + 1) : step.kind === 'age' ? '🎂' : '🏭';
      button.innerHTML =
        '<span class="confirm-no" aria-hidden="true">' + mark + '</span>' +
        '<span><span class="confirm-q">' + U.rubyHtml(view.text) + '</span>' +
        '<span class="confirm-a">' + U.rubyHtml(choice.text.replace(/\n/g, ' ')) + '</span></span>' +
        '<span class="confirm-emoji" aria-hidden="true">' + (choice.emoji || '') + '</span>';
      button.addEventListener('click', function () {
        state.stepIndex = i;
        state.returnToConfirm = true;
        renderStep('next');
      });
      li.appendChild(button);
      list.appendChild(li);
    });
    $('confirm-submit').disabled = false;
    show('screen-confirm');
  }

  // ---------------------------------------------------------------- F-002 → F-003 → S-004

  function round(x, digits) {
    const k = Math.pow(10, digits);
    return Math.round(x * k) / k;
  }

  // R-001（スプレッドシート）の1行になるデータ
  function buildPayload(result) {
    const finishedAt = new Date();
    const ranking = result.companyRanking;
    const payload = {
      eventId: BKF.config.eventId,
      appVersion: BKF.config.appVersion,
      sessionId: state.sessionId,
      startedAt: state.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSec: Math.round((finishedAt - state.startedAt) / 1000),
      age: state.age,
      interest: state.interest,
      type: result.type.id,
      company: ranking[0].item.id,
      company2: ranking[1] ? ranking[1].item.id : '',
      company3: ranking[2] ? ranking[2].item.id : '',
      similarity: round(ranking[0].score, 4),
      fallback: result.fallback,
    };
    questions.forEach(function (q) {
      payload['a_' + q.id] = state.answers[q.id];
    });
    BKF.axes.forEach(function (axis, i) {
      payload['v_' + axis.id] = round(result.vector[i], 3);
    });
    ranking.forEach(function (r) {
      payload['s_' + r.item.id] = round(r.score, 4);
    });

    // ミニゲーム（g_<ゲームid>_<値>）
    payload.condition = state.condition;
    payload.tier = state.tier;
    payload.games = state.games.map(function (g) { return g.id; }).join(',');
    state.games.forEach(function (g) {
      const p = 'g_' + g.id + '_';
      Object.keys(g.metrics || {}).forEach(function (k) {
        const v = g.metrics[k];
        payload[p + k] = typeof v === 'number' ? round(v, 4) : v;
      });
      payload[p + 'skipped'] = g.skipped ? 1 : 0;
      payload[p + 'ms'] = g.ms;
      payload[p + 'first'] = g.firstTouchMs;
      payload[p + 'taps'] = g.taps;
      payload[p + 'reason'] = g.reason;
      if (g.rulesSkipped !== null && g.rulesSkipped !== undefined) payload[p + 'rulesSkipped'] = g.rulesSkipped;
    });
    Object.keys(state.replaced).forEach(function (id) {
      payload['g_' + id + '_replaced'] = state.replaced[id];
    });
    payload.screen = root.innerWidth + 'x' + root.innerHeight;
    return payload;
  }

  // 送信。失敗したら S-006 を出してもう一度だけ送り、それでもだめなら保存せずに結果へ進む
  function sendWithRetry(payload) {
    if (!BKF.api.enabled()) {
      if (DEBUG) console.info('[BKF] gasUrl が空なので送信しません', payload);
      return Promise.resolve(true);
    }
    return BKF.api.sendResult(payload)
      .then(function () {
        BKF.api.flushErrors();
        return true;
      })
      .catch(function (firstError) {
        $('send-error-title').textContent = 'データが おくれなかったよ';
        $('send-error-text').textContent = 'もういちど おくって いるよ…';
        $('send-error-spinner').hidden = false;
        $('send-error-ok').hidden = true;
        $('loading').hidden = true;
        openModal('popup-send-error');
        return U.wait(1200)
          .then(function () { return BKF.api.sendResult(payload); })
          .then(function () {
            closeModal('popup-send-error');
            BKF.api.flushErrors();
            return true;
          })
          .catch(function (secondError) {
            BKF.api.recordError({
              sessionId: payload.sessionId,
              first: String(firstError && firstError.message),
              second: String(secondError && secondError.message),
              online: root.navigator.onLine,
            });
            $('send-error-text').innerHTML = U.rubyHtml('でも だいじょうぶ！\nけっかは {見|み}られるよ');
            $('send-error-spinner').hidden = true;
            $('send-error-ok').hidden = false;
            $('send-error-ok').focus();
            return new Promise(function (resolve) {
              $('send-error-ok').onclick = function () {
                closeModal('popup-send-error');
                resolve(false);
              };
            });
          });
      });
  }

  function finish() {
    $('confirm-submit').disabled = true;
    $('loading').hidden = false;

    const result = D.diagnose(state.answers, state.games);
    const payload = buildPayload(result);
    Promise.all([sendWithRetry(payload), U.wait(MIN_LOADING_MS)]).then(function () {
      $('loading').hidden = true;
      renderResult(result, payload);
    });
  }

  function renderResult(result, payload) {
    const type = result.type;
    const company = result.company;

    $('result-type-emoji').textContent = type.emoji;
    $('result-title').innerHTML = U.rubyHtml(type.name);
    $('result-type-desc').innerHTML = U.rubyHtml(type.desc);

    const box = $('result-company');
    box.style.setProperty('--company-color', company.color || '#ffe066');
    $('result-company-icon').textContent = company.icon;
    $('result-company-name').textContent = company.short;
    $('result-company-desc').innerHTML = U.rubyHtml(company.desc);
    $('result-company-adult').textContent = company.name + '｜' + company.adult;

    // 「もっと見る」：公式サイト（なければトレーディングカードのページ）を新しいタブで開き、開いたことを記録する
    const link = $('result-link');
    link.href = company.url || BKF.tradingCardUrl;
    link.onclick = function () {
      BKF.api.sendClick({ sessionId: payload.sessionId, company: company.id, url: link.href });
    };

    const reasons = $('result-reasons');
    reasons.innerHTML = '';
    result.reasons.forEach(function (r) {
      const li = doc.createElement('li');
      li.innerHTML = '<span class="reason-icon" aria-hidden="true">' + r.axis.icon + '</span>' + U.escapeHtml(r.axis.label);
      li.title = r.axis.adult;
      reasons.appendChild(li);
    });
    reasons.parentElement.hidden = result.reasons.length === 0;

    const more = $('result-more');
    more.innerHTML = '';
    result.companyRanking.slice(1, 3).forEach(function (r) {
      const li = doc.createElement('li');
      li.innerHTML = '<span class="more-icon" aria-hidden="true">' + r.item.icon + '</span>' + U.escapeHtml(r.item.short);
      more.appendChild(li);
    });
    more.parentElement.hidden = more.children.length === 0;

    const debug = $('debug');
    debug.hidden = !DEBUG;
    if (DEBUG) {
      debug.textContent =
        'u = [' + result.vector.map(function (x) { return x.toFixed(2); }).join(', ') + ']\n' +
        'ゲーム = [' + D.gameVector(state.games).map(function (x) { return x.toFixed(2); }).join(', ') + ']\n' +
        '条件 ' + state.condition + ' / 難易度 ' + state.tier + ' / ' + (payload.games || '-') + '\n' +
        'fallback = ' + (result.fallback || '-') + '\n\n企業\n' +
        result.companyRanking.map(function (r) { return r.score.toFixed(3) + '  ' + r.item.short; }).join('\n') +
        '\n\nタイプ\n' +
        result.typeRanking.map(function (r) { return r.score.toFixed(3) + '  ' + U.plain(r.item.name); }).join('\n') +
        '\n\n送信データ\n' + JSON.stringify(payload, null, 1);
    }

    show('screen-result');
    confetti();
  }

  function confetti() {
    const box = $('confetti');
    const colors = ['#ff8a80', '#ffe066', '#70e4d2', '#4ea8de', '#9d4edd', '#f4a261'];
    box.innerHTML = '';
    for (let i = 0; i < 70; i++) {
      const piece = doc.createElement('span');
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = 2.4 + Math.random() * 2 + 's';
      piece.style.animationDelay = Math.random() * 0.8 + 's';
      piece.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      piece.style.setProperty('--spin', (Math.random() * 1080 - 540) + 'deg');
      box.appendChild(piece);
    }
    setTimeout(function () { box.innerHTML = ''; }, 5500);
  }

  // ---------------------------------------------------------------- 起動

  function start() {
    resetState();
    renderStep('next');
  }

  function goTop() {
    resetState();
    show('screen-top');
  }

  $('top-note').innerHTML = 'しつもんと ミニゲームに こたえてね<br>（やく 3〜5ふん）';
  doc.querySelectorAll('[data-version]').forEach(function (el) { el.textContent = 'v' + BKF.config.appVersion; });
  $('start-button').addEventListener('click', start);
  $('q-submit').addEventListener('click', submitStep);
  $('q-back').addEventListener('click', function () {
    if ($('q-back').getAttribute('aria-disabled') !== 'true') goBack();
  });
  $('confirm-submit').addEventListener('click', finish);
  $('unanswered-ok').addEventListener('click', function () {
    closeModal('popup-unanswered');
    $('q-submit').focus();
  });
  $('again-button').addEventListener('click', goTop);
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('popup-unanswered').hidden) closeModal('popup-unanswered');
  });

  resetState();
  BKF.api.flushErrors();
  if (DEBUG) root.BKF.state = function () { return state; };

  // 確認用：?debug&games でミニゲームの一覧を出し、えらんだゲームだけを遊ぶ（データは送らない）。
  // ?debug&play=ゲームid&tier=0〜2 で、そのゲームをすぐに始める。
  const params = new URLSearchParams(root.location.search);

  function debugLink(text, query, cls) {
    const a = doc.createElement('a');
    a.className = cls || 'debug-link';
    a.href = '?debug' + query;
    a.textContent = text;
    return a;
  }

  if (DEBUG && params.get('play')) {
    const id = params.get('play');
    const tier = Number(params.get('tier') || 1);
    show('screen-game');
    BKF.games.run(id, tier).then(function (res) {
      const vec = BKF.gameScore(id, tier, res.metrics);
      const box = doc.createElement('pre');
      box.className = 'debug';
      box.textContent = JSON.stringify(res, null, 1) + '\n\n軸への点数\n' +
        BKF.axes.map(function (a, i) { return a.label + ' ' + vec[i].toFixed(2); }).filter(function (s, i) { return vec[i] !== 0; }).join('\n');
      const nav = doc.createElement('div');
      nav.className = 'debug-nav';
      const again = debugLink('もういちど', '');
      again.href = root.location.search;   // 同じゲーム・難易度でもういちど
      nav.appendChild(again);
      nav.appendChild(debugLink('ゲームを えらびなおす', '&games'));
      $('game-done').appendChild(nav);
      $('game-done').appendChild(box);
      $('game-done').hidden = false;
      root.BKF.lastGame = res;
    });
  } else if (DEBUG && params.has('games')) {
    const list = $('debug-game-list');
    const disabled = BKF.config.disabledGames || [];
    list.innerHTML = '';
    Object.keys(BKF.gameDefs).forEach(function (id) {
      const def = BKF.gameDefs[id];
      const li = doc.createElement('li');
      const off = !def.enabled ? '（enabled: false）' : disabled.indexOf(id) !== -1 ? '（disabledGames で停止中）' : '';
      li.innerHTML = '<span class="debug-game-name">' + def.icon + ' ' + U.escapeHtml(def.title) +
        ' <small>' + id + U.escapeHtml(off) + '</small></span>';
      const tiers = doc.createElement('span');
      tiers.className = 'debug-game-tiers';
      BKF.tiers.forEach(function (t) {
        const a = debugLink('', '&games&play=' + id + '&tier=' + t.id, 'debug-tier');
        a.innerHTML = t.label + '<br><small>' + (def.time ? def.time[t.id] + 'びょう' : 'じかん なし') + '</small>';
        if (t.id < def.minTier) {
          a.removeAttribute('href');
          a.classList.add('off');
          a.title = 'この難易度では出ない';
        }
        tiers.appendChild(a);
      });
      li.appendChild(tiers);
      list.appendChild(li);
    });
    show('screen-debug-games');
  }
  // トップ画面からも一覧へ行けるようにする
  if (DEBUG) $('top-debug').hidden = false;
})(window);
