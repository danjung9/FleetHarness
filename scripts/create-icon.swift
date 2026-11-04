import AppKit
let size: CGFloat = 1024
let image = NSImage(size: NSSize(width:size,height:size))
image.lockFocus()
NSColor(calibratedRed:21/255,green:22/255,blue:19/255,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:24,y:24,width:976,height:976),xRadius:210,yRadius:210).fill()
NSColor(calibratedRed:237/255,green:166/255,blue:110/255,alpha:1).setStroke()
let lines = NSBezierPath()
lines.lineWidth = 64
lines.lineCapStyle = .square
lines.lineJoinStyle = .round
// Match the AY letterforms in src/Mark.tsx and public/favicon.svg.
let scale: CGFloat = 24
let offset: CGFloat = 80
func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint {
    NSPoint(x: offset + x * scale, y: size - offset - y * scale)
}
lines.move(to:point(5,28));lines.line(to:point(11,8));lines.line(to:point(17,28))
lines.move(to:point(7.4,20));lines.line(to:point(14.6,20))
lines.move(to:point(21,8));lines.line(to:point(26,18));lines.line(to:point(31,8))
lines.move(to:point(26,18));lines.line(to:point(26,28))
lines.stroke()
image.unlockFocus()
let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
