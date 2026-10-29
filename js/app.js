// Morse Trainer BD — UI, audio playback, tap key, quiz, i18n.
(function () {
  'use strict';
  var M = window.MorseTrainer;

  var I18N = {
    en: {
      tagline: 'Learn Morse code by ear — listen, tap, and quiz yourself.',
      translator: 'Translator', listen: 'Listen & Play', tapkey: 'Tap Key',
      quiz: 'Listen Quiz', chart: 'Learn the Code',
      textLabel: 'Text', morseLabel: 'Morse code',
      toMorse: 'Text → Morse', toText: 'Morse → Text',
      copy: 'Copy', copied: 'Copied!',
      playText: 'Play this text', stop: 'Stop', wpm: 'Speed (WPM)',
      playing: 'Playing…', tapHint: 'Hold the key: quick tap = dot (•), long hold = dash (−). Pause to finish a letter.',
      tapKeyLabel: 'TAP KEY (or hold Space)', currentCode: 'Current code',
      decoded: 'Decoded so far', clearTap: 'Clear',
      quizHint: 'Press Listen, then pick the letter you heard.',
      listenBtn: 'Listen', score: 'Score', streak: 'Streak', best: 'Best',
      correct: 'Correct!', wrong: 'Not quite — that was',
      newRound: 'Next letter', quizNote: 'Letters A–Z and digits 0–9 only.',
      playChar: 'Play', footer: '100% offline — all sound is generated on your device. Morse timing follows the standard PARIS convention. A learning tool, not a radio-licence trainer.',
      empty: 'Type something first.', invalidMorse: 'Use only dots (.), dashes (−), spaces and / for word breaks.',
      langBtn: 'বাংলা'
    },
    bn: {
      tagline: 'কানে শুনে মর্স কোড শিখুন — শুনুন, ট্যাপ করুন, কুইজ খেলুন।',
      translator: 'অনুবাদক', listen: 'শুনুন ও বাজান', tapkey: 'ট্যাপ কী',
      quiz: 'শোনার কুইজ', chart: 'কোড শিখুন',
      textLabel: 'লেখা', morseLabel: 'মর্স কোড',
      toMorse: 'লেখা → মর্স', toText: 'মর্স → লেখা',
      copy: 'কপি', copied: 'কপি হয়েছে!',
      playText: 'এই লেখাটি বাজান', stop: 'থামান', wpm: 'গতি (WPM)',
      playing: 'বাজছে…', tapHint: 'কী চেপে ধরুন: দ্রুত ট্যাপ = ডট (•), লম্বা চাপ = ড্যাশ (−)। অক্ষর শেষ করতে একটু থামুন।',
      tapKeyLabel: 'ট্যাপ কী (অথবা Space চেপে ধরুন)', currentCode: 'বর্তমান কোড',
      decoded: 'এ পর্যন্ত ডিকোড', clearTap: 'মুছুন',
      quizHint: 'Listen চাপুন, তারপর যা শুনলেন সেই অক্ষরটি বাছুন।',
      listenBtn: 'শুনুন', score: 'স্কোর', streak: 'ধারাবাহিক', best: 'সেরা',
      correct: 'সঠিক!', wrong: 'হয়নি — এটি ছিল',
      newRound: 'পরের অক্ষর', quizNote: 'শুধু A–Z অক্ষর এবং 0–9 সংখ্যা।',
      playChar: 'বাজান', footer: '১০০% অফলাইন — সব শব্দ আপনার ডিভাইসেই তৈরি হয়। মর্স টাইমিং PARIS মান অনুসরণ করে। এটি একটি শেখার টুল, রেডিও লাইসেন্স প্রশিক্ষক নয়।',
      empty: 'আগে কিছু লিখুন।', invalidMorse: 'শুধু ডট (.), ড্যাশ (−), স্পেস এবং শব্দের ফাঁকের জন্য / ব্যবহার করুন।',
      langBtn: 'English'
    }
  };

  var BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[d]; });
  }

  var lang = localStorage.getItem('mt-lang') || 'en';
  var wpm = parseInt(localStorage.getItem('mt-wpm') || '18', 10) || 18;
  var best = parseInt(localStorage.getItem('mt-best') || '0', 10) || 0;
  var score = 0, streak = 0, round = null;

  function t(key) { return I18N[lang][key]; }
  function fmt(s) { return lang === 'bn' ? toBnDigits(s) : String(s); }

  function $(id) { return document.getElementById(id); }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    $('langBtn').textContent = t('langBtn');
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    renderChart();
    renderQuizMeta();
  }

  // ---------- Audio ----------
  var audioCtx = null, playing = false, stopRequested = false;
  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function beep(ac, start, dur) {
    var osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = 'sine'; osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain); gain.connect(ac.destination);
    osc.start(start); osc.stop(start + dur + 0.02);
  }
  function playCode(code, onDone) {
    var ac = ctx();
    var unit = M.unitMs(wpm) / 1000;
    var events = M.schedule(code);
    var now = ac.currentTime + 0.05, cursor = now;
    stopRequested = false; playing = true;
    events.forEach(function (ev) {
      if (ev.tone) beep(ac, cursor, ev.units * unit);
      cursor += ev.units * unit;
    });
    var totalMs = (cursor - now) * 1000;
    setTimeout(function () { playing = false; if (onDone) onDone(); }, totalMs + 50);
  }
  function stopPlayback() { stopRequested = true; playing = false; if (audioCtx) audioCtx.close().then(function () { audioCtx = null; }); }

  // ---------- Translator ----------
  var mode = 'encode';
  function translate() {
    var input = $('transInput').value;
    if (!input.trim()) { $('transOutput').value = ''; $('transNote').textContent = ''; return; }
    if (mode === 'encode') {
      $('transOutput').value = M.encode(input);
      $('transNote').textContent = '';
    } else {
      var bad = /[^.\- /]/.test(input);
      $('transNote').textContent = bad ? t('invalidMorse') : '';
      $('transOutput').value = bad ? '' : M.decode(input);
    }
  }

  // ---------- Tap key ----------
  var tapCode = '', tapDecoded = '', tapTimer = null, pressStart = 0, spaceDown = false;
  function renderTap() {
    $('tapCode').textContent = tapCode || '–';
    $('tapDecoded').textContent = tapDecoded || '–';
  }
  function tapDown() {
    if (pressStart) return;
    pressStart = performance.now();
    $('tapKey').classList.add('active');
  }
  function tapUp() {
    if (!pressStart) return;
    var sym = M.classifyPress(performance.now() - pressStart, 250);
    pressStart = 0;
    $('tapKey').classList.remove('active');
    if (sym) tapCode += sym;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () {
      if (!tapCode) return;
      var ch = M.decode(tapCode);
      tapDecoded += ch;
      tapCode = '';
      renderTap();
    }, 700);
    renderTap();
  }

  // ---------- Quiz ----------
  function renderQuizMeta() {
    $('quizScore').textContent = fmt(score);
    $('quizStreak').textContent = fmt(streak);
    $('quizBest').textContent = fmt(best);
  }
  function newRound() {
    round = M.quizRound();
    $('quizFeedback').textContent = '';
    $('quizFeedback').className = 'feedback';
    var box = $('quizOptions'); box.innerHTML = '';
    round.options.forEach(function (opt) {
      var b = document.createElement('button');
      b.className = 'opt'; b.textContent = opt;
      b.onclick = function () {
        if (opt === round.target) {
          score += 10; streak += 1;
          if (score > best) { best = score; localStorage.setItem('mt-best', String(best)); }
          $('quizFeedback').textContent = t('correct');
          $('quizFeedback').className = 'feedback ok';
        } else {
          streak = 0;
          $('quizFeedback').textContent = t('wrong') + ' ' + round.target + ' (' + round.code + ')';
          $('quizFeedback').className = 'feedback bad';
        }
        renderQuizMeta();
        box.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      };
      box.appendChild(b);
    });
    renderQuizMeta();
  }

  // ---------- Chart ----------
  function renderChart() {
    var grid = $('chartGrid'); grid.innerHTML = '';
    Object.keys(M.MORSE).forEach(function (ch) {
      var card = document.createElement('div');
      card.className = 'char-card';
      var letter = document.createElement('div'); letter.className = 'char-letter'; letter.textContent = ch;
      var code = document.createElement('div'); code.className = 'char-code'; code.textContent = M.MORSE[ch];
      var btn = document.createElement('button'); btn.className = 'mini'; btn.textContent = t('playChar');
      btn.onclick = function () { playCode(M.MORSE[ch]); };
      card.appendChild(letter); card.appendChild(code); card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  // ---------- Wire-up ----------
  document.addEventListener('DOMContentLoaded', function () {
    $('wpmRange').value = wpm;
    $('wpmVal').textContent = fmt(wpm);

    $('langBtn').onclick = function () {
      lang = lang === 'en' ? 'bn' : 'en';
      localStorage.setItem('mt-lang', lang);
      applyLang();
    };
    $('modeEncode').onclick = function () { mode = 'encode'; $('modeEncode').classList.add('active'); $('modeDecode').classList.remove('active'); translate(); };
    $('modeDecode').onclick = function () { mode = 'decode'; $('modeDecode').classList.add('active'); $('modeEncode').classList.remove('active'); translate(); };
    $('transInput').addEventListener('input', translate);
    $('copyBtn').onclick = function () {
      var v = $('transOutput').value; if (!v) return;
      navigator.clipboard.writeText(v).then(function () {
        $('copyBtn').textContent = t('copied');
        setTimeout(function () { $('copyBtn').textContent = t('copy'); }, 1500);
      });
    };
    $('wpmRange').addEventListener('input', function (e) {
      wpm = parseInt(e.target.value, 10);
      localStorage.setItem('mt-wpm', String(wpm));
      $('wpmVal').textContent = fmt(wpm);
    });
    $('playBtn').onclick = function () {
      var text = $('playInput').value.trim();
      if (!text) { $('playStatus').textContent = t('empty'); return; }
      if (playing) { stopPlayback(); $('playStatus').textContent = ''; $('playBtn').textContent = t('playText'); return; }
      $('playStatus').textContent = t('playing');
      $('playBtn').textContent = t('stop');
      playCode(M.encode(text), function () {
        $('playStatus').textContent = ''; $('playBtn').textContent = t('playText');
      });
    };
    var key = $('tapKey');
    key.addEventListener('mousedown', tapDown);
    key.addEventListener('mouseup', tapUp);
    key.addEventListener('mouseleave', function () { if (pressStart) tapUp(); });
    key.addEventListener('touchstart', function (e) { e.preventDefault(); tapDown(); }, { passive: false });
    key.addEventListener('touchend', function (e) { e.preventDefault(); tapUp(); });
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && document.activeElement !== $('transInput') && document.activeElement !== $('playInput') && !spaceDown) {
        e.preventDefault(); spaceDown = true; tapDown();
      }
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space' && spaceDown) { spaceDown = false; tapUp(); }
    });
    $('clearTap').onclick = function () { tapCode = ''; tapDecoded = ''; clearTimeout(tapTimer); renderTap(); };
    $('quizListen').onclick = function () { if (round) playCode(round.code); };
    $('quizNext').onclick = newRound;

    applyLang();
    renderTap();
    newRound();
  });
})();
