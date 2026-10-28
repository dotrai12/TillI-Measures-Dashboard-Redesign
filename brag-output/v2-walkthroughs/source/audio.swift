// Soundtrack: one piece, one key (C major), one beat grid (96 BPM); effects snapped to the grid and mixed under the music.
//   audio <events.json> <out.wav>
import Foundation

let SR = 44100.0, BPM = 96.0, BEAT = 60.0 / BPM, BAR = BEAT * 4
let args = CommandLine.arguments
struct Ev: Decodable { let t: Double; let kind: String; let note: Int? }
struct Cues: Decodable { let total: Double; let events: [Ev] }
let cues = try! JSONDecoder().decode(Cues.self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
let total = cues.total, N = Int(total * SR) + 1
var L = [Double](repeating: 0, count: N), R = [Double](repeating: 0, count: N), SEND = [Double](repeating: 0, count: N)

func hz(_ m: Double) -> Double { 440 * pow(2, (m - 69) / 12) }
var seed: UInt64 = 0x9E3779B97F4A7C15
func noise() -> Double { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; return Double(seed % 20000) / 10000 - 1 }
func add(_ start: Double, _ dur: Double, vol: Double, pan: Double = 0, send: Double = 0.2, _ f: (Double) -> Double) {
  let s0 = max(0, Int(start * SR)), s1 = min(N, Int((start + dur) * SR)); if s1 <= s0 { return }
  let gl = vol * sqrt(0.5 * (1 - pan)), gr = vol * sqrt(0.5 * (1 + pan))
  for i in s0..<s1 { let x = f(Double(i) / SR - start); L[i] += x * gl; R[i] += x * gr; SEND[i] += x * vol * send }
}
func pluck(_ t: Double, _ m: Double, _ v: Double, pan: Double = 0, decay: Double = 0.42) {
  let f = hz(m)
  add(t, decay * 5, vol: v, pan: pan, send: 0.28) { x in min(1, x / 0.004) * (sin(2 * .pi * f * x) * exp(-x / decay) + 0.22 * sin(2 * .pi * f * 3.93 * x) * exp(-x / 0.06)) }
}
func bell(_ t: Double, _ m: Double, _ v: Double, pan: Double = 0) {
  let f = hz(m)
  add(t, 2.6, vol: v, pan: pan, send: 0.45) { x in min(1, x / 0.003) * (sin(2 * .pi * f * x) * exp(-x / 0.9) + 0.35 * sin(2 * .pi * f * 2.76 * x) * exp(-x / 0.35) + 0.12 * sin(2 * .pi * f * 5.4 * x) * exp(-x / 0.12)) }
}
func pad(_ t: Double, _ dur: Double, _ ms: [Double], _ v: Double) {
  add(t, dur + 0.8, vol: v, send: 0.5) { x in
    let a = min(1, x / 0.45) * (x > dur ? exp(-(x - dur) / 0.3) : 1)
    var s = 0.0
    for (k, m) in ms.enumerated() { let f = hz(m); s += sin(2 * .pi * f * x + Double(k)) + 0.5 * sin(2 * .pi * (f * 1.003) * x) + 0.18 * sin(2 * .pi * f * 2 * x) }
    return a * s / Double(ms.count * 2)
  }
}
func bass(_ t: Double, _ m: Double, _ v: Double, _ dur: Double) {
  let f = hz(m)
  add(t, dur + 0.2, vol: v, send: 0.05) { x in min(1, x / 0.008) * exp(-x / 0.55) * (x > dur ? exp(-(x - dur) / 0.05) : 1) * (sin(2 * .pi * f * x) + 0.25 * sin(4 * .pi * f * x)) }
}
func kick(_ t: Double, _ v: Double) {
  add(t, 0.35, vol: v, send: 0.02) { x in sin(2 * .pi * (48 * x + 62 * 0.035 * (1 - exp(-x / 0.035)))) * exp(-x / 0.16) * min(1, x / 0.002) }
}
func shaker(_ t: Double, _ v: Double) { var prev = 0.0; add(t, 0.09, vol: v, pan: 0.25, send: 0.1) { x in let n = noise(), h = n - prev; prev = n; return h * exp(-x / 0.025) } }
func snap(_ t: Double, _ v: Double) { var prev = 0.0; add(t, 0.2, vol: v, pan: -0.15, send: 0.3) { x in let n = noise(), b = n - 0.6 * prev; prev = n; return b * exp(-x / 0.03) + 0.5 * sin(2 * .pi * 820 * x) * exp(-x / 0.02) } }
func click(_ t: Double, _ v: Double) { add(t, 0.06, vol: v, pan: 0.2, send: 0.1) { x in sin(2 * .pi * 2600 * x) * exp(-x / 0.008) + 0.4 * noise() * exp(-x / 0.004) } }
func swoosh(_ t: Double, _ v: Double) { var lp = 0.0; add(t, 0.45, vol: v, send: 0.4) { x in let k = 0.05 + 0.5 * x / 0.45; lp += k * (noise() - lp); return lp * sin(.pi * x / 0.45) } }

// ---- music: I–V–vi–IV in C, one chord per bar; soft intro bars, tonic rings at the end ----
let CH: [[Double]] = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
let ROOT: [Double] = [36, 43, 45, 41]
let ARP: [[Int]] = [[0, 1, 2, 1, 3, 2, 1, 2], [0, 2, 1, 2, 3, 1, 2, 1]]
let bars = Int((total / BAR).rounded(.up))
for b in 0..<bars {
  let t = Double(b) * BAR, c = b % 4, tones = CH[c]
  let last = t + BAR > total - 0.01, intro = b < 2, outro = b >= bars - 3
  if last {
    pad(t, total - t - 0.3, [60, 64, 67, 72], 0.10)
    bell(t, 72, 0.09); bell(t + BEAT, 76, 0.06, pan: 0.3); bell(t + BEAT * 2, 79, 0.05, pan: -0.3)
    bass(t, 36, 0.20, BEAT * 3); kick(t, 0.15)
    continue
  }
  pad(t, BAR, tones.map { $0 + 12 }, intro ? 0.09 : 0.085)
  let pat = ARP[(b / 4) % 2]
  for e in 0..<8 {
    if intro && e % 2 == 1 { continue }
    let idx = pat[e], m = idx < 3 ? tones[idx] + 12 : tones[0] + 24
    pluck(t + Double(e) * BEAT / 2, m, 0.13 * (e == 0 ? 0.9 : e % 2 == 0 ? 0.78 : 0.62), pan: e % 2 == 0 ? -0.2 : 0.2)
  }
  if !intro {
    bass(t, ROOT[c], 0.20, BEAT * 1.6); bass(t + BEAT * 2, ROOT[c], 0.17, BEAT * 0.9); bass(t + BEAT * 3.5, ROOT[c] + 7, 0.11, BEAT * 0.4)
    kick(t, 0.17); kick(t + BEAT * 2, 0.13)
    snap(t + BEAT, outro ? 0.05 : 0.07); snap(t + BEAT * 3, outro ? 0.05 : 0.07)
    for e in 0..<8 where e % 2 == 1 { shaker(t + Double(e) * BEAT / 2, 0.028) }
  } else if b == 1 { kick(t + BEAT * 3.5, 0.18) }
}

// ---- effects: same key, snapped to the 32nd-note grid, under the music ----
let PENTA: [Double] = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]
let grid = BEAT / 8
func q(_ t: Double) -> Double { (t / grid).rounded() * grid }
for ev in cues.events {
  let t = q(ev.t), n = ev.note ?? 0
  switch ev.kind {
  case "pop": pluck(t, PENTA[n % 10], 0.045, pan: Double(n % 5) * 0.2 - 0.4, decay: 0.25)
  case "chime": bell(t, [72.0, 76, 79][n % 3], 0.048)
  case "pluck": pluck(t, PENTA[(n + 2) % 10], 0.06, pan: 0.2)
  case "click": click(t, 0.09)
  case "tick": pluck(t, PENTA[n % 10] + 12, 0.035, decay: 0.06)
  case "success": bell(t, 79, 0.065); bell(t + BEAT / 2, 84, 0.07)
  case "send": swoosh(t - 0.2, 0.04)
  case "soft": bell(t, 67, 0.06)
  default: break
  }
}

// ---- reverb send (4 combs + 2 allpasses), soft clip, normalise to −1 dBFS ----
func comb(_ x: [Double], _ d: Int, _ g: Double) -> [Double] { var y = [Double](repeating: 0, count: x.count); for i in 0..<x.count { y[i] = x[i] + (i >= d ? g * y[i - d] : 0) }; return y }
func allpass(_ x: [Double], _ d: Int, _ g: Double) -> [Double] { var y = [Double](repeating: 0, count: x.count); for i in 0..<x.count { let xd = i >= d ? x[i - d] : 0, yd = i >= d ? y[i - d] : 0; y[i] = -g * x[i] + xd + g * yd }; return y }
var wet = [Double](repeating: 0, count: N)
for (d, g) in [(1557, 0.80), (1617, 0.79), (1491, 0.81), (1422, 0.80)] { let c = comb(SEND, d, g); for i in 0..<N { wet[i] += c[i] * 0.25 } }
wet = allpass(allpass(wet, 225, 0.5), 556, 0.5)
let wetR = [Double](repeating: 0, count: 120) + wet.dropLast(120)
var peak = 0.0
for i in 0..<N {
  let t = Double(i) / SR, fade = min(1, t / 0.03) * (t > total - 1.6 ? max(0, (total - t) / 1.6) : 1)
  L[i] = tanh((L[i] + 0.22 * wet[i]) * 1.1) * fade; R[i] = tanh((R[i] + 0.22 * wetR[i]) * 1.1) * fade
  peak = max(peak, abs(L[i]), abs(R[i]))
}
let gain = 0.89 / max(peak, 1e-6)
var data = Data()
func u32(_ v: UInt32) { var x = v.littleEndian; data.append(Data(bytes: &x, count: 4)) }
func u16(_ v: UInt16) { var x = v.littleEndian; data.append(Data(bytes: &x, count: 2)) }
data.append("RIFF".data(using: .ascii)!); u32(UInt32(36 + N * 4)); data.append("WAVEfmt ".data(using: .ascii)!)
u32(16); u16(1); u16(2); u32(UInt32(SR)); u32(UInt32(SR) * 4); u16(4); u16(16)
data.append("data".data(using: .ascii)!); u32(UInt32(N * 4))
var pcm = [Int16](repeating: 0, count: N * 2)
for i in 0..<N { pcm[2 * i] = Int16(max(-1, min(1, L[i] * gain)) * 32767); pcm[2 * i + 1] = Int16(max(-1, min(1, R[i] * gain)) * 32767) }
pcm.withUnsafeBufferPointer { data.append(Data(buffer: $0)) }
try! data.write(to: URL(fileURLWithPath: args[2]))
print("wrote \(args[2]) · \(String(format: "%.1f", total))s")
