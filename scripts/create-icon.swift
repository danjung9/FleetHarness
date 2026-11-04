import AppKit
let size: CGFloat = 1024
let image = NSImage(size: NSSize(width:size,height:size))
image.lockFocus()
NSColor(calibratedRed:16/255,green:36/255,blue:55/255,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:24,y:24,width:976,height:976),xRadius:210,yRadius:210).fill()
NSColor(calibratedRed:1,green:112/255,blue:72/255,alpha:1).setStroke()
let lines = NSBezierPath()
lines.lineWidth = 48
lines.lineCapStyle = .round
for y in [CGFloat(275),512,749] { lines.move(to:NSPoint(x:238,y:y));lines.line(to:NSPoint(x:y == 512 ? 650 : 786,y:y)) }
for x in [CGFloat(380),650] { lines.move(to:NSPoint(x:x,y:275));lines.line(to:NSPoint(x:x,y:749)) }
lines.stroke()
let circle=NSBezierPath(ovalIn:NSRect(x:568,y:430,width:164,height:164))
NSColor(calibratedRed:16/255,green:36/255,blue:55/255,alpha:1).setFill()
circle.fill();circle.lineWidth=44;circle.stroke()
image.unlockFocus()
let rep=NSBitmapImageRep(data:image.tiffRepresentation!)!
try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
