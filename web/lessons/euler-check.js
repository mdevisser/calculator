// Exact check behind the Euler lesson's calculator: is t1^k + ... + tn^k = rhs^k?
// BigInt only. A Number path would round anything past ~15 digits, which is the
// very trap this lesson teaches. Bad input returns a plain-words message and
// never a verdict, so a typo can't show up as ✅ or ❌.

(function () {
  const WHOLE = /^(0|[1-9][0-9]*)$/;
  const MAX_DIGITS = 40;
  const MAX_TERMS = 10;

  function parseWhole(text, name, example) {
    const t = String(text ?? '').trim();
    if (t === '') return { message: `${name} is empty. Type a whole number, like ${example}.` };
    if (!WHOLE.test(t)) {
      return { message: `${name} needs to be a whole number with no decimal point, minus sign or leading zero, like ${example}.` };
    }
    if (t.length > MAX_DIGITS) return { message: `${name} is longer than ${MAX_DIGITS} digits. Keep it shorter.` };
    return { value: BigInt(t) };
  }

  globalThis.checkPowerSum = function checkPowerSum(kText, termTexts, rhsText) {
    const k = parseWhole(kText, 'The power', 5);
    if (k.message) return { ok: false, message: k.message };
    if (k.value < 2n || k.value > 20n) {
      return { ok: false, message: 'The power needs to be between 2 and 20.' };
    }

    if (!Array.isArray(termTexts) || termTexts.length < 1 || termTexts.length > MAX_TERMS) {
      return { ok: false, message: `Give between 1 and ${MAX_TERMS} numbers to add up.` };
    }
    const terms = [];
    for (let i = 0; i < termTexts.length; i++) {
      const t = parseWhole(termTexts[i], `Number ${i + 1}`, 84);
      if (t.message) return { ok: false, message: t.message };
      terms.push(t.value);
    }

    const rhs = parseWhole(rhsText, 'The right-hand number', 144);
    if (rhs.message) return { ok: false, message: rhs.message };

    const lhs = terms.reduce((sum, t) => sum + t ** k.value, 0n);
    const right = rhs.value ** k.value;
    return { ok: true, lhs, rhs: right, equal: lhs === right };
  };
})();
