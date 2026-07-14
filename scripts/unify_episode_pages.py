from pathlib import Path

# One-time formatter for Episodes II–V.
pages = {
    2: ("sanctuary-placeholder", "sanctuary-artwork-notice", "episode-two-end-nav"),
    3: ("two-lives-placeholder", "two-lives-artwork-notice", "episode-three-end-nav"),
    4: ("calling-placeholder", "calling-artwork-notice", "episode-four-end-nav"),
    5: ("first-step-placeholder", "first-step-artwork-notice", "episode-five-end-nav"),
}

for number, (placeholder, notice, end_nav) in pages.items():
    path = Path(f"episode-{number}.html")
    text = path.read_text(encoding="utf-8")

    stylesheet = '<link rel="stylesheet" href="episode-unified.css?v=20260714-1">'
    if stylesheet not in text:
        marker = f'<link rel="stylesheet" href="episode-{number}.css?v=20260714-1">'
        text = text.replace(marker, marker + "\n  " + stylesheet)

    text = text.replace(
        f'class="chapter-reader {placeholder}',
        f'class="chapter-reader episode-placeholder {placeholder}'
    )
    text = text.replace(
        f"notice.className = '{notice}';",
        f"notice.className = 'episode-status-card {notice}';"
    )
    text = text.replace(
        f"notice.className='{notice}';",
        f"notice.className='episode-status-card {notice}';"
    )
    text = text.replace(
        f'class="{end_nav}"',
        f'class="episode-end-nav {end_nav}"'
    )

    if number == 5:
        text = text.replace(
            '<span><strong>Finale</strong> Season I</span>',
            '<span><strong>Season Finale</strong> Status</span>'
        )
        old = '''<section class="season-complete-card" aria-labelledby="season-complete-title">
        <p class="eyebrow">SEASON I COMPLETE</p>
        <h2 id="season-complete-title">The Awakening</h2>
        <p>Lady Zion’s first calling has become a choice. Her greater journey is only beginning.</p>
        <a class="secondary-action" href="comic.html#season-one">Return to Season I</a>
      </section>'''
        new = '''<section id="episode-five-complete-card" class="episode-finish season-complete-card" aria-labelledby="season-complete-title" hidden>
        <p class="eyebrow">SEASON I COMPLETE</p>
        <div class="episode-completion-status" role="status">
          <span class="episode-completion-mark" aria-hidden="true">✓</span>
          <div class="episode-completion-copy"><span>Reading Status</span><strong>Episode V Complete</strong></div>
        </div>
        <h2 id="season-complete-title">The Awakening</h2>
        <p>Lady Zion’s first calling has become a choice. Her greater journey is only beginning.</p>
        <a class="secondary-action" href="comic.html#season-one">Return to Season I</a>
      </section>'''
        text = text.replace(old, new)
        text = text.replace(
            "announcement=document.querySelector('#episode-five-announcement'),entries=",
            "announcement=document.querySelector('#episode-five-announcement'),finish=document.querySelector('#episode-five-complete-card'),entries="
        )
        text = text.replace(
            "next.disabled=safe===entries.length-1;const title=",
            "next.disabled=safe===entries.length-1;if(finish)finish.hidden=safe!==entries.length-1;const title="
        )

    path.write_text(text, encoding="utf-8")
