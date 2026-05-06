#!/usr/bin/env bash
# Daily housekeeping: drop feeds/ and digest/ files older than RETAIN_DAYS,
# truncate logs that exceed LOG_MAX_BYTES.
#
# Date is taken from the filename (e.g. feeds/2026-05-06.md, digest/2026-05-06.zh.json)
# rather than mtime — file metadata can be perturbed by syncs, restores, or
# tarball round-trips, but the filename is authoritative.

set -euo pipefail

PROJECT_DIR="/home/liharr/src/ai-feed"
RETAIN_DAYS=${RETAIN_DAYS:-90}
LOG_MAX_BYTES=${LOG_MAX_BYTES:-$((5 * 1024 * 1024))}   # 5 MiB

cd "$PROJECT_DIR"

CUTOFF=$(date -u -d "${RETAIN_DAYS} days ago" +%Y-%m-%d)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

deleted=0
for f in feeds/*.md digest/*.md digest/*.json; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    # Take the leading YYYY-MM-DD; everything after the first '.' is the suffix
    # (.md / .json / .zh.json). Lexicographic compare on YYYY-MM-DD == chronological.
    date_part=${base%%.*}
    if [[ ! "$date_part" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        continue
    fi
    if [[ "$date_part" < "$CUTOFF" ]]; then
        rm -- "$f"
        deleted=$((deleted + 1))
    fi
done

# Log rotation: keep the most recent LOG_MAX_BYTES/2 of each log when it
# exceeds the cap. Simple, no logrotate dependency.
truncated=0
for log in fetch.log cron.log; do
    [ -f "$log" ] || continue
    size=$(stat -c %s "$log")
    if [ "$size" -gt "$LOG_MAX_BYTES" ]; then
        keep=$((LOG_MAX_BYTES / 2))
        tail -c "$keep" "$log" > "$log.tmp" && mv "$log.tmp" "$log"
        truncated=$((truncated + 1))
    fi
done

echo "[$TS] prune: deleted=$deleted (older than $CUTOFF), logs_truncated=$truncated"
