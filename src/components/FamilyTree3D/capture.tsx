import { useImperativeHandle, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'

export interface CaptureHandle {
  /** The canvas as it is drawn right now, as a PNG data URL. */
  capture: () => string
}

/**
 * Lives inside a <Canvas> (which must keep its drawing buffer) and lets the
 * page grab an image of whatever it is showing. For a sharper-than-screen
 * image, raise the canvas `dpr` first and wait a few frames.
 */
export function CaptureBridge({ handle }: { handle: RefObject<CaptureHandle> }) {
  const gl = useThree((s) => s.gl)
  useImperativeHandle(handle, () => ({ capture: () => gl.domElement.toDataURL('image/png') }), [gl])
  return null
}

/** Pixel ratio that brings a view of this CSS size up to poster resolution. */
export function posterDpr(width: number, height: number, maxSize = 4096): number {
  return Math.max(1, Math.min(4, maxSize / Math.max(width, height, 1)))
}

export interface PosterText {
  eyebrow: string
  heading: string
  line?: string
  sub?: string
  footer: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Lay the title and caption over a captured view and return a PNG blob. */
export async function composePoster(dataUrl: string, text: PosterText): Promise<Blob> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const w = canvas.width
  const h = canvas.height
  const u = Math.min(w, h) / 100 // layout unit
  const pad = u * 5

  // Darken the edges the text sits on.
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.3)
  top.addColorStop(0, 'rgba(5, 6, 13, 0.85)')
  top.addColorStop(1, 'rgba(5, 6, 13, 0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, w, h * 0.3)
  const bottom = ctx.createLinearGradient(0, h * 0.75, 0, h)
  bottom.addColorStop(0, 'rgba(5, 6, 13, 0)')
  bottom.addColorStop(1, 'rgba(5, 6, 13, 0.9)')
  ctx.fillStyle = bottom
  ctx.fillRect(0, h * 0.75, w, h * 0.25)

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#E8C170'
  ctx.font = `600 ${u * 1.5}px Inter, sans-serif`
  ctx.fillText(text.eyebrow.toUpperCase().split('').join('  '), pad, pad)

  ctx.fillStyle = '#F6F1E4'
  let headingSize = u * 6.5
  ctx.font = `600 ${headingSize}px "Cormorant Garamond", Georgia, serif`
  while (ctx.measureText(text.heading).width > w - pad * 2 && headingSize > u * 2.5) {
    headingSize *= 0.92
    ctx.font = `600 ${headingSize}px "Cormorant Garamond", Georgia, serif`
  }
  ctx.fillText(text.heading, pad, pad + u * 2.6)

  ctx.textBaseline = 'alphabetic'
  let y = h - pad
  ctx.fillStyle = '#6F7693'
  ctx.font = `500 ${u * 1.4}px Inter, sans-serif`
  ctx.fillText(text.footer, pad, y)
  y -= u * 3
  if (text.sub) {
    ctx.fillStyle = '#9AA1BD'
    ctx.font = `400 ${u * 1.9}px Inter, sans-serif`
    ctx.fillText(text.sub, pad, y)
    y -= u * 3.4
  }
  if (text.line) {
    ctx.fillStyle = '#F6F1E4'
    let lineSize = u * 3.6
    ctx.font = `600 ${lineSize}px "Cormorant Garamond", Georgia, serif`
    while (ctx.measureText(text.line).width > w - pad * 2 && lineSize > u * 1.8) {
      lineSize *= 0.92
      ctx.font = `600 ${lineSize}px "Cormorant Garamond", Georgia, serif`
    }
    ctx.fillText(text.line, pad, y)
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Poster failed'))), 'image/png'),
  )
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
