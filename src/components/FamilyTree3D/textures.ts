import * as THREE from 'three'

export const DISPLAY_FONT = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
const UI_FONT = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'

function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines

  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1)
  }
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}

export const LABEL_ASPECT = 3

/** Name (up to two lines) with the lifespan beneath, on a transparent canvas. */
export function makeLabelTexture(
  name: string,
  years: string | null,
  /** Draw a dark plate behind the text so lines passing under it can't cross the name. */
  plate = false,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 600 / LABEL_ASPECT
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const nameFont = `600 50px ${DISPLAY_FONT}`
  const yearsFont = `500 25px ${UI_FONT}`
  ctx.font = nameFont
  const lines = wrapLines(ctx, name, 570, 2)
  const firstY = lines.length === 1 ? 62 : 42
  const yearsY = lines.length === 1 ? 118 : 152

  if (plate) {
    let width = Math.max(...lines.map((line) => ctx.measureText(line).width))
    if (years) {
      ctx.font = yearsFont
      width = Math.max(width, ctx.measureText(years).width)
    }
    width = Math.min(596, width + 40)
    const top = firstY - 34
    const bottom = years ? yearsY + 24 : firstY + (lines.length - 1) * 52 + 34
    ctx.fillStyle = 'rgba(7, 9, 20, 0.9)'
    ctx.beginPath()
    ctx.roundRect(300 - width / 2, top, width, bottom - top, 18)
    ctx.fill()
  }

  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
  ctx.shadowBlur = 10
  ctx.font = nameFont
  ctx.fillStyle = '#F6F1E4'
  lines.forEach((line, i) => ctx.fillText(line, 300, firstY + i * 52))

  if (years) {
    ctx.font = yearsFont
    ctx.fillStyle = 'rgba(214, 219, 240, 0.72)'
    ctx.fillText(years, 300, yearsY)
  }
  return canvasTexture(canvas)
}

const SKIP_WORDS = new Set(['of', 'the', 'de', 'von', 'van', 'da', 'di', 'du', 'la', 'le'])

function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => w && !SKIP_WORDS.has(w.toLowerCase()) && !/^[IVXLC]+\.?$/.test(w))
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return picked.map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Stand-in for people without a portrait. */
export function makeMonogramTexture(name: string, color: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const bg = ctx.createRadialGradient(size / 2, size * 0.4, 10, size / 2, size / 2, size * 0.7)
  bg.addColorStop(0, '#262B47')
  bg.addColorStop(1, '#0C0F1D')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  ctx.font = `600 104px ${DISPLAY_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.globalAlpha = 0.9
  ctx.fillText(initialsOf(name), size / 2, size / 2 + 6)
  return canvasTexture(canvas)
}

let glowTexture: THREE.CanvasTexture | null = null

/** Soft radial falloff, shared by every halo. */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.32)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.07)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  glowTexture = canvasTexture(canvas)
  return glowTexture
}

let plusTexture: THREE.CanvasTexture | null = null

/** Round "+" button face, shared by every expand button. */
export function getPlusTexture(): THREE.CanvasTexture {
  if (plusTexture) return plusTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
  ctx.fillStyle = '#0E1122'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#FFFFFF'
  ctx.stroke()
  ctx.lineCap = 'round'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(size / 2, 36)
  ctx.lineTo(size / 2, size - 36)
  ctx.moveTo(36, size / 2)
  ctx.lineTo(size - 36, size / 2)
  ctx.stroke()
  plusTexture = canvasTexture(canvas)
  return plusTexture
}

let crownTexture: THREE.CanvasTexture | null = null

/** A small gold crown, drawn rather than relying on a font glyph. */
export function getCrownTexture(): THREE.CanvasTexture {
  if (crownTexture) return crownTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#FFFFFF'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(18, 92)
  ctx.lineTo(12, 40)
  ctx.lineTo(40, 64)
  ctx.lineTo(64, 24)
  ctx.lineTo(88, 64)
  ctx.lineTo(116, 40)
  ctx.lineTo(110, 92)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(18, 98, 92, 10)
  for (const [x, y] of [[12, 36], [64, 20], [116, 36]]) {
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  crownTexture = canvasTexture(canvas)
  return crownTexture
}

const COMMONS_API ='https://commons.wikimedia.org/w/api.php'
const FILE_PATH_MARKER = 'Special:FilePath/'
const thumbCache = new Map<string, Promise<string | null>>()

/**
 * WebGL needs images served with CORS headers. The Special:FilePath redirect
 * has none, so ask the Commons API for the direct upload.wikimedia.org
 * thumbnail, which does.
 */
function resolveThumbUrl(url: string): Promise<string | null> {
  const at = url.indexOf(FILE_PATH_MARKER)
  if (at === -1) return Promise.resolve(url)
  const cached = thumbCache.get(url)
  if (cached) return cached

  const file = decodeURIComponent(url.slice(at + FILE_PATH_MARKER.length).split('?')[0])
  const query = new URLSearchParams({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '330',
    format: 'json',
    origin: '*',
  })
  const request = fetch(`${COMMONS_API}?${query}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const pages = json?.query?.pages as
        | Record<string, { imageinfo?: { thumburl?: string }[] }>
        | undefined
      const first = pages ? Object.values(pages)[0] : undefined
      return first?.imageinfo?.[0]?.thumburl ?? null
    })
    .catch(() => null)
  thumbCache.set(url, request)
  return request
}

/**
 * Load a portrait as a texture cropped to a square (biased toward the top,
 * where faces usually are). Returns a cancel function. A failed load simply
 * never calls back, leaving the monogram in place.
 */
export function loadPortrait(
  url: string,
  onLoad: (texture: THREE.Texture) => void,
): () => void {
  let cancelled = false
  const loader = new THREE.TextureLoader()
  loader.setCrossOrigin('anonymous')
  resolveThumbUrl(url).then((sized) => {
    if (cancelled || !sized) return
    loader.load(
    sized,
    (tex) => {
      if (cancelled) {
        tex.dispose()
        return
      }
      const img = tex.image as { width: number; height: number }
      const aspect = img.width / img.height
      if (aspect < 1) {
        tex.repeat.set(1, aspect)
        tex.offset.set(0, (1 - aspect) * 0.8)
      } else {
        tex.repeat.set(1 / aspect, 1)
        tex.offset.set((1 - 1 / aspect) / 2, 0)
      }
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      onLoad(tex)
    },
    undefined,
    () => {},
    )
  })
  return () => {
    cancelled = true
  }
}
