// Exact check behind the Euler lesson's calculator: is t1^k + ... + tn^k = rhs^k,
// and if so, does that actually break Euler's guess?
// BigInt only. A Number path would round anything past ~15 digits, which is the
// very trap this lesson teaches. Bad input returns a plain-words message and
// never a verdict, so a typo can't show up as ✅ or ❌.

(function () {
  const WHOLE = /^(0|[1-9][0-9]*)$/;
  const GROUPED = /^[1-9][0-9]{0,2}(,[0-9]{3})+$/; // 95,800 — commas only as digit grouping
  const MAX_DIGITS = 40;
  const MAX_TERMS = 10;

  // "27 + 84 + 110" → ['27', '84', '110']. Digit-grouping commas are removed; any
  // other comma is left in place, so the parser can say "put + between numbers".
  globalThis.splitTerms = function splitTerms(text) {
    const parts = String(text ?? '').split('+').map((p) => p.trim());
    if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
    return parts.map((p) => (GROUPED.test(p) ? p.replace(/,/g, '') : p));
  };

  function parseWhole(text, name, example) {
    const t = String(text ?? '').trim();
    if (t === '') return { message: `${name} is empty. Type a whole number, like ${example}.` };
    if (t.includes(',')) {
      return { message: `${name} has a comma in it. Put + between numbers, like 27 + 84 (commas are only for grouping digits, like 95,800).` };
    }
    if (!WHOLE.test(t)) {
      return { message: `${name} needs to be a whole number with no decimal point, minus sign or leading zero, like ${example}.` };
    }
    if (t.length > MAX_DIGITS) return { message: `${name} is longer than ${MAX_DIGITS} digits. Keep it shorter.` };
    return { value: BigInt(t) };
  }

  // Euler's guess (1769): for k >= 3, a k-th power is never a sum of fewer than k
  // positive k-th powers (with at least two of them). The same conditions as
  // src/problems/euler. Equality alone is not a counterexample.
  function judge(k, terms, equal) {
    const n = terms.length;
    const numbers = n === 1 ? '1 number' : `${n} numbers`;
    if (!equal) return { breaksEuler: false, why: 'They don\x27t match, so there\x27s nothing to break.' };
    if (terms.some((t) => t === 0n)) {
      return { breaksEuler: false, why: 'They match, but zero doesn\x27t count: Euler\x27s guess is about positive whole numbers.' };
    }
    if (n === 1) {
      return { breaksEuler: false, why: 'They match, but only because a number always equals itself. That isn\x27t adding powers together.' };
    }
    if (k < 3n) {
      return { breaksEuler: false, why: 'They match, but Euler\x27s guess starts at cubes (power 3). For squares, two is enough: 3² + 4² = 5².' };
    }
    if (BigInt(n) >= k) {
      return { breaksEuler: false, why: `They match, but that\x27s ${numbers} for power ${k}. Euler allowed that, so it doesn\x27t break his guess.` };
    }
    return { breaksEuler: true, why: `Only ${numbers} for power ${k}, so this breaks Euler\x27s guess.` };
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
    const equal = lhs === right;
    return { ok: true, lhs, rhs: right, equal, ...judge(k.value, terms, equal) };
  };
})();
