// Morse Trainer BD — pure logic (no DOM). Shared by the app and the node tests.
(function (root) {
  'use strict';

  var MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
    G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
    M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
    '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
    '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
    '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
    '$': '...-..-', '@': '.--.-.'
  };

  var REVERSE = {};
  Object.keys(MORSE).forEach(function (ch) { REVERSE[MORSE[ch]] = ch; });

  // Text -> Morse. Unknown characters become the placeholder.
  // Letters separated by a space, words by " / ".
  function encode(text) {
    if (typeof text !== 'string') return '';
    var words = text.toUpperCase().trim().split(/\s+/).filter(Boolean);
    return words.map(function (word) {
      return word.split('').map(function (ch) {
        return MORSE[ch] || '?';
      }).join(' ');
    }).join(' / ');
  }

  // Morse -> text. Tokens split on whitespace; "/" is a word break.
  // Unknown tokens become "?".
  function decode(code) {
    if (typeof code !== 'string') return '';
    var out = '';
    code.trim().split(/\s+/).filter(Boolean).forEach(function (tok) {
      if (tok === '/') out += ' ';
      else out += REVERSE[tok] || '?';
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  // Standard PARIS timing: one unit (ms) = 1200 / WPM.
  function unitMs(wpm) {
    var w = Number(wpm);
    if (!isFinite(w) || w < 5) w = 5;
    if (w > 40) w = 40;
    return 1200 / w;
  }

  // Build a beep schedule for a Morse string: [{tone: true|false, units: n}].
  // dot = 1 tone unit, dash = 3, intra-character gap = 1 silence,
  // inter-character gap = 3 silence, word gap = 7 silence.
  function schedule(code) {
    var events = [];
    if (typeof code !== 'string') return events;
    var tokens = code.trim().split(/\s+/).filter(Boolean);
    tokens.forEach(function (tok, ti) {
      if (tok === '/') {
        if (events.length) events[events.length - 1].units = 7;
        return;
      }
      tok.split('').forEach(function (sym, si) {
        if (sym !== '.' && sym !== '-') return;
        events.push({ tone: true, units: sym === '.' ? 1 : 3 });
        events.push({ tone: false, units: 1 });
      });
      if (events.length) events[events.length - 1].units = 3;
    });
    if (events.length) events.pop(); // trailing silence not needed
    return events;
  }

  // Tap-key classification: a press shorter than threshold is a dot.
  function classifyPress(durationMs, thresholdMs) {
    var t = thresholdMs == null ? 250 : thresholdMs;
    if (typeof durationMs !== 'number' || !isFinite(durationMs) || durationMs < 0) return null;
    return durationMs < t ? '.' : '-';
  }

  // Quiz helpers: pick a target letter and 3 distinct distractors.
  function quizRound(letters, randomFn) {
    var rnd = randomFn || Math.random;
    var pool = (letters && letters.length) ? letters.slice() : Object.keys(MORSE).filter(function (c) { return /[A-Z0-9]/.test(c); });
    var target = pool[Math.floor(rnd() * pool.length)];
    var distractors = [];
    var rest = pool.filter(function (c) { return c !== target; });
    while (distractors.length < 3 && rest.length) {
      var i = Math.floor(rnd() * rest.length);
      distractors.push(rest.splice(i, 1)[0]);
    }
    var options = distractors.concat([target]);
    // Fisher-Yates shuffle
    for (var j = options.length - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var tmp = options[j]; options[j] = options[k]; options[k] = tmp;
    }
    return { target: target, code: MORSE[target], options: options };
  }

  var api = {
    MORSE: MORSE, encode: encode, decode: decode,
    unitMs: unitMs, schedule: schedule,
    classifyPress: classifyPress, quizRound: quizRound
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MorseTrainer = api;
})(typeof window !== 'undefined' ? window : globalThis);
