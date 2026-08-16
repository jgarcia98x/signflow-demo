#!/bin/sh
# Re-stamp ?v= on every local script/style reference.
#
# Why this exists: GitHub Pages serves our JS with cache-control:
# max-age=600 and iOS Safari holds it far longer. Peter ended up running
# stale JavaScript against fresh HTML, which broke drag-and-drop and
# produced dead links — with nothing wrong in the repo.
#
# Run before every deploy:  ./bump-cache.sh && git commit -am "..." && git push
V=$(date +%Y%m%d%H%M)
for f in *.html; do
  sed -i '' -E "s/(src=\"signflow-[a-z]+\.js)(\?v=[^\"]*)?\"/\1?v=$V\"/g" "$f"
  sed -i '' -E "s/(href=\"signflow-calm\.css)(\?v=[^\"]*)?\"/\1?v=$V\"/g" "$f"
done
echo "cache stamp: $V"
