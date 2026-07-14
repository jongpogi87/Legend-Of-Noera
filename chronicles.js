(() => {
  const titleCorrectionStyles = document.createElement('style');
  titleCorrectionStyles.textContent = `
    .full-page-edition.episode-title-corrected{position:relative}
    .page-episode-title-correction{position:absolute;z-index:3;top:0;left:0;right:0;height:var(--episode-header-height,5%);display:flex;align-items:center;padding:0 2.1%;box-sizing:border-box;background:linear-gradient(90deg,#071419 0%,#0a1b20 60%,#102327 100%);border-bottom:1px solid rgba(214,184,108,.45);color:#d6b86c;font:800 clamp(7px,1.05vw,15px)/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;pointer-events:none}
    @media(max-width:640px){.page-episode-title-correction{display:none}}
  `;
  document.head.appendChild(titleCorrectionStyles);

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

  const panelSets = [
    null,
    { src: 'comics/chronicles-episode-1-chapter-2-the-first-day.svg', size: [1216, 1294], boxes: ['6 50 394 424','402 50 373 424','777 50 433 424','6 477 394 371','402 477 373 371','777 477 433 371','6 850 394 399','402 850 398 399','802 850 408 399'] },
    { src: 'comics/chronicles-episode-1-chapter-3-the-new-classroom.svg', size: [1402, 1122], boxes: ['5 59 460 347','467 59 487 347','957 59 439 347','5 409 460 327','467 409 487 327','957 409 439 327','5 739 460 346','467 739 487 346','957 739 439 346'] },
    { src: 'comics/chronicles-episode-1-chapter-4-the-quiet-boy.svg', size: [1402, 1122], boxes: ['5 59 471 367','478 59 444 367','923 59 473 367','5 427 471 323','478 427 444 323','923 427 473 323','5 751 471 306','478 751 444 306','923 751 473 306'] },
    { src: 'comics/chronicles-episode-1-chapter-5-the-forgotten-drawing.svg', size: [1402, 1122], boxes: ['5 50 471 348','478 50 444 348','923 50 473 348','5 399 471 330','478 399 444 330','923 399 473 330','5 729 471 336','478 729 444 336','923 729 473 336'] },
    { src: 'comics/chronicles-episode-1-chapter-6-the-golden-leaf-refined.svg', size: [1402, 1122], boxes: ['4 54 470 318','477 54 430 318','910 54 489 318','4 373 470 331','477 373 430 331','910 373 489 331','4 705 470 329','477 705 430 329','910 705 489 329'] },
    { src: 'comics/chronicles-episode-1-chapter-7-beyond-the-stars.svg', size: [1402, 1122], boxes: ['5 56 473 348','484 56 435 348','925 56 469 348','5 406 473 310','484 406 435 310','925 406 469 310','5 718 473 326','484 718 435 326','925 718 469 326'] },
    { src: 'comics/chronicles-episode-1-chapter-8-when-the-auret-sang.svg', size: [1024, 1536], boxes: ['11 40 567 340','579 40 434 340','11 382 406 375','419 382 594 375','11 759 333 254','345 759 326 254','673 759 340 254','11 1015 418 259','431 1015 582 259','11 1276 1002 249'] }
  ];

  panelSets.forEach((set, index) => {
    if (!set || !chapters[index]) return;
    const chapter = chapters[index];
    const fullPage = chapter.querySelector('.full-page-edition');

    if (fullPage && !fullPage.querySelector('.page-episode-title-correction')) {
      const firstPanelTop = Number(set.boxes[0].split(' ')[1]);
      const headerPercent = Math.max(2.6, (firstPanelTop / set.size[1]) * 100);
      fullPage.classList.add('episode-title-corrected');
      fullPage.style.setProperty('--episode-header-height', `${headerPercent}%`);
      const correction = document.createElement('div');
      correction.className = 'page-episode-title-correction';
      correction.textContent = 'Episode I — The Girl Who Saw Differently';
      fullPage.appendChild(correction);
    }

    if (chapter.querySelector('.mobile-panel-edition')) return;
    chapter.classList.add('has-mobile-panels');
    const mobile = document.createElement('div');
    mobile.className = 'mobile-panel-edition';
    mobile.setAttribute('aria-label', `Phone-friendly edition of Chapter ${index + 1}`);
    mobile.innerHTML = `<p class="mobile-reader-note"><strong>Phone Edition</strong>Scroll down and read one panel at a time.</p>`;

    set.boxes.forEach((box, panelIndex) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'comic-panel');
      svg.setAttribute('viewBox', box);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `Chapter ${index + 1}, panel ${panelIndex + 1}`);
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      image.setAttribute('href', set.src);
      image.setAttribute('width', String(set.size[0]));
      image.setAttribute('height', String(set.size[1]));
      svg.appendChild(image);
      mobile.appendChild(svg);
    });

    const end = document.createElement('div');
    end.className = 'mobile-panel-end';
    end.textContent = index === chapters.length - 1 ? '❧  END OF EPISODE I' : `❧  END OF CHAPTER ${index + 1}`;
    mobile.appendChild(end);
    fullPage?.insertAdjacentElement('afterend', mobile);
  });

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
    if (scroll) window.scrollTo({ top: readerShell.offsetTop - 76, behavior: 'smooth' });
  };

  const showChapter = (index, updateHistory = true, scroll = true) => {
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    openReader(false);
    chapters.forEach((chapter, chapterIndex) => chapter.hidden = chapterIndex !== safeIndex);
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
    if (scroll) window.scrollTo({ top: reader.offsetTop - 90, behavior: 'smooth' });
  };

  chapters.forEach((chapter, index) => {
    if (chapter.querySelector('.chapter-end-navigation')) return;
    const nav = document.createElement('nav');
    nav.className = 'chapter-end-navigation';
    nav.setAttribute('aria-label', `Chapter ${index + 1} navigation`);

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'chapter-end-button chapter-end-back';
    back.innerHTML = '<span aria-hidden="true">←</span><span><small>Previous</small>Back</span>';
    back.disabled = index === 0;
    back.addEventListener('click', () => showChapter(index - 1, true, true));

    const marker = document.createElement('div');
    marker.className = 'chapter-end-marker';
    marker.innerHTML = `<span>❧</span><strong>Chapter ${index + 1} of ${chapters.length}</strong>`;

    const isLastChapter = index === chapters.length - 1;
    const forward = document.createElement('a');
    forward.className = 'chapter-end-button chapter-end-next';
    if (isLastChapter) {
      forward.href = 'episode-2.html';
      forward.classList.add('is-complete');
      forward.innerHTML = '<span><small>Continue the Journey</small>Episode II</span><span aria-hidden="true">→</span>';
    } else {
      forward.href = `episode-1.html?chapter=${index + 2}`;
      forward.innerHTML = '<span><small>Continue Reading</small>Next Chapter</span><span aria-hidden="true">→</span>';
      forward.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        showChapter(index + 1, true, true);
      });
    }

    nav.append(back, marker, forward);
    chapter.appendChild(nav);
  });

  beginButton?.addEventListener('click', () => showChapter(0, true, true));
  select.addEventListener('change', () => showChapter(Number(select.value) - 1));
  previous.addEventListener('click', () => showChapter(Number(select.value) - 2));
  next.addEventListener('click', () => showChapter(Number(select.value)));
  window.addEventListener('popstate', () => showChapter(getRequestedIndex(), false));
  if (hasRequestedChapter) showChapter(getRequestedIndex(), false, false);
})();