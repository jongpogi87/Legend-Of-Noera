from pathlib import Path

STATUS = {
    2: ("Coming Soon", "The story has already been written. Its illustrated comic adaptation is next in the Chronicles."),
    3: ("In Development", "The storyboards and visual direction for this chapter are currently taking shape."),
    4: ("In Production", "This chapter is moving through production as its scenes and panels are carefully prepared."),
    5: ("Season Finale", "The closing movement of Season I is being carefully developed for its illustrated release."),
}

for number in range(1, 6):
    path = Path(f"episode-{number}.html")
    text = path.read_text(encoding="utf-8")
    text = text.replace("Choose a Chapter", "Journey Through This Episode")
    text = text.replace("Begin Reading", "Begin the Journey")

    if number in STATUS:
        title, message = STATUS[number]
        old_variants = [
            "notice.innerHTML = '<span>❧</span><strong>Chapter artwork is being prepared.</strong><p>This page is ready for its illustrated panels.</p>';",
            "notice.innerHTML='<span>❧</span><strong>Chapter artwork is being prepared.</strong><p>This page is ready for its illustrated panels.</p>';",
        ]
        new_notice = (
            "notice.innerHTML = '<span class=\"chapter-status-label\">Chapter Status</span>"
            f"<strong>{title}</strong><p>{message}</p>';"
        )
        for old in old_variants:
            text = text.replace(old, new_notice)

        text = text.replace('<span><strong>Coming</strong> Chapter Art</span>', f'<span><strong>{title}</strong> Status</span>')
        text = text.replace('<span><strong>In Development</strong> Chapter Art</span>', f'<span><strong>{title}</strong> Status</span>')
        text = text.replace('<span><strong>In Production</strong> Chapter Art</span>', f'<span><strong>{title}</strong> Status</span>')
        text = text.replace('<span><strong>Season Finale</strong> Chapter Art</span>', f'<span><strong>{title}</strong> Status</span>')

    text = text.replace('<span class="secondary-action is-disabled" aria-disabled="true">Episode III →</span>', '<a class="secondary-action" href="episode-3.html">Episode III →</a>')
    text = text.replace('<span class="secondary-action is-disabled" aria-disabled="true">Episode IV →</span>', '<a class="secondary-action" href="episode-4.html">Episode IV →</a>')
    text = text.replace('<span class="secondary-action is-disabled" aria-disabled="true">Episode V →</span>', '<a class="secondary-action" href="episode-5.html">Episode V →</a>')

    path.write_text(text, encoding="utf-8")

css = Path("chronicles-refined.css")
style = css.read_text(encoding="utf-8")
addition = """
.chapter-status-label{display:block!important;margin-bottom:8px;color:#8fa6a2!important;font:800 9px system-ui,sans-serif!important;letter-spacing:.2em;text-transform:uppercase}
"""
if ".chapter-status-label" not in style:
    css.write_text(style + addition, encoding="utf-8")
