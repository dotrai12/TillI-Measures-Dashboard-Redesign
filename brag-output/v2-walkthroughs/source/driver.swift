// Drives the REAL Tilli Measures pages offscreen and screenshots each state.
//   driver <script.json> <outdir>
// script: { "viewport": [1440, 900], "hide": "css to hide dev scaffolding",
//           "steps": [ {"goto": "admin.html?…"}, {"wait": 800}, {"waitFor": "#sel"},
//                      {"js": "document.querySelector('…').click()"}, {"shot": "name"},
//                      {"shot": "name", "full": true}, {"rect": "name", "sel": "#sel"},
//                      {"log": "js expression"},
//                      {"shot": "name", "scroll": "doc" | "#scroller", "channel": "modal"},
//                      {"rect": "name", "sel": "#sel", "scroll": "doc" | "#scroller", "channel": "modal"} ] }
// A "scroll" shot also writes <shot>@s.png: the scrolling area (the page below the sticky header and
// right of the sidebar, or an inner scroller) captured strip by strip and joined into one tall image.
// rects.json gets "<shot>@s": [clipX, clipY, clipW, clipH, maxScroll, channel]. A "scroll" rect is
// stored in scrolled-content coordinates, [x, y + scroll, w, h, channel], so the video can follow it.
// Run it from the project root; paths in "goto" are relative to it. Every run starts from a fresh,
// empty data store, so the app seeds the same demo schools each time.
// Writes <outdir>/<shot>.png (2× pixels) and <outdir>/rects.json (CSS px, page coordinates).
import AppKit
import WebKit

let args = CommandLine.arguments
let script = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[1]))) as! [String: Any]
let outDir = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let project = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)   // run from the project root
let vp = (script["viewport"] as? [Double]) ?? [1440, 900]
let chrome = (script["chrome"] as? [String]) ?? [".dash-side", ".dash-header"]   // sticky sidebar, sticky header
// What "doc" scrolls: the window, or the app's own full-screen scroller (the teacher dashboard's #dash-root).
let docEl = script["docScroller"] as? String
let docTop = docEl.map { "document.querySelector(\(String(reflecting: $0))).scrollTop" } ?? "window.scrollY"
let docMax = docEl.map { "(function(e){return e.scrollHeight-e.clientHeight})(document.querySelector(\(String(reflecting: $0))))" } ?? "(document.documentElement.scrollHeight-innerHeight)"
func docTo(_ p: Double) -> String { docEl.map { "(function(e){e.scrollTop=\(p);return e.scrollTop})(document.querySelector(\(String(reflecting: $0))))" } ?? "(function(){window.scrollTo({top:\(p),behavior:'instant'});return window.scrollY})()" }

final class Driver: NSObject, WKNavigationDelegate {
  let web: WKWebView
  let win: NSWindow
  var done: CheckedContinuation<Void, Never>?
  override init() {
    let cfg = WKWebViewConfiguration()
    cfg.websiteDataStore = .nonPersistent()
    cfg.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
    // The page is offscreen, so it reports itself hidden and the app pauses its live
    // layouts. Tell it it's visible (capture only — the app itself isn't changed).
    cfg.userContentController.addUserScript(WKUserScript(source: "Object.defineProperty(document,'hidden',{get:function(){return false}});Object.defineProperty(document,'visibilityState',{get:function(){return 'visible'}});try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(){return Promise.resolve()},write:function(){return Promise.resolve()}}});document.execCommand=function(){return true};}catch(e){}(function pump(){requestAnimationFrame(pump)})();", injectionTime: .atDocumentStart, forMainFrameOnly: true))
    // Keep animation frames ticking once the page has loaded (a pump started at
    // document start can be dropped, which freezes the app's live layouts).
    cfg.userContentController.addUserScript(WKUserScript(source: "(function pump(){requestAnimationFrame(pump)})();window.addEventListener('load',function(){(function p2(){requestAnimationFrame(p2)})();});", injectionTime: .atDocumentEnd, forMainFrameOnly: true))
    if let css = script["hide"] as? String {
      let js = "(function(){var s=document.createElement('style');s.textContent=\(String(reflecting: css));document.documentElement.appendChild(s);})();"
      cfg.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
    }
    // Offscreen windows count as hidden, and WebKit pauses hidden pages' animation
    // frames and timers — the app's live layouts (the Overview graph) would never
    // settle. Turn that off where this WebKit allows it.
    for sel in ["_setHiddenPageDOMTimerThrottlingEnabled:", "_setHiddenPageDOMTimerThrottlingAutoIncreases:", "_setPageVisibilityBasedProcessSuppressionEnabled:", "_setHiddenPageCSSAnimationSuspensionEnabled:"] {
      let s = NSSelectorFromString(sel)
      if cfg.preferences.responds(to: s) { cfg.preferences.perform(s, with: NSNumber(value: false)) }
    }
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: vp[0], height: vp[1]), configuration: cfg)
    let occ = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
    if web.responds(to: occ) { web.perform(occ, with: NSNumber(value: false)) }
    win = NSWindow(contentRect: NSRect(x: -8000, y: -8000, width: vp[0], height: vp[1]), styleMask: [.borderless], backing: .buffered, defer: false)
    super.init()
    win.contentView = web; win.orderFrontRegardless()
    web.navigationDelegate = self
  }
  func goto(_ rel: String) async {
    let parts = rel.split(separator: "?", maxSplits: 1).map(String.init)
    var comps = URLComponents(url: project.appendingPathComponent(parts[0]), resolvingAgainstBaseURL: false)!
    if parts.count > 1 { comps.percentEncodedQuery = parts[1].components(separatedBy: "#")[0] }
    if let h = rel.components(separatedBy: "#").dropFirst().first { comps.fragment = h }
    await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
      done = c
      web.loadFileURL(comps.url!, allowingReadAccessTo: project)
    }
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { done?.resume(); done = nil }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { print("nav error \(error)"); done?.resume(); done = nil }
  func snap() async throws -> CGImage {
    let sc = WKSnapshotConfiguration(); sc.rect = NSRect(x: 0, y: 0, width: vp[0], height: vp[1]); sc.afterScreenUpdates = true
    let img = try await web.takeSnapshot(configuration: sc)
    var r = NSRect(x: 0, y: 0, width: img.size.width, height: img.size.height)
    return img.cgImage(forProposedRect: &r, context: nil, hints: nil)!
  }
  func settle(_ ms: Double) async throws {
    var left = ms
    while left > 0 { let c = min(left, 250); try await Task.sleep(nanoseconds: UInt64(c * 1_000_000)); left -= c
      _ = try? await web.evaluateJavaScript("if(!window.__pump){window.__pump=1;(function f(){requestAnimationFrame(f)})();}1") }
  }
  // Scrolls the page (or an inner scroller) a screen at a time, crops the scrolling area out of
  // each screenshot and stacks the strips into one tall image of everything that scrolls.
  func scrollShot(_ name: String, scroller: String, channel: String) async throws -> [Any]? {
    let doc = scroller == "doc", q = String(reflecting: scroller)
    let geo = doc
      ? "(function(){var a=document.querySelector(\(String(reflecting: chrome[0]))),h=document.querySelector(\(String(reflecting: chrome[1])));var x=a?a.getBoundingClientRect().right:0,y=h?Math.max(0,h.getBoundingClientRect().bottom):0;return [x,y,innerWidth-x,innerHeight-y,Math.max(0,\(docMax))];})()"
      : "(function(){var e=document.querySelector(\(q));if(!e)return null;var r=e.getBoundingClientRect();return [r.left+e.clientLeft,r.top+e.clientTop,e.clientWidth,e.clientHeight,Math.max(0,e.scrollHeight-e.clientHeight)];})()"
    guard let g = try await web.evaluateJavaScript(geo) as? [Double] else { print("scroll target not found: \(scroller)"); return nil }
    let (cx, cy, cw, maxS) = (g[0], g[1], g[2], g[4]), ch = min(g[3], vp[1] - g[1])
    let to = { (p: Double) in doc ? docTo(p)
                                   : "(function(){var e=document.querySelector(\(q));e.scrollTop=\(p);return e.scrollTop;})()" }
    var pos: [Double] = []; var p = 0.0
    while p < maxS { pos.append(p); p += ch - 40 }          // 40px overlap between strips
    pos.append(maxS)
    var ctx: CGContext? = nil, sc = 2.0, H = 0
    for want in pos {
      _ = try await web.evaluateJavaScript(to(want)); try await settle(400)
      let at = (try await web.evaluateJavaScript(to(want)) as? Double) ?? want
      let img = try await snap()
      if ctx == nil {
        sc = Double(img.width) / vp[0]; H = Int(((maxS + ch) * sc).rounded())
        ctx = CGContext(data: nil, width: Int((cw * sc).rounded()), height: H, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        ctx!.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1)); ctx!.fill(CGRect(x: 0, y: 0, width: ctx!.width, height: H))
      }
      let strip = img.cropping(to: CGRect(x: cx * sc, y: cy * sc, width: cw * sc, height: ch * sc))!
      ctx!.draw(strip, in: CGRect(x: 0, y: Double(H) - (at + ch) * sc, width: Double(strip.width), height: Double(strip.height)))
    }
    try NSBitmapImageRep(cgImage: ctx!.makeImage()!).representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name + "@s.png"))
    _ = try await web.evaluateJavaScript(to(0)); try await settle(300)
    return [cx, cy, cw, ch, maxS, channel]
  }
  func shot(_ name: String, full: Bool) async throws {
    var h = vp[1]
    if full, let dh = try await web.evaluateJavaScript("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)") as? Double { h = max(vp[1], dh) }
    if full { web.setFrameSize(NSSize(width: vp[0], height: h)); try await Task.sleep(nanoseconds: 400_000_000) }
    let sc = WKSnapshotConfiguration(); sc.rect = NSRect(x: 0, y: 0, width: vp[0], height: h); sc.afterScreenUpdates = true
    let img = try await web.takeSnapshot(configuration: sc)
    var r = NSRect(x: 0, y: 0, width: img.size.width, height: img.size.height)
    let cg = img.cgImage(forProposedRect: &r, context: nil, hints: nil)!
    try NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name + ".png"))
    if full { web.setFrameSize(NSSize(width: vp[0], height: vp[1])) }
  }
}

@MainActor func run() async {
  let d = Driver()
  var rects: [String: Any] = [:]
  for (i, st) in ((script["steps"] as? [[String: Any]]) ?? []).enumerated() {
    do {
      if let g = st["goto"] as? String { await d.goto(g) }
      // Keep animation frames ticking on whatever page is loaded (fresh loads and
      // app-driven navigations included) so live layouts settle.
      _ = try? await d.web.evaluateJavaScript("if(!window.__pump){window.__pump=1;(function f(){requestAnimationFrame(f)})();}1")
      if let w = st["wait"] as? Double {
        var left = w
        while left > 0 { let c = min(left, 250); try await Task.sleep(nanoseconds: UInt64(c * 1_000_000)); left -= c
          _ = try? await d.web.evaluateJavaScript("if(!window.__pump){window.__pump=1;(function f(){requestAnimationFrame(f)})();}1") }
      }
      if let sel = st["waitFor"] as? String {
        for _ in 0..<100 { if (try await d.web.evaluateJavaScript("!!document.querySelector(\(String(reflecting: sel)))") as? Bool) == true { break }; try await Task.sleep(nanoseconds: 100_000_000) }
      }
      if let js = st["js"] as? String { _ = try await d.web.evaluateJavaScript("(function(){" + js + "\n;return 1;})()") }
      if let s = st["log"] as? String { print("[\(i)] \(String(describing: try await d.web.evaluateJavaScript(s)))") }
      if let n = st["rect"] as? String, let sel = st["sel"] as? String {
        let js = "(function(){var e=document.querySelector(\(String(reflecting: sel)));if(!e)return null;var r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];})()"
        if let r = try await d.web.evaluateJavaScript(js) as? [Double] {
          if let sc = st["scroll"] as? String {          // content coordinates: add the current scroll
            let off = (try await d.web.evaluateJavaScript(sc == "doc" ? docTop : "document.querySelector(\(String(reflecting: sc))).scrollTop") as? Double) ?? 0
            rects[n] = [r[0], r[1] + off, r[2], r[3], (st["channel"] as? String) ?? (sc == "doc" ? "doc" : sc)] as [Any]
          } else { rects[n] = r }
        } else { print("[\(i)] rect not found: \(sel)") }
      }
      if let n = st["shot"] as? String {
        if let sc = st["scroll"] as? String {             // base screenshot at the top, then the tall scrolling area
          _ = try await d.web.evaluateJavaScript(sc == "doc" ? docTo(0) : "document.querySelector(\(String(reflecting: sc))).scrollTop=0;1")
          try await d.settle(300)
          try await d.shot(n, full: false)
          if let g = try await d.scrollShot(n, scroller: sc, channel: (st["channel"] as? String) ?? (sc == "doc" ? "doc" : sc)) { rects[n + "@s"] = g }
        } else { try await d.shot(n, full: (st["full"] as? Bool) ?? false) }
      }
    } catch { print("[\(i)] error: \(error)") }
  }
  let data = try! JSONSerialization.data(withJSONObject: rects, options: [.prettyPrinted, .sortedKeys])
  try! data.write(to: outDir.appendingPathComponent("rects.json"))
  print("done → \(outDir.path)")
  exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
Task { @MainActor in await run() }
app.run()
