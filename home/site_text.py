"""The website's own wording (home/site_text.json) and its legal pages (home/legal_text.json), as the admin and the API use them.

The same files give the website its standard text, so the two can't drift apart. Site settings keep only what was changed.
"""
import json
from pathlib import Path

_HERE = Path(__file__).parent
_GROUPS = [g for name in ('site_text.json', 'legal_text.json') for g in json.loads((_HERE / name).read_text(encoding='utf-8'))['groups']]

# ((group name, ((key, label, standard text), ...)), ...)
SITE_TEXT = tuple((g['name'], tuple(tuple(item) for item in g['items'])) for g in _GROUPS)
TEXT_KEYS = tuple(key for _, items in SITE_TEXT for key, _, _ in items)
# A group's own note for the admin, where it needs more than the usual one
GROUP_NOTES = {g['name']: g['about'] for g in _GROUPS if g.get('about')}


def changed_text(saved):
    """Only the wording that is known and not empty, so stale or blank entries never reach the website."""
    if not isinstance(saved, dict):
        return {}
    return {k: v for k, v in saved.items() if k in TEXT_KEYS and isinstance(v, str) and v.strip()}
