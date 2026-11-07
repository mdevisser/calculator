// Fills a lesson page's #trust and #lesson-nav from lessonHeaderModel. All DOM
// access happens inside renderLessonHeader, so Node can import this file.
// Load order on a lesson page: ../results.js, ../lessons.js, ../lesson-model.js,
// then this file.

globalThis.renderLessonHeader = function renderLessonHeader(slug) {
  const m = globalThis.lessonHeaderModel(globalThis.LESSONS, globalThis.RESULTS, slug);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const trust = document.getElementById('trust');
  const chip = el('span', 'label-chip', m.labelText);
  if (m.labelText === globalThis.TRUST_LABELS.unverified) chip.classList.add('unverified');
  trust.appendChild(chip);
  if (!m.confirmed) {
    trust.appendChild(el('span', 'unconfirmed', 'not yet confirmed against primary sources'));
  }
  trust.appendChild(el('span', 'byline', m.byline));
  if (m.checkedHere) {
    const badge = el('a', 'checked-here', '✓ Checked here');
    badge.href = '../checks.html';
    badge.title = `This repo's own exact check of ${m.checkedHere.fixture} returns ${m.checkedHere.verdict}`;
    trust.appendChild(badge);
  }

  for (const nav of document.querySelectorAll('#lesson-nav, .lesson-nav')) {
    const back = el('span');
    if (m.prev) {
      const a = el('a', null, `← ${m.prev.title}`);
      a.href = m.prev.href;
      back.appendChild(a);
    }
    const home = el('a', null, 'home');
    home.href = '../index.html';
    const next = el('span');
    if (m.next) {
      const a = el('a', null, `${m.next.title} →`);
      a.href = m.next.href;
      next.appendChild(a);
    }
    nav.append(back, home, next);
  }
};
