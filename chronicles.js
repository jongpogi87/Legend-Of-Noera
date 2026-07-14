(() => {
  const reader = document.querySelector('[data-episode-reader]');
  if (!reader) return;

  const cover = document.querySelector('#episode-cover');
  const readerShell = document.querySelector('#reader-shell');
  const beginButton = document.querySelector('#begin-reading');
  const chapters = [...reader.querySelectorAll('.chapter-reader')];
  const select = document.querySelector('#chapter-select');
  const previous = document.querySelector('#chapter-previous');
  const next = document.querySelector('#chapter-next');
  const position = document.querySelector('#chapter-position');
  const announcement = document.querySelector('#chapter-announcement');
  const finish = document.querySelector('#episode-complete-card');

  if (!chapters.length || !select || !previous || !next || !readerShell) return;

  const params = new URLSearchParams(window.location.search);
  const hasRequestedChapter = params.has('chapter');

  const getRequestedIndex = () => {
    const value = Number(new URLSearchParams(window.location.search).get('chapter'));
    return Number.isInteger(value) && value >= 1 && value <= chapters.length ? value - 1 : 0;
  };

  const openReader = (scroll = true) => {
    readerShell.hidden = false;
    if (cover) cover.classList.add('is-condensed');
    document.body.classList.add('reader-open');
    if (scroll) {
      window.scrollTo({ top: readerShell.offsetTop - 76, behavior: 'smooth' });
    }
  };

  const showChapter = (index, updateHistory = true, scroll = true) => {
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    openReader(false);

    chapters.forEach((chapter, chapterIndex) => {
      chapter.hidden = chapterIndex !== safeIndex;
    });

    select.value = String(safeIndex + 1);
    previous.disabled = safeIndex === 0;
    next.disabled = safeIndex === chapters.length - 1;
    position.textContent = `Chapter ${safeIndex + 1} of ${chapters.length}`;
    finish.hidden = safeIndex !== chapters.length - 1;

    const title = chapters[safeIndex].querySelector('h2')?.textContent?.trim() || `Chapter ${safeIndex + 1}`;
    document.title = `${title} — Legend of Noera: Chronicles`;
    announcement.textContent = `Now reading Chapter ${safeIndex + 1}: ${title}`;

    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set('chapter', String(safeIndex + 1));
      history.replaceState({ chapter: safeIndex + 1 }, '', url);
    }

    if (scroll) {
      window.scrollTo({ top: reader.offsetTop - 90, behavior: 'smooth' });
    }
  };

  beginButton?.addEventListener('click', () => showChapter(0, true, true));
  select.addEventListener('change', () => showChapter(Number(select.value) - 1));
  previous.addEventListener('click', () => showChapter(Number(select.value) - 2));
  next.addEventListener('click', () => showChapter(Number(select.value)));
  window.addEventListener('popstate', () => showChapter(getRequestedIndex(), false));

  if (hasRequestedChapter) {
    showChapter(getRequestedIndex(), false, false);
  }
})();