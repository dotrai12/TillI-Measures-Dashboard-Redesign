# Walkthrough videos — source

macOS only; nothing to install (Swift + WebKit + AVFoundation come with Xcode).

    ./build.sh admin   <work-dir>            # → ../admin-walkthrough.mp4 (+ .jpg poster)
    ./build.sh teacher <work-dir>            # → ../teacher-walkthrough.mp4
    ./build.sh profile <work-dir>            # → ../profile-walkthrough.mp4 (website; scrolling pages)
    ./build.sh profile <work-dir> web        # → ../profile-walkthrough-web.mp4 (smaller copy for a web page)
    ./build.sh admin   <work-dir> stills 12.5 31 46   # check frames first

`<work-dir>` holds the screenshots, compiled tools and render files (any temp folder).

| File | What it is |
|---|---|
| `capture/<video>.json` | The click-through of the **real** app: pages, clicks, typing, and when to screenshot. Delete `<work-dir>/<video>/shots` to re-capture after the app changes. |
| `driver.swift` | Runs a capture script offscreen with a fresh demo data store; writes `shots/*.png` (2×) and `rects.json` (where each button is). A `"scroll"` shot also writes `<shot>@s.png`: the page's scrolling area captured strip by strip and joined into one tall image, which the video scrolls under the real sticky sidebar and header. |
| `timeline-<video>.js` | Captions, which screenshot shows when, cursor path, clicks and zooms (times in seconds; the music is 96 BPM). Optional `layout` (window scale, app height, caption sizes) and `intro` / `outro` cards — the teacher video uses a bigger window and no cards; `layout.appH` must match the capture's `viewport` height. |
| `comp/index.html` | The video page: `render(t)` draws the frame at time t. |
| `render.swift` / `audio.swift` | Frame-by-frame renderer + MP4 writer; the soundtrack synth. |
| `webcopy.swift` | Re-encodes a finished video smaller for the web (H.264, ~1.8 Mbps, index at the front). |

Capture-only tweaks (the app itself is never changed): the "Preview stage" dev panels are hidden, the page is told it's visible so live layouts settle, and clipboard writes are blocked.
