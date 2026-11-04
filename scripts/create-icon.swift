// Compatibility entry point for the original icon script.
// Master artwork is maintained in branding/; npm run icons syncs all variants.
import Foundation

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let source = root.appendingPathComponent("branding/app-icon-1024.png")
let destination = CommandLine.arguments.count > 1
    ? URL(fileURLWithPath: CommandLine.arguments[1])
    : root.appendingPathComponent("build/icon.png")
try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
try Data(contentsOf: source).write(to: destination)
