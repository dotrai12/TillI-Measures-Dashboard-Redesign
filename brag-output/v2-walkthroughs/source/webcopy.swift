// Re-encodes a finished video into a smaller copy for a web page.
//   webcopy <in.mp4> <out.mp4> [video kbps, default 1800]
// H.264 High (plays in every browser), same 1920×1080 / 30 fps, keyframe every 2 s, AAC 96 kbps,
// and the index at the front of the file so a browser can start playing before it has all of it.
import AVFoundation

let a = CommandLine.arguments
let src = AVURLAsset(url: URL(fileURLWithPath: a[1])), out = URL(fileURLWithPath: a[2])
let kbps = a.count > 3 ? Int(a[3])! : 1800
try? FileManager.default.removeItem(at: out)

let reader = try! AVAssetReader(asset: src)
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

let sem = DispatchSemaphore(value: 0)
var vTrack: AVAssetTrack!, aTrack: AVAssetTrack?
Task { vTrack = try! await src.loadTracks(withMediaType: .video)[0]; aTrack = try? await src.loadTracks(withMediaType: .audio).first; sem.signal() }
sem.wait()

let vOut = AVAssetReaderTrackOutput(track: vTrack, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
reader.add(vOut)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 1920, AVVideoHeightKey: 1080,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: kbps * 1000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoH264EntropyModeKey: AVVideoH264EntropyModeCABAC, AVVideoMaxKeyFrameIntervalKey: 60,
                                    AVVideoExpectedSourceFrameRateKey: 30]])
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)

var pairs: [(AVAssetReaderTrackOutput, AVAssetWriterInput)] = [(vOut, vIn)]
if let at = aTrack {
  let aOut = AVAssetReaderTrackOutput(track: at, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2,
    AVLinearPCMBitDepthKey: 16, AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
  reader.add(aOut)
  let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 96_000])
  aIn.expectsMediaDataInRealTime = false
  writer.add(aIn); pairs.append((aOut, aIn))
}

reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let group = DispatchGroup()
for (i, (o, w)) in pairs.enumerated() {
  group.enter()
  let q = DispatchQueue(label: "copy\(i)")
  w.requestMediaDataWhenReady(on: q) {
    while w.isReadyForMoreMediaData {
      if let s = o.copyNextSampleBuffer() { w.append(s) } else { w.markAsFinished(); group.leave(); return }
    }
  }
}
group.wait()
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status != .completed { print("failed: \(String(describing: writer.error))"); exit(1) }
let mb = Double((try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? Int) ?? 0) / 1_048_576
print(String(format: "wrote %@ · %.1f MB", out.lastPathComponent, mb))
