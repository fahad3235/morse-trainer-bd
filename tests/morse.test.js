// Node unit tests for morse-trainer-bd pure logic. Run: node tests/morse.test.js
const assert = require('assert');
const M = require('../js/morse.js');

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok - ' + name); }

check('encode SOS', () => assert.strictEqual(M.encode('SOS'), '... --- ...'));
check('encode with word break', () => assert.strictEqual(M.encode('HI THERE'), '.... .. / - .... . .-. .'));
check('encode lowercase + unknown char', () => assert.strictEqual(M.encode('a#b'), '.- ? -...'));
check('encode empty', () => assert.strictEqual(M.encode(''), ''));
check('decode SOS', () => assert.strictEqual(M.decode('... --- ...'), 'SOS'));
check('decode word break + unknown', () => assert.strictEqual(M.decode('.... .. / ----- ?'), 'HI 0?'));
check('decode word break exact', () => assert.strictEqual(M.decode('.... .. / - .... .'), 'HI THE'));
check('decode unknown token', () => assert.strictEqual(M.decode('........'), '?'));
check('round-trip digits/punct', () => {
  const s = 'CALL 911 NOW!';
  assert.strictEqual(M.decode(M.encode(s)), s);
});
check('unitMs 20 WPM = 60ms', () => assert.strictEqual(M.unitMs(20), 60));
check('unitMs clamps low', () => assert.strictEqual(M.unitMs(1), 240));
check('unitMs clamps high', () => assert.strictEqual(M.unitMs(99), 30));
check('schedule E = single dot, no trailing silence', () => {
  assert.deepStrictEqual(M.schedule('.'), [{ tone: true, units: 1 }]);
});
check('schedule SOS units', () => {
  const ev = M.schedule('... --- ...');
  const tones = ev.filter(e => e.tone);
  assert.strictEqual(tones.length, 9);
  assert.deepStrictEqual(tones.map(t => t.units), [1, 1, 1, 3, 3, 3, 1, 1, 1]);
  // trailing silence popped, so last event is a tone; inter-letter gap = 3
  assert.strictEqual(ev[ev.length - 1].tone, true);
  assert.ok(ev.filter(e => !e.tone).some(s => s.units === 3));
});
check('schedule word gap = 7', () => {
  const ev = M.schedule('. / .');
  const silences = ev.filter(e => !e.tone);
  assert.ok(silences.some(s => s.units === 7));
});
check('classifyPress dot/dash boundary', () => {
  assert.strictEqual(M.classifyPress(100, 250), '.');
  assert.strictEqual(M.classifyPress(249, 250), '.');
  assert.strictEqual(M.classifyPress(250, 250), '-');
  assert.strictEqual(M.classifyPress(900, 250), '-');
  assert.strictEqual(M.classifyPress(-5, 250), null);
  assert.strictEqual(M.classifyPress(NaN, 250), null);
});
check('quizRound: target in options, 4 unique options', () => {
  for (let i = 0; i < 50; i++) {
    const r = M.quizRound();
    assert.strictEqual(r.options.length, 4);
    assert.strictEqual(new Set(r.options).size, 4);
    assert.ok(r.options.includes(r.target));
    assert.strictEqual(r.code, M.MORSE[r.target]);
  }
});
check('quizRound deterministic with seeded random', () => {
  let calls = 0;
  const rnd = () => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7][calls++ % 7];
  const a = M.quizRound(['A', 'B', 'C', 'D'], rnd);
  calls = 0;
  const b = M.quizRound(['A', 'B', 'C', 'D'], rnd);
  assert.deepStrictEqual(a, b);
});

console.log(passed + ' tests passed');
