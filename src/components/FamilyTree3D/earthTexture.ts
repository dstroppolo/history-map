import * as THREE from 'three'
import { feature } from 'topojson-client'
import landUrl from 'world-atlas/land-50m.json?url'

const WIDTH = 4096
const HEIGHT = 2048

let pending: Promise<THREE.CanvasTexture> | null = null

type Ring = [number, number][]

/** Every polygon (as a list of rings) in a GeoJSON object. */
function polygonsOf(geo: any): Ring[][] {
  if (!geo) return []
  if (geo.type === 'FeatureCollection') return geo.features.flatMap(polygonsOf)
  if (geo.type === 'Feature') return polygonsOf(geo.geometry)
  if (geo.type === 'GeometryCollection') return geo.geometries.flatMap(polygonsOf)
  if (geo.type === 'Polygon') return [geo.coordinates]
  if (geo.type === 'MultiPolygon') return geo.coordinates
  return []
}

function draw(polygons: Ring[][]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  const x = (lon: number) => ((lon + 180) / 360) * WIDTH
  const y = (lat: number) => ((90 - lat) / 180) * HEIGHT

  const ocean = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  ocean.addColorStop(0, '#0a1030')
  ocean.addColorStop(0.5, '#070b20')
  ocean.addColorStop(1, '#0a1030')
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Graticule
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let lon = -180; lon <= 180; lon += 20) {
    ctx.moveTo(x(lon), 0)
    ctx.lineTo(x(lon), HEIGHT)
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    ctx.moveTo(0, y(lat))
    ctx.lineTo(WIDTH, y(lat))
  }
  ctx.stroke()

  ctx.beginPath()
  for (const polygon of polygons) {
    for (const ring of polygon) {
      // Make longitudes continuous so a ring crossing the date line doesn't
      // streak back across the whole map.
      const flat: Ring = []
      let shift = 0
      ring.forEach(([lon, lat], i) => {
        if (i > 0) {
          const step = lon - ring[i - 1][0]
          if (step > 180) shift -= 360
          else if (step < -180) shift += 360
        }
        flat.push([lon + shift, lat])
      })
      // A ring that circles a pole (Antarctica) is closed off beyond the map edge.
      const first = flat[0]
      const last = flat[flat.length - 1]
      if (Math.abs(last[0] - first[0]) > 180) {
        const pole = first[1] < 0 ? -91 : 91
        flat.push([last[0], pole], [first[0], pole])
      }
      // Drawn three times so whatever runs off one side reappears on the other.
      for (const offset of [-360, 0, 360]) {
        flat.forEach(([lon, lat], i) => {
          if (i === 0) ctx.moveTo(x(lon + offset), y(lat))
          else ctx.lineTo(x(lon + offset), y(lat))
        })
        ctx.closePath()
      }
    }
  }
  ctx.fillStyle = '#1b2448'
  ctx.fill('nonzero')
  ctx.strokeStyle = 'rgba(232, 193, 112, 0.5)'
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.stroke()
  return canvas
}

/** A stylised night-chart of the Earth, drawn once from coastline data. */
export function loadEarthTexture(): Promise<THREE.CanvasTexture> {
  if (!pending) {
    pending = fetch(landUrl)
      .then((res) => res.json())
      .then((topology) => {
        const land = feature(topology, topology.objects.land)
        const texture = new THREE.CanvasTexture(draw(polygonsOf(land)))
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        return texture
      })
      .catch((err) => {
        pending = null
        throw err
      })
  }
  return pending
}
