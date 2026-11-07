"""The website's own wording (home/site_text.json), as the admin and the API use it.

The same file gives the website its standard text, so the two can't drift apart. Site settings keep only what was changed.
"""
import json
from pathlib import Path

_DATA = json.loads((Path(__file__).with_name('site_text.json')).read_text(encoding='utf-8'))

# ((group name, ((key, label, standard text), ...)), ...)
SITE_TEXT = tuple((g['name'], tuple(tuple(item) for item in g['items'])) for g in _DATA['groups'])
TEXT_KEYS = tuple(key for _, items in SITE_TEXT for key, _, _ in items)


def changed_text(saved):
    """Only the wording that is known and not empty, so stale or blank entries never reach the website."""
    if not isinstance(saved, dict):
        return {}
    return {k: v for k, v in saved.items() if k in TEXT_KEYS and isinstance(v, str) and v.strip()}
