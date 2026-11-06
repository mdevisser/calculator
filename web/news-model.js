// Turns globalThis.NEWS (generated from news/cards.json by bin/news.js) into what
// the home page renders. Pure: no DOM, no storage, so Node tests call it directly.
// Returns null when the news file didn't load, so the page can say so.

(function () {
  const CLAIM_TYPE_TEXT = {
    proof: 'Proof',
    counterexample: 'Counterexample',
    construction: 'Construction',
    other: 'Other',
  };

  globalThis.newsModel = function newsModel(news, seenIds, labels) {
    if (!news || typeof news !== 'object' || !Array.isArray(news.cards)) return null;
    const seen = new Set(Array.isArray(seenIds) ? seenIds : []);
    return news.cards
      .slice()
      .sort((a, b) => (a.announced === b.announced
        ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        : (a.announced < b.announced ? 1 : -1)))
      .map((c) => ({
        id: c.id,
        announced: c.announced,
        title: c.title,
        byline: c.claimants.join(', ') + (c.aiSystem ? ` with ${c.aiSystem}` : ''),
        claimTypeText: CLAIM_TYPE_TEXT[c.claimType] ?? 'Other',
        labelText: labels[c.label] ?? labels.unverified,
        isUnverified: c.label === 'unverified',
        summary: c.summary,
        sources: c.sources.map((s) => ({ title: s.title, url: s.url })),
        isNew: !seen.has(c.id),
      }));
  };
})();
