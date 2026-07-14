from pathlib import Path

for number in range(2, 6):
    path = Path(f"episode-{number}.html")
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        'episode-unified.css?v=20260714-1',
        'episode-unified.css?v=20260714-2'
    )
    path.write_text(text, encoding="utf-8")
