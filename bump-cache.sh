#!/bin/sh
# Re-stamp ?v= on every local script/style reference.
#
# Why this exists: GitHub Pages serves our JS with cache-control:
# max-age=600 and iOS Safari holds it far longer. Peter ended up running
# stale JavaScript against fresh HTML, which broke drag-and-drop and
# produced dead links — with nothing wrong in the repo.
#
# Run before every deploy:  ./bump-cache.sh && git commit -am "..." && git push
# NOTE: the name pattern must allow HYPHENS. The original `signflow-[a-z]+`
# silently skipped signflow-analytics-config.js, so the one file holding
# the PostHog key would have shipped stale-cached while everything else
# was re-stamped. A cache-busting script that misses a file is worse than
# none: it looks like it worked.
V=$(date +%Y%m%d%H%M)
for f in *.html; do
  sed -i '' -E "s/(src=\"signflow-[a-z-]+\.js)(\?v=[^\"]*)?\"/\1?v=$V\"/g" "$f"
  # Any signflow-*.css, not just calm.css - signflow-design.css was silently
  # skipped by the hardcoded name, the same class of bug as the hyphen one.
  sed -i '' -E "s/(href=\"signflow-[a-z-]+\.css)(\?v=[^\"]*)?\"/\1?v=$V\"/g" "$f"
done
echo "cache stamp: $V"

# Verify: every local signflow-* reference must carry the new stamp.
stale=$(grep -oh 'signflow-[a-z-]*\.\(js\|css\)?\?v=[0-9]*' *.html | grep -v "v=$V" | sort -u)
if [ -n "$stale" ]; then
  echo "ERROR: these references were not re-stamped:" >&2
  echo "$stale" >&2
  exit 1
fi

# An UNSTAMPED local reference is the failure this script exists to prevent,
# and it is invisible to the check above (which only sees stamped ones).
unstamped=$(grep -ohE '(src|href)="signflow-[a-z-]+\.(js|css)"' *.html | sort -u)
if [ -n "$unstamped" ]; then
  echo "ERROR: these references carry no ?v= stamp at all:" >&2
  echo "$unstamped" >&2
  exit 1
fi
echo "all references stamped $V"
