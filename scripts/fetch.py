#!/usr/bin/env python3
"""
ai-feed fetcher: pulls a list of RSS/Atom feeds, dedupes against seen.json,
and appends new items to today's markdown digest under feeds/.

Pure stdlib. Tolerant of both RSS 2.0 and Atom. Fails per-source, never globally.
"""
import json
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sources.txt"
SEEN = ROOT / "seen.json"
FEEDS_DIR = ROOT / "feeds"
LOG = ROOT / "fetch.log"

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 ai-feed/0.1"
# 30s tolerates an occasional cold-cache hit on the self-hosted RSSHub
# bridge (/anthropic/research can take ~100s cold, but that surface is
# pre-warmed by warm-rsshub.sh from cron). Most upstreams return in <2s.
TIMEOUT = 30
MAX_PER_SOURCE = 8           # default cap items per source per run
DESC_CHARS = 1500            # truncate excerpts — leaves enough room for
                             # the agent to see lede + key claim + a detail
                             # or two without inflating the input file beyond
                             # ~230KB (~19 sources × 8 items × 1500).

# Sources whose URL matches these substrings get a custom JSON handler
HF_DAILY_PAPERS = "huggingface.co/api/daily_papers"


def log(msg: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")


def load_seen() -> set:
    if not SEEN.exists():
        return set()
    try:
        return set(json.loads(SEEN.read_text()))
    except Exception:
        return set()


def save_seen(seen: set) -> None:
    # cap memory: keep most recent 5000 ids
    SEEN.write_text(json.dumps(sorted(seen)[-5000:], indent=0))


def parse_sources():
    out = []
    for raw in SOURCES.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "|" not in line:
            continue
        name, url = (p.strip() for p in line.split("|", 1))
        out.append((name, url))
    return out


def fetch_url(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def localname(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def find_first(elem, *names):
    """Return first child whose local name matches any of `names`."""
    wanted = set(names)
    for child in elem:
        if localname(child.tag) in wanted:
            return child
    return None


def find_all(elem, *names):
    wanted = set(names)
    return [c for c in elem if localname(c.tag) in wanted]


def text_of(elem) -> str:
    if elem is None:
        return ""
    # join all text including nested
    return "".join(elem.itertext()).strip()


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_date(s: str):
    if not s:
        return None
    s = s.strip()
    # RFC 822 (RSS)
    try:
        dt = parsedate_to_datetime(s)
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass
    # ISO 8601 (Atom)
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def extract_hf_daily_papers(raw: bytes):
    """HF daily_papers JSON → unified item format, pre-sorted by upvotes desc."""
    data = json.loads(raw)
    items = []
    for entry in data:
        paper = entry.get("paper") or {}
        pid = paper.get("id") or ""
        title = paper.get("title") or entry.get("title") or ""
        summary = paper.get("summary") or entry.get("summary") or ""
        upvotes = paper.get("upvotes") or 0
        published = entry.get("publishedAt") or paper.get("publishedAt") or ""
        link = f"https://huggingface.co/papers/{pid}" if pid else ""
        prefix = f"[⬆{upvotes}] " if upvotes else ""
        items.append({
            "title": prefix + strip_html(title),
            "link": link,
            "date": parse_date(published),
            "summary": strip_html(summary),
            "guid": f"hf-papers:{pid}" if pid else link,
            "_upvotes": upvotes,
        })
    items.sort(key=lambda x: x.get("_upvotes", 0), reverse=True)
    return items


def extract_items(xml_bytes: bytes):
    """Yield dicts {title, link, date, summary, guid} for either RSS or Atom."""
    # Some publishers (METR, occasional WordPress sites) emit a UTF-8 BOM or
    # blank lines before the <?xml ...?> declaration, which strict ElementTree
    # rejects. Trim both before parsing.
    xml_bytes = xml_bytes.lstrip(b"\xef\xbb\xbf").lstrip()
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        raise RuntimeError(f"XML parse error: {e}")

    rname = localname(root.tag)
    items_out = []

    if rname == "rss":
        channel = find_first(root, "channel")
        if channel is None:
            return items_out
        for item in find_all(channel, "item"):
            title = text_of(find_first(item, "title"))
            link = text_of(find_first(item, "link"))
            date = text_of(find_first(item, "pubDate", "date", "published"))
            # WordPress/Substack/etc. emit a short teaser in <description> and
            # the full post body in <content:encoded> (localname "encoded").
            # Prefer the body when both are present.
            desc = text_of(find_first(item, "encoded", "description", "summary", "content"))
            guid = text_of(find_first(item, "guid")) or link
            items_out.append({
                "title": strip_html(title),
                "link": link.strip(),
                "date": parse_date(date),
                "summary": strip_html(desc),
                "guid": guid.strip() or link.strip(),
            })
    elif rname == "feed":  # Atom
        for entry in find_all(root, "entry"):
            title = text_of(find_first(entry, "title"))
            # Atom <link href="..."> — usually attribute
            link = ""
            for ln in find_all(entry, "link"):
                href = ln.attrib.get("href")
                rel = ln.attrib.get("rel", "alternate")
                if href and rel == "alternate":
                    link = href
                    break
            if not link:
                ln = find_first(entry, "link")
                if ln is not None:
                    link = ln.attrib.get("href", "") or text_of(ln)
            date = text_of(find_first(entry, "updated", "published"))
            desc = text_of(find_first(entry, "summary", "content"))
            guid = text_of(find_first(entry, "id")) or link
            items_out.append({
                "title": strip_html(title),
                "link": link.strip(),
                "date": parse_date(date),
                "summary": strip_html(desc),
                "guid": guid.strip() or link.strip(),
            })
    else:
        raise RuntimeError(f"Unknown root element: {rname}")

    return items_out


def truncate(s: str, n: int) -> str:
    if len(s) <= n:
        return s
    return s[:n].rsplit(" ", 1)[0] + "…"


def render_section(name: str, new_items: list) -> str:
    if not new_items:
        return ""
    lines = [f"## {name}", ""]
    for it in new_items:
        title = it["title"] or "(no title)"
        link = it["link"]
        when = it["date"].astimezone().strftime("%Y-%m-%d %H:%M") if it["date"] else "—"
        lines.append(f"### [{title}]({link})")
        lines.append(f"_{when}_")
        if it["summary"]:
            lines.append("")
            lines.append(truncate(it["summary"], DESC_CHARS))
        lines.append("")
    return "\n".join(lines)


def main():
    FEEDS_DIR.mkdir(exist_ok=True)
    seen = load_seen()
    sources = parse_sources()
    log(f"run start: {len(sources)} sources, {len(seen)} seen ids")

    today = datetime.now().strftime("%Y-%m-%d")
    out_path = FEEDS_DIR / f"{today}.md"

    sections = []
    total_new = 0
    for name, url in sources:
        cap = MAX_PER_SOURCE
        try:
            raw = fetch_url(url)
            if HF_DAILY_PAPERS in url:
                items = extract_hf_daily_papers(raw)
                items_sorted = items  # already by upvotes desc
                cap = 5               # only the hottest
            else:
                items = extract_items(raw)
                items_sorted = sorted(
                    items,
                    key=lambda x: x["date"] or datetime(1970, 1, 1, tzinfo=timezone.utc),
                    reverse=True,
                )
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, TimeoutError, json.JSONDecodeError) as e:
            log(f"  [{name}] FAIL: {e}")
            continue

        new_items = []
        for it in items_sorted:
            key = it["guid"] or it["link"]
            if not key or key in seen:
                continue
            seen.add(key)
            new_items.append(it)
            if len(new_items) >= cap:
                break

        log(f"  [{name}] {len(items)} items, {len(new_items)} new")
        total_new += len(new_items)
        sec = render_section(name, new_items)
        if sec:
            sections.append(sec)

    if not sections:
        log(f"run end: 0 new items, nothing written")
        save_seen(seen)
        return 0

    header = (
        f"# AI Feed — {today}\n\n"
        f"_Generated {datetime.now().strftime('%Y-%m-%d %H:%M %Z')}, "
        f"{total_new} new items from {len(sources)} sources_\n\n---\n"
    )

    if out_path.exists():
        # append a new run section
        with out_path.open("a") as f:
            f.write(f"\n\n---\n\n_Run at {datetime.now().strftime('%H:%M')} — {total_new} new items_\n\n")
            f.write("\n\n".join(sections))
            f.write("\n")
    else:
        out_path.write_text(header + "\n\n".join(sections) + "\n")

    save_seen(seen)
    log(f"run end: {total_new} new items, wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
