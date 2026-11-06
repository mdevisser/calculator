// News cards (spec §8). news/cards.json is the source of record; web/news.js is
// generated from it so the home page can load it from file:// without fetch.
// The weekly routine writes cards from the open web, so validation is strict:
// a typo, a non-https link or an invented label stops the run instead of
// reaching the page.

export const CLAIM_TYPES = ['proof', 'counterexample', 'construction', 'other'];

const DOC_KEYS = ['checkedThrough', 'cards'];
const CARD_KEYS = ['id', 'announced', 'title', 'claimants', 'aiSystem', 'claimType', 'label', 'summary', 'sources'];
const ID = /^\d{4}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim() !== '';

export function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isHttps(url) {
  if (typeof url !== 'string') return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function validateCard(card, i, labelKeys) {
  const errors = [];
  if (!isObject(card)) return [`card ${i}: not an object`];
  const who = `card ${typeof card.id === 'string' ? card.id : i}`;
  const err = (m) => errors.push(`${who}: ${m}`);

  for (const k of Object.keys(card)) if (!CARD_KEYS.includes(k)) err(`unknown key "${k}"`);
  for (const k of CARD_KEYS) if (!(k in card)) err(`missing ${k}`);

  if (!ID.test(card.id ?? '')) err('id must look like yyyy-mm-short-topic (lowercase, hyphens)');
  if (!isDate(card.announced)) err('announced must be a real date, YYYY-MM-DD');
  else if (ID.test(card.id) && card.id.slice(0, 7) !== card.announced.slice(0, 7)) {
    err(`id month ${card.id.slice(0, 7)} differs from the announced month ${card.announced.slice(0, 7)}`);
  }
  if (!isText(card.title)) err('title is empty');
  if (!Array.isArray(card.claimants) || card.claimants.length === 0 || !card.claimants.every(isText)) {
    err('claimants must list at least one name');
  }
  if ('aiSystem' in card && card.aiSystem !== null && !isText(card.aiSystem)) err('aiSystem must be a name or null');
  if (!CLAIM_TYPES.includes(card.claimType)) err(`claimType must be one of ${CLAIM_TYPES.join(', ')}`);
  if (!labelKeys.includes(card.label)) err(`label must be one of ${labelKeys.join(', ')}`);
  if (!isText(card.summary)) err('summary is empty');
  if (!Array.isArray(card.sources) || card.sources.length === 0) {
    err('needs at least one source');
  } else {
    card.sources.forEach((s, j) => {
      if (!isObject(s) || !isText(s.title)) err(`source ${j + 1} needs a title`);
      if (!isObject(s) || !isHttps(s.url)) err(`source ${j + 1} url must be https`);
    });
  }
  return errors;
}

// Returns every problem found, each naming the card and the rule; [] when valid.
export function validateNews(doc, labelKeys) {
  if (!isObject(doc)) return ['the document must be an object with checkedThrough and cards'];
  const errors = [];
  for (const k of Object.keys(doc)) if (!DOC_KEYS.includes(k)) errors.push(`document: unknown key "${k}"`);
  if (!isDate(doc.checkedThrough)) errors.push('checkedThrough must be a real date, YYYY-MM-DD');
  if (!Array.isArray(doc.cards)) {
    errors.push('cards must be a list');
    return errors;
  }
  const seen = new Set();
  doc.cards.forEach((card, i) => {
    errors.push(...validateCard(card, i, labelKeys));
    if (isObject(card) && typeof card.id === 'string') {
      if (seen.has(card.id)) errors.push(`card ${card.id}: duplicate id`);
      seen.add(card.id);
    }
  });
  return errors;
}

export function newsToJs(doc) {
  return `globalThis.NEWS = ${JSON.stringify(doc, null, 2)};\n`;
}
