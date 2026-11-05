// Pure functions from lesson data (+ the verifier's results) to what the pages
// render. No DOM here, so Node tests call exactly what the browser calls.

globalThis.pathModel = function pathModel(lessons) {
  return [...lessons]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      slug: l.slug,
      title: l.title,
      blurb: l.blurb,
      position: l.position,
      labelText: globalThis.TRUST_LABELS[l.label],
      confirmed: l.confirmed,
      href: l.available ? `lessons/${l.slug}.html` : null,
    }));
};

globalThis.lessonHeaderModel = function lessonHeaderModel(lessons, results, slug) {
  const ordered = [...lessons].sort((a, b) => a.position - b.position);
  const i = ordered.findIndex((l) => l.slug === slug);
  const lesson = ordered[i];

  // "Checked here" only when the verifier itself says CONFIRMED for the named
  // fixture. Missing results, a missing row, or any other verdict: no badge.
  let checkedHere = null;
  if (lesson.checkedHere && results && Array.isArray(results.results)) {
    const row = results.results.find((r) => r.fixture === lesson.checkedHere);
    if (row && row.verdict === 'CONFIRMED') {
      checkedHere = { fixture: row.fixture, verdict: row.verdict };
    }
  }

  // Back/next link only to lessons that exist, so navigation never 404s.
  const link = (l) => (l ? { slug: l.slug, title: l.title, href: `${l.slug}.html` } : null);
  const prev = ordered.slice(0, i).reverse().find((l) => l.available);
  const next = ordered.slice(i + 1).find((l) => l.available);

  return {
    title: lesson.title,
    labelText: globalThis.TRUST_LABELS[lesson.label],
    confirmed: lesson.confirmed,
    checkedHere,
    prev: link(prev),
    next: link(next),
    sources: lesson.sources,
  };
};
