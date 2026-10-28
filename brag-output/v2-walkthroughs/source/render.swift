// Renders a composition page (window.render(t)) frame by frame through WebKit.
//   render <page.html> events <out.json>               sound cues + duration
//   render <page.html> stills <dir> <t1> <t2> …         PNG stills
//   render <page.html> video <out.mp4> [audio.wav]      full video (frame 0 = poster); muxes audio if given
import AppKit
import WebKit
import AVFoundation

let W = 1920, H = 1080, FPS: Int32 = 30
let args = CommandLine.arguments
let page = URL(fileURLWithPath: args[1])

final class Host: NSObject, WKNavigationDelegate {
  let web: WKWebView
  let win: NSWindow
  var loaded: CheckedContinuation<Void, Never>?
  override init() {
    let cfg = WKWebViewConfiguration()
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
    win = NSWindow(contentRect: NSRect(x: -6000, y: -6000, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
    super.init()
    win.contentView = web; win.orderFrontRegardless()
    web.navigationDelegate = self
  }
  func load() async {
    await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
      loaded = c
      web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    }
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded?.resume(); loaded = nil }
  func js(_ s: String) async throws -> Any? { try await web.evaluateJavaScript(s) }
  func frame(_ t: Double) async throws -> CGImage {
    _ = try await web.callAsyncJavaScript("return await (window.renderAsync ? window.renderAsync(t) : (window.render(t), 1));", arguments: ["t": t], in: nil, contentWorld: .page)
    let sc = WKSnapshotConfiguration()
    sc.rect = NSRect(x: 0, y: 0, width: W, height: H); sc.snapshotWidth = NSNumber(value: W); sc.afterScreenUpdates = true
    let img = try await web.takeSnapshot(configuration: sc)
    var r = NSRect(x: 0, y: 0, width: W, height: H)
    return img.cgImage(forProposedRect: &r, context: nil, hints: nil)!
  }
}

func save(_ img: CGImage, _ url: URL, jpeg: Bool) {
  let rep = NSBitmapImageRep(cgImage: img)
  try! (jpeg ? rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) : rep.representation(using: .png, properties: [:]))!.write(to: url)
}
func pixelBuffer(_ img: CGImage, pool: CVPixelBufferPool) -> CVPixelBuffer {
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pb)
  let buf = pb!
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf),
                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  CVPixelBufferUnlockBaseAddress(buf, [])
  return buf
}

@MainActor func run() async {
  let host = Host()
  await host.load()
  do {
    _ = try await host.web.callAsyncJavaScript("return await window.__ready;", arguments: [:], in: nil, contentWorld: .page)
    let total = (try await host.js("window.__total") as? Double) ?? 0
    let poster = (try await host.js("window.__poster") as? Double) ?? 0
    switch args[2] {
    case "events":
      let json = try await host.js("JSON.stringify({total: window.__total, events: window.__events})") as! String
      try json.write(toFile: args[3], atomically: true, encoding: .utf8)
      print("events written, total \(total)s")
    case "stills":
      let dir = URL(fileURLWithPath: args[3])
      for a in args.dropFirst(4) { let t = Double(a)!; save(try await host.frame(t), dir.appendingPathComponent(String(format: "t%06.2f.png", t)), jpeg: false) }
      print("stills done")
    case "video":
      let out = URL(fileURLWithPath: args[3])
      let silent = out.deletingPathExtension().appendingPathExtension("silent.mp4")
      try? FileManager.default.removeItem(at: silent)
      let wr = try AVAssetWriter(outputURL: silent, fileType: .mp4)
      let vin = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 16_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
      vin.expectsMediaDataInRealTime = false
      let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vin, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
      wr.add(vin); wr.startWriting(); wr.startSession(atSourceTime: .zero)
      let frames = Int((total * Double(FPS)).rounded(.down)), t0 = Date()
      for f in 0..<frames {
        // Frame 0 is the poster (a settled, readable frame) so every thumbnail shows it.
        let img = try await host.frame(f == 0 ? poster : Double(f) / Double(FPS))
        while !vin.isReadyForMoreMediaData { try await Task.sleep(nanoseconds: 2_000_000) }
        ad.append(pixelBuffer(img, pool: ad.pixelBufferPool!), withPresentationTime: CMTime(value: CMTimeValue(f), timescale: FPS))
        if f == 0 { save(img, out.deletingPathExtension().appendingPathExtension("jpg"), jpeg: true) }
        if f % 300 == 0 { print("frame \(f)/\(frames) · \(Int(Date().timeIntervalSince(t0)))s") }
      }
      vin.markAsFinished(); await wr.finishWriting()
      if args.count > 4 {
        let comp = AVMutableComposition()
        let va = AVURLAsset(url: silent), aa = AVURLAsset(url: URL(fileURLWithPath: args[4]))
        let vt = try await va.loadTracks(withMediaType: .video)[0], at = try await aa.loadTracks(withMediaType: .audio)[0]
        let dur = try await va.load(.duration), adur = try await aa.load(.duration)
        try comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: vt, at: .zero)
        try comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(dur, adur)), of: at, at: .zero)
        try? FileManager.default.removeItem(at: out)
        let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality)!
        ex.outputURL = out; ex.outputFileType = .mp4
        await ex.export()
        if ex.status != .completed { print("export failed: \(String(describing: ex.error))") } else { try? FileManager.default.removeItem(at: silent) }
      } else { try? FileManager.default.removeItem(at: out); try FileManager.default.moveItem(at: silent, to: out) }
      print("video done in \(Int(Date().timeIntervalSince(t0)))s → \(out.path)")
    default: print("unknown mode")
    }
  } catch { print("error: \(error)") }
  exit(0)
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
Task { @MainActor in await run() }
app.run()
