(() => {
  const readers = [...document.querySelectorAll('.chapter-reader')];
  const navigator = document.querySelector('#chapter-navigator');
  const select = document.querySelector('#chapter-select');
  const previous = document.querySelector('#chapter-previous');
  const next = document.querySelector('#chapter-next');
  const position = document.querySelector('#chapter-position');
  const progress = document.querySelector('#chapter-progress-fill');
  const announcement = document.querySelector('#chapter-announcement');
  const completionCard = document.querySelector('#episode-complete-card');

  if (!readers.length || !navigator || !select || !previous || !next) return;

  const chapterIds = readers.map((reader) => reader.id);
  let activeIndex = Math.max(0, chapterIds.indexOf(window.location.hash.slice(1)));

  document.body.classList.add('js-chapter-mode');
  navigator.hidden = false;

  const chapterTitle = (index) => {
    const heading = readers[index].querySelector('h2');
    return heading ? heading.textContent.trim() : `Chapter ${index + 1}`;
  };

  const showChapter = (index, options = {}) => {
    const { updateAddress = false, moveToReader = false, announce = false } = options;
    activeIndex = Math.min(Math.max(index, 0), readers.length - 1);

    readers.forEach((reader, readerIndex) => {
      const isActive = readerIndex === activeIndex;
      reader.hidden = !isActive;
      reader.setAttribute('aria-hidden', String(!isActive));
    });

    const id = chapterIds[activeIndex];
    select.value = id;
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === readers.length - 1;
    position.textContent = `Chapter ${activeIndex + 1} of ${readers.length}`;
    progress.style.width = `${((activeIndex + 1) / readers.length) * 100}%`;
    completionCard.hidden = activeIndex !== readers.length - 1;

    if (updateAddress) history.pushState(null, '', `#${id}`);

    if (moveToReader) {
      navigator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (announce) {
      announcement.textContent = `Chapter ${activeIndex + 1}: ${chapterTitle(activeIndex)}`;
    }
  };

  select.addEventListener('change', () => {
    showChapter(chapterIds.indexOf(select.value), {
      updateAddress: true,
      moveToReader: true,
      announce: true
    });
  });

  previous.addEventListener('click', () => {
    showChapter(activeIndex - 1, {
      updateAddress: true,
      moveToReader: true,
      announce: true
    });
  });

  next.addEventListener('click', () => {
    showChapter(activeIndex + 1, {
      updateAddress: true,
      moveToReader: true,
      announce: true
    });
  });

  window.addEventListener('hashchange', () => {
    const requestedIndex = chapterIds.indexOf(window.location.hash.slice(1));
    if (requestedIndex >= 0) {
      showChapter(requestedIndex, { moveToReader: true, announce: true });
    }
  });

  showChapter(activeIndex);
})();
