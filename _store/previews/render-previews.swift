import AppKit
import AVFoundation
import Foundation
import QuartzCore

private let renderSize = CGSize(width: 886, height: 1920)
private let forest = NSColor(calibratedRed: 0.075, green: 0.345, blue: 0.235, alpha: 1)
private let cream = NSColor(calibratedRed: 0.976, green: 0.961, blue: 0.918, alpha: 1)
private let lime = NSColor(calibratedRed: 0.871, green: 0.988, blue: 0.322, alpha: 1)
private let approvedIconURL = URL(fileURLWithPath: #filePath)
  .deletingLastPathComponent()
  .deletingLastPathComponent()
  .appendingPathComponent("icons/kouchd.png")

private struct PreviewSpec {
  let source: URL
  let output: URL
  let eyebrow: String
  let title: String
  let subtitle: String
  let closingTitle: String
  let closingSubtitle: String
  let featureCards: [(time: Double, text: String)]
}

private func textLayer(
  _ text: String,
  frame: CGRect,
  fontSize: CGFloat,
  weight: NSFont.Weight,
  color: NSColor,
  alignment: CATextLayerAlignmentMode = .left
) -> CALayer {
  let layer = CALayer()
  layer.frame = frame
  let scale: CGFloat = 2
  let imageSize = CGSize(width: frame.width * scale, height: frame.height * scale)
  let image = NSImage(size: imageSize, flipped: true) { drawingRect in
    let paragraph = NSMutableParagraphStyle()
    switch alignment {
    case .center: paragraph.alignment = .center
    case .right: paragraph.alignment = .right
    default: paragraph.alignment = .left
    }
    paragraph.lineBreakMode = .byWordWrapping
    let attributes: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: fontSize * scale, weight: weight),
      .foregroundColor: color,
      .paragraphStyle: paragraph,
    ]
    NSAttributedString(string: text, attributes: attributes).draw(
      with: drawingRect,
      options: [.usesLineFragmentOrigin, .usesFontLeading],
      context: nil
    )
    return true
  }
  var imageRect = CGRect(origin: .zero, size: imageSize)
  layer.contents = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil)
  layer.contentsGravity = .resize
  return layer
}

private func holdThenFade(duration: Double, fadeAt: Double) -> CAKeyframeAnimation {
  let animation = CAKeyframeAnimation(keyPath: "opacity")
  animation.values = [1, 1, 0, 0]
  animation.keyTimes = [0, NSNumber(value: fadeAt / duration), NSNumber(value: min((fadeAt + 0.45) / duration, 0.99)), 1]
  animation.duration = duration
  animation.beginTime = AVCoreAnimationBeginTimeAtZero
  animation.isRemovedOnCompletion = false
  animation.fillMode = .forwards
  return animation
}

private func fadeInAtEnd(duration: Double, showAt: Double) -> CAKeyframeAnimation {
  let animation = CAKeyframeAnimation(keyPath: "opacity")
  animation.values = [0, 0, 1, 1]
  animation.keyTimes = [0, NSNumber(value: max(showAt / duration, 0)), NSNumber(value: min((showAt + 0.4) / duration, 0.99)), 1]
  animation.duration = duration
  animation.beginTime = AVCoreAnimationBeginTimeAtZero
  animation.isRemovedOnCompletion = false
  animation.fillMode = .forwards
  return animation
}

private func pulse(duration: Double, at time: Double, visibleFor: Double = 2.2) -> CAKeyframeAnimation {
  let animation = CAKeyframeAnimation(keyPath: "opacity")
  let start = max(time / duration, 0)
  let fadeIn = min((time + 0.25) / duration, 0.98)
  let hold = min((time + visibleFor) / duration, 0.99)
  let fadeOut = min((time + visibleFor + 0.3) / duration, 1)
  animation.values = [0, 0, 1, 1, 0, 0]
  animation.keyTimes = [0, NSNumber(value: start), NSNumber(value: fadeIn), NSNumber(value: hold), NSNumber(value: fadeOut), 1]
  animation.duration = duration
  animation.beginTime = AVCoreAnimationBeginTimeAtZero
  animation.isRemovedOnCompletion = false
  animation.fillMode = .forwards
  return animation
}

private func addBrandMark(to parent: CALayer, y: CGFloat) {
  guard let icon = NSImage(contentsOf: approvedIconURL) else {
    fatalError("Approved Kouchd icon not found at \(approvedIconURL.path)")
  }
  var iconRect = CGRect(origin: .zero, size: icon.size)
  let mark = CALayer()
  mark.frame = CGRect(x: 385, y: y, width: 116, height: 116)
  mark.cornerRadius = 26
  mark.masksToBounds = true
  mark.contents = icon.cgImage(forProposedRect: &iconRect, context: nil, hints: nil)
  mark.contentsGravity = .resizeAspectFill
  parent.addSublayer(mark)
}

private func makeIntro(spec: PreviewSpec, duration: Double) -> CALayer {
  let card = CALayer()
  card.frame = CGRect(origin: .zero, size: renderSize)
  card.backgroundColor = forest.cgColor

  addBrandMark(to: card, y: 330)
  card.addSublayer(textLayer(spec.eyebrow.uppercased(), frame: CGRect(x: 78, y: 535, width: 730, height: 50), fontSize: 27, weight: .bold, color: lime, alignment: .center))
  card.addSublayer(textLayer(spec.title, frame: CGRect(x: 70, y: 625, width: 746, height: 330), fontSize: 82, weight: .black, color: cream, alignment: .center))
  card.addSublayer(textLayer(spec.subtitle, frame: CGRect(x: 92, y: 1005, width: 702, height: 180), fontSize: 37, weight: .medium, color: NSColor.white.withAlphaComponent(0.84), alignment: .center))

  let line = CALayer()
  line.frame = CGRect(x: 318, y: 1260, width: 250, height: 9)
  line.cornerRadius = 4.5
  line.backgroundColor = lime.cgColor
  card.addSublayer(line)

  card.add(holdThenFade(duration: duration, fadeAt: 2.15), forKey: "intro")
  return card
}

private func makeClosing(spec: PreviewSpec, duration: Double) -> CALayer {
  let card = CALayer()
  card.frame = CGRect(origin: .zero, size: renderSize)
  card.backgroundColor = cream.cgColor
  card.opacity = 0

  addBrandMark(to: card, y: 410)
  card.addSublayer(textLayer(spec.closingTitle, frame: CGRect(x: 68, y: 640, width: 750, height: 260), fontSize: 74, weight: .black, color: forest, alignment: .center))
  card.addSublayer(textLayer(spec.closingSubtitle, frame: CGRect(x: 90, y: 965, width: 706, height: 180), fontSize: 36, weight: .semibold, color: NSColor.black.withAlphaComponent(0.72), alignment: .center))

  let wordmark = textLayer("KOUCHD", frame: CGRect(x: 90, y: 1325, width: 706, height: 80), fontSize: 38, weight: .black, color: forest, alignment: .center)
  wordmark.setAffineTransform(CGAffineTransform(scaleX: 1.08, y: 1))
  card.addSublayer(wordmark)
  card.add(fadeInAtEnd(duration: duration, showAt: max(duration - 2.3, 0)), forKey: "closing")
  return card
}

private func makeFeaturePill(text: String, time: Double, duration: Double) -> CALayer {
  let pill = CALayer()
  pill.frame = CGRect(x: 108, y: 1520, width: 670, height: 112)
  pill.cornerRadius = 56
  pill.backgroundColor = forest.cgColor
  pill.borderColor = lime.cgColor
  pill.borderWidth = 4
  pill.shadowColor = NSColor.black.cgColor
  pill.shadowOpacity = 0.18
  pill.shadowRadius = 20
  pill.shadowOffset = CGSize(width: 0, height: 10)
  pill.opacity = 0
  pill.addSublayer(textLayer(text, frame: CGRect(x: 35, y: 27, width: 600, height: 58), fontSize: 34, weight: .bold, color: cream, alignment: .center))
  pill.add(pulse(duration: duration, at: time), forKey: "pulse")
  return pill
}

private func normalizedTransform(for track: AVAssetTrack) -> (CGAffineTransform, CGSize) {
  let natural = track.naturalSize
  let transformedRect = CGRect(origin: .zero, size: natural).applying(track.preferredTransform)
  let orientedSize = CGSize(width: abs(transformedRect.width), height: abs(transformedRect.height))
  var transform = track.preferredTransform
  transform = transform.concatenating(CGAffineTransform(translationX: -transformedRect.minX, y: -transformedRect.minY))

  let scale = max(renderSize.width / orientedSize.width, renderSize.height / orientedSize.height)
  transform = transform.concatenating(CGAffineTransform(scaleX: scale, y: scale))
  let scaledSize = CGSize(width: orientedSize.width * scale, height: orientedSize.height * scale)
  transform = transform.concatenating(CGAffineTransform(
    translationX: (renderSize.width - scaledSize.width) / 2,
    y: (renderSize.height - scaledSize.height) / 2
  ))
  return (transform, scaledSize)
}

private func render(_ spec: PreviewSpec) throws {
  let asset = AVURLAsset(url: spec.source)
  guard let sourceTrack = asset.tracks(withMediaType: .video).first else {
    throw NSError(domain: "KouchdPreview", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track in \(spec.source.path)"])
  }
  let duration = asset.duration
  let seconds = CMTimeGetSeconds(duration)
  guard seconds.isFinite, seconds > 0 else {
    throw NSError(domain: "KouchdPreview", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid duration for \(spec.source.path)"])
  }

  let composition = AVMutableComposition()
  guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    throw NSError(domain: "KouchdPreview", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not create video track"])
  }
  try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceTrack, at: .zero)

  if let sourceAudio = asset.tracks(withMediaType: .audio).first,
     let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try? audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudio, at: .zero)
  }

  let instruction = AVMutableVideoCompositionInstruction()
  instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
  let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
  let (transform, _) = normalizedTransform(for: sourceTrack)
  layerInstruction.setTransform(transform, at: .zero)
  instruction.layerInstructions = [layerInstruction]

  let videoComposition = AVMutableVideoComposition()
  videoComposition.renderSize = renderSize
  videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
  videoComposition.instructions = [instruction]

  let parent = CALayer()
  parent.frame = CGRect(origin: .zero, size: renderSize)
  parent.isGeometryFlipped = true
  let videoLayer = CALayer()
  videoLayer.frame = parent.frame
  parent.addSublayer(videoLayer)
  parent.addSublayer(makeIntro(spec: spec, duration: seconds))
  for feature in spec.featureCards {
    parent.addSublayer(makeFeaturePill(text: feature.text, time: feature.time, duration: seconds))
  }
  parent.addSublayer(makeClosing(spec: spec, duration: seconds))
  videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)

  try? FileManager.default.removeItem(at: spec.output)
  guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    throw NSError(domain: "KouchdPreview", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not create exporter"])
  }
  exporter.outputURL = spec.output
  exporter.outputFileType = .mp4
  exporter.shouldOptimizeForNetworkUse = true
  exporter.videoComposition = videoComposition

  let semaphore = DispatchSemaphore(value: 0)
  exporter.exportAsynchronously { semaphore.signal() }
  semaphore.wait()
  if exporter.status != .completed {
    throw exporter.error ?? NSError(domain: "KouchdPreview", code: 5, userInfo: [NSLocalizedDescriptionKey: "Export failed with status \(exporter.status.rawValue)"])
  }
  print("Rendered \(spec.output.lastPathComponent) — \(String(format: "%.2f", seconds)) seconds")
}

guard CommandLine.arguments.count == 9 else {
  fputs("Usage: render-previews.swift SOURCE OUTPUT EYEBROW TITLE SUBTITLE CLOSING_TITLE CLOSING_SUBTITLE MODE\n", stderr)
  exit(2)
}

let mode = CommandLine.arguments[8]
let cards: [(Double, String)]
switch mode {
case "promo":
  cards = [(9.6, "One shared home"), (12.8, "Clear contributions"), (16.0, "Chores without chasing"), (19.2, "House details together")]
case "host":
  cards = [(6.0, "See what needs attention"), (10.0, "Keep contributions clear"), (14.0, "Share chores fairly"), (18.0, "Manage the stay")]
case "guest":
  cards = [(6.0, "Know what is due"), (10.0, "Record what you contributed"), (14.0, "See your shared chores"), (18.0, "Find every stay detail")]
default:
  cards = []
}

private let spec = PreviewSpec(
  source: URL(fileURLWithPath: CommandLine.arguments[1]),
  output: URL(fileURLWithPath: CommandLine.arguments[2]),
  eyebrow: CommandLine.arguments[3],
  title: CommandLine.arguments[4],
  subtitle: CommandLine.arguments[5],
  closingTitle: CommandLine.arguments[6],
  closingSubtitle: CommandLine.arguments[7],
  featureCards: cards
)

do {
  try render(spec)
} catch {
  fputs("Render failed: \(error.localizedDescription)\n", stderr)
  exit(1)
}
