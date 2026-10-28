#!/bin/zsh
# Build one walkthrough video (macOS only, nothing to install).
#   ./build.sh admin|teacher|profile <work-dir> [stills t1 t2 … | video | web]
# 1. drives the real app and screenshots each state (capture/<name>.json)
# 2. assembles the composition + screenshots in <work-dir>/<name>/
# 3. renders stills or the full video (with soundtrack) to ../<name>-walkthrough.mp4
#    web: a smaller copy of that video for a web page → ../<name>-walkthrough-web.mp4 [kbps, default 1800]
set -e
NAME=$1; WORK=$2; MODE=${3:-video}; shift 3 2>/dev/null || true
SRC=${0:A:h}; PROJECT=${SRC:h:h:h}; BIN=$WORK/bin; OUT=$WORK/$NAME
mkdir -p $BIN $OUT
for t in driver render audio webcopy; do [[ $BIN/$t -nt $SRC/$t.swift ]] || swiftc -O $SRC/$t.swift -o $BIN/$t; done
if [[ $MODE == web ]]; then $BIN/webcopy $SRC/../$NAME-walkthrough.mp4 $SRC/../$NAME-walkthrough-web.mp4 "$@"; exit; fi
if [[ ! -f $OUT/shots/rects.json ]]; then (cd $PROJECT && $BIN/driver $SRC/capture/$NAME.json $OUT/shots); fi
cp -R $SRC/comp/. $OUT/
cp $SRC/timeline-$NAME.js $OUT/timeline.js
print -r -- "window.RECTS = $(cat $OUT/shots/rects.json);" > $OUT/rects.js
if [[ $MODE == stills ]]; then mkdir -p $OUT/stills; $BIN/render $OUT/index.html stills $OUT/stills "$@"; exit; fi
$BIN/render $OUT/index.html events $OUT/events.json
$BIN/audio $OUT/events.json $OUT/soundtrack.wav
$BIN/render $OUT/index.html video $SRC/../$NAME-walkthrough.mp4 $OUT/soundtrack.wav
