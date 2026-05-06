# ai-feed

Daily aggregator for frontier-AI news / research. Pulls a list of RSS/Atom
feeds, dedupes against `seen.json`, and appends new items to a daily Markdown
digest under `feeds/`.

## Layout

```
ai-feed/
├── sources.txt          one feed per line: "Name | URL"
├── scripts/fetch.py     pure-stdlib RSS+Atom fetcher
├── feeds/               daily digests, e.g. feeds/2026-05-06.md
├── seen.json            list of guids/links already digested (dedup)
├── fetch.log            in-script run log
└── cron.log             crontab stdout/stderr capture
```

## Schedule

Installed in user crontab on this VM:

```
13 0,12 * * * /usr/bin/python3 /home/liharr/src/ai-feed/scripts/fetch.py >>/home/liharr/src/ai-feed/cron.log 2>&1
```

That's 08:13 and 20:13 Asia/Shanghai (VM runs in UTC). Two passes per day
catches both overnight (US PM) and daytime (US AM) updates.

## Reading the digest

Open today's file:

```
ls -t feeds/ | head -1
```

Or just `vim feeds/2026-05-06.md`.

## Adding / removing sources

Edit `sources.txt`. Lines starting with `#` are ignored. Format: `Name | URL`.

To re-test after a change without waiting for cron:

```
python3 scripts/fetch.py
```

The script is tolerant — a single bad source logs `FAIL` and the others continue.

## What's not here yet

- **LLM summarization.** First phase is just titles + first ~280 chars of each
  item's description. Once we know which sources are signal vs noise, phase 2
  adds a Claude API call per run that produces a top-10 "today's takeaways"
  section.
- **Web view.** No frontend — read the markdown directly. Could later add a
  Next.js page (basePath `/feed`) under the same nginx + GitHub OAuth pattern
  as `ai-playground` and `vpn-monitor`.
- **Sources without RSS.** Anthropic, Meta AI, Mistral don't publish RSS.
  These get covered indirectly by Smol AI News and HN. Direct scraping
  is intentionally deferred — not worth the maintenance cost yet.

## Notes / quirks

- `seen.json` is capped at the most recent 5000 IDs to avoid unbounded growth.
- Each source is capped at 8 new items per run to bound the digest size when a
  long-dormant source suddenly returns.
- `User-Agent` is a Chrome string — some hosts (Substack, certain Cloudflare
  setups) refuse non-browser UAs. Substack's `importai` still 403s anyway.
