import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Birthplace } from '@/services/lineage'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { CaptureBridge, type CaptureHandle } from './capture'
import { loadEarthTexture } from './earthTexture'
import { getGlowTexture } from './textures'
import { NO_HOUSE_COLOR, type House } from './treeGraph'

const R = 2
const THIS_YEAR = new Date().getFullYear()
const Z = new THREE.Vector3(0, 0, 1)

/** Latitude/longitude → a point on the unit sphere (matches the texture mapping). */
function toVector(lat: number, lon: number): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat)
  const theta = THREE.MathUtils.degToRad(lon + 180)
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

interface PlaceGroup {
  place: Birthplace
  dir: THREE.Vector3
  ids: string[]
}

export interface GlobeViewProps {
  nodes: FamilyTreeNodeData[]
  places: Map<string, Birthplace>
  houses: House[]
  loading: boolean
  /** Person the globe should turn to face. */
  focusId: string | null
  /** Guided journey: who is lit so far. */
  litIds: Set<string> | null
  /** Time scrubber year. */
  year: number | null
  highlightHouseId: string | null
  captureRef?: RefObject<CaptureHandle>
  /** Fixed pixel ratio, raised briefly while a poster is being captured. */
  dpr?: number | null
  onSelect: (id: string) => void
}

function Earth() {
  const [map, setMap] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    loadEarthTexture().then(
      (tex) => alive && setMap(tex),
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [])
  return (
    <mesh>
      <sphereGeometry args={[R, 96, 64]} />
      <meshBasicMaterial key={map ? 'map' : 'plain'} map={map} color={map ? '#ffffff' : '#0a1030'} toneMapped={false} />
    </mesh>
  )
}

const atmosphereMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float glow = pow(0.74 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
      gl_FragColor = vec4(0.36, 0.5, 1.0, 1.0) * glow;
    }`,
})

function Atmosphere() {
  return (
    <mesh scale={1.16} material={atmosphereMaterial}>
      <sphereGeometry args={[R, 64, 48]} />
    </mesh>
  )
}

interface MarkerProps {
  group: PlaceGroup
  color: string
  opacity: number
  focused: boolean
  onOpen: (group: PlaceGroup) => void
  onHover: (group: PlaceGroup | null) => void
}

function Marker({ group, color, opacity, focused, onOpen, onHover }: MarkerProps) {
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const core = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.MeshBasicMaterial>(null)
  const shown = useRef(0)

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(Z, group.dir),
    [group.dir],
  )
  const position = useMemo(() => group.dir.clone().multiplyScalar(R * 1.002), [group.dir])
  const root = useRef<THREE.Group>(null)
  const size = 0.009 + 0.003 * Math.sqrt(group.ids.length)
  const tint = useMemo(() => new THREE.Color(color), [color])
  const bright = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.55), [color])

  useFrame(({ clock, camera }, dt) => {
    // Shrink with the camera so close neighbours separate as you zoom in.
    if (root.current) {
      const height = camera.position.length() - R
      root.current.scale.setScalar(Math.min(1, Math.pow(height / 4.2, 0.75)))
    }
    shown.current += (opacity - shown.current) * (1 - Math.exp(-6 * dt))
    if (core.current) core.current.opacity = shown.current
    if (halo.current) halo.current.opacity = shown.current * (focused ? 0.6 : 0.3)
    if (ring.current && ringMat.current) {
      const t = (clock.elapsedTime * 0.7) % 1
      ring.current.visible = focused
      ring.current.scale.setScalar(1 + t * 2.4)
      ringMat.current.opacity = (1 - t) * 0.9
    }
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.classList.add('dynasty-pointer')
    onHover(group)
  }
  const out = () => {
    document.body.classList.remove('dynasty-pointer')
    onHover(null)
  }

  return (
    <group ref={root} position={position} quaternion={quaternion}>
      <mesh position={[0, 0, 0.002]} renderOrder={2}>
        <planeGeometry args={[size * 6, size * 6]} />
        <meshBasicMaterial
          ref={halo}
          map={getGlowTexture()}
          color={tint}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.004]} renderOrder={3}>
        <circleGeometry args={[size, 24]} />
        <meshBasicMaterial
          ref={core}
          color={bright}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring} position={[0, 0, 0.005]} renderOrder={4} visible={false}>
        <ringGeometry args={[size * 1.5, size * 1.5 + 0.004, 48]} />
        <meshBasicMaterial
          ref={ringMat}
          color="#F2C96B"
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Generous invisible target for the pointer. */}
      <mesh
        position={[0, 0, 0.006]}
        onPointerOver={over}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 6) return
          onOpen(group)
        }}
      >
        <circleGeometry args={[size * 2.4, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface ArcProps {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  opacity: number
}

/** A raised great-circle arc from a parent's birthplace to their child's. */
function Arc({ from, to, color, opacity }: ArcProps) {
  const points = useMemo(() => {
    const angle = from.angleTo(to)
    const lift = 0.04 + 0.3 * (angle / Math.PI)
    const axis = new THREE.Vector3().crossVectors(from, to).normalize()
    const out: THREE.Vector3[] = []
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const p = from.clone().applyAxisAngle(axis, angle * t)
      out.push(p.multiplyScalar(R * (1.004 + lift * Math.sin(Math.PI * t))))
    }
    return out
  }, [from, to])
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.4}
      transparent
      opacity={opacity}
      depthWrite={false}
      toneMapped={false}
    />
  )
}

interface GlobeRigProps {
  target: THREE.Vector3 | null
}

/** Orbit controls, plus a glide that turns the globe to face the focus. */
function GlobeRig({ target }: GlobeRigProps) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const flying = useRef(false)
  const aim = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!target) return
    // Look from a little south so the place sits above the caption bar.
    const up = new THREE.Vector3(0, 1, 0)
    const east = new THREE.Vector3().crossVectors(up, target)
    aim.current.copy(target)
    if (east.lengthSq() > 1e-6) aim.current.applyAxisAngle(east.normalize(), THREE.MathUtils.degToRad(9))
    flying.current = true
  }, [target])

  useFrame((_, dt) => {
    const dist = camera.position.length()
    if (controls.current) {
      // Slow the spin down as you get close to the surface.
      controls.current.rotateSpeed = THREE.MathUtils.clamp((dist - R) / 3, 0.06, 1) * 0.7
    }
    if (!flying.current) return
    const k = 1 - Math.exp(-2.6 * dt)
    const dir = camera.position.clone().normalize()
    const wantDist = dist > 7 ? 6.2 : dist
    dir.lerp(aim.current, k).normalize()
    camera.position.copy(dir.multiplyScalar(dist + (wantDist - dist) * k))
    camera.lookAt(0, 0, 0)
    if (dir.normalize().angleTo(aim.current) < 0.004) flying.current = false
  })

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={0.7}
      minDistance={R + 0.28}
      maxDistance={9}
      onStart={() => {
        flying.current = false
      }}
    />
  )
}

interface PlaceLabelProps {
  group: PlaceGroup
  strong: boolean
}

/** A name tag pinned to a place, hidden when the place turns out of view. */
function PlaceLabel({ group, strong }: PlaceLabelProps) {
  const sprite = useRef<THREE.Sprite>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 96
    const ctx = canvas.getContext('2d')!
    ctx.font = '500 40px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.95)'
    ctx.shadowBlur = 12
    ctx.fillStyle = strong ? '#F6F1E4' : '#C9CEE3'
    let text = group.place.name
    while (ctx.measureText(text).width > 480 && text.length > 4) text = text.slice(0, -2)
    if (text !== group.place.name) text += '…'
    ctx.fillText(text, 256, 48)
    ctx.fillText(text, 256, 48)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [group.place.name, strong])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame(({ camera }) => {
    const s = sprite.current
    if (!s) return
    const dist = camera.position.length()
    const facing = group.dir.dot(camera.position) / dist
    const material = s.material as THREE.SpriteMaterial
    material.opacity = THREE.MathUtils.smoothstep(facing, 0.2, 0.45)
    // Keep the tag a steady size on screen.
    const scale = (dist - R * facing) * 0.22
    s.scale.set(scale, scale * (96 / 512), 1)
    s.position.copy(group.dir).multiplyScalar(R * 1.01 + scale * 0.16)
  })

  return (
    <sprite ref={sprite} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

export default function GlobeView({
  nodes,
  places,
  houses,
  loading,
  focusId,
  litIds,
  year,
  highlightHouseId,
  captureRef,
  dpr,
  onSelect,
}: GlobeViewProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<PlaceGroup | null>(null)

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const houseColor = useMemo(() => new Map(houses.map((h) => [h.id, h.color])), [houses])
  const colorOf = (id: string) => {
    const houseId = nodeById.get(id)?.houseId
    return (houseId && houseColor.get(houseId)) || NO_HOUSE_COLOR
  }

  /** How strongly a person shows, given the journey step, year or house filter. */
  const weightOf = (id: string): number => {
    const node = nodeById.get(id)
    if (!node) return 0
    if (litIds) return litIds.has(id) ? 1 : 0.16
    if (year !== null) {
      if (node.birthYear === undefined) return 0.16
      if (year < node.birthYear) return 0
      return year <= (node.deathYear ?? Math.min(node.birthYear + 100, THIS_YEAR)) ? 1 : 0.22
    }
    if (highlightHouseId) return node.houseId === highlightHouseId ? 1 : 0.14
    return 1
  }

  const groups = useMemo(() => {
    const byPlace = new Map<string, PlaceGroup>()
    for (const node of nodes) {
      const place = places.get(node.id)
      if (!place) continue
      const group = byPlace.get(place.placeId)
      if (group) group.ids.push(node.id)
      else byPlace.set(place.placeId, { place, dir: toVector(place.lat, place.lon), ids: [node.id] })
    }
    return byPlace
  }, [nodes, places])

  const arcs = useMemo(() => {
    const seen = new Set<string>()
    const out: { key: string; parent: string; child: string }[] = []
    const add = (parent: string, child: string) => {
      const a = places.get(parent)
      const b = places.get(child)
      if (!a || !b || a.placeId === b.placeId) return
      const key = `${parent}>${child}`
      if (seen.has(key)) return
      seen.add(key)
      out.push({ key, parent, child })
    }
    for (const node of nodes) {
      for (const cid of node.parentOf ?? []) add(node.id, cid)
      if (node.childOf) add(node.childOf, node.id)
    }
    return out
  }, [nodes, places])

  const focusPlace = focusId ? places.get(focusId) : undefined
  const focusGroup = focusPlace ? groups.get(focusPlace.placeId) : undefined
  // Face the focus if it has a birthplace; otherwise the first located person.
  const firstGroup = useMemo(() => [...groups.values()][0], [groups])
  const target = (focusGroup ?? firstGroup)?.dir ?? null

  const openGroup = openPlaceId ? groups.get(openPlaceId) : undefined
  const located = [...groups.values()].reduce((sum, g) => sum + g.ids.length, 0)

  useEffect(() => () => document.body.classList.remove('dynasty-pointer'), [])

  return (
    <div className="dynasty-globe">
      <Canvas
        dpr={dpr ?? [1, 2]}
        camera={{ fov: 40, near: 0.05, far: 400, position: [1.2, 3.4, 5.4] }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        onPointerMissed={() => setOpenPlaceId(null)}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={['#05060D']} />
        <Stars radius={120} depth={60} count={3000} factor={4} saturation={0.2} fade speed={0.4} />
        <Earth />
        <Atmosphere />
        {arcs.map((arc) => {
          const weight = Math.min(weightOf(arc.parent), weightOf(arc.child))
          if (weight <= 0) return null
          return (
            <Arc
              key={arc.key}
              from={groups.get(places.get(arc.parent)!.placeId)!.dir}
              to={groups.get(places.get(arc.child)!.placeId)!.dir}
              color={colorOf(arc.child)}
              opacity={weight * 0.75}
            />
          )
        })}
        {[...groups.values()].map((group) => {
          const lead = group.ids.reduce((best, id) => (weightOf(id) > weightOf(best) ? id : best))
          return (
            <Marker
              key={group.place.placeId}
              group={group}
              color={colorOf(lead)}
              opacity={weightOf(lead)}
              focused={group === focusGroup}
              onOpen={(g) => setOpenPlaceId(g.place.placeId)}
              onHover={setHovered}
            />
          )
        })}
        {focusGroup && <PlaceLabel key={`f-${focusGroup.place.placeId}`} group={focusGroup} strong />}
        {hovered && hovered !== focusGroup && (
          <PlaceLabel key={`h-${hovered.place.placeId}`} group={hovered} strong={false} />
        )}
        <GlobeRig target={target} />
        {captureRef && <CaptureBridge handle={captureRef} />}
      </Canvas>

      <div className="dynasty-globe__info">
        {loading ? (
          'Locating birthplaces…'
        ) : openGroup ? (
          <div className="dynasty-globe__place">
            <div className="dynasty-eyebrow">Born here</div>
            <h3>{openGroup.place.name}</h3>
            <div className="dynasty-globe__people">
              {openGroup.ids.map((id) => {
                const node = nodeById.get(id)
                if (!node) return null
                return (
                  <button
                    key={id}
                    type="button"
                    className="dynasty-chip"
                    style={{ ['--chip' as string]: colorOf(id) }}
                    onClick={() => onSelect(id)}
                  >
                    <span className="dynasty-chip__dot" />
                    {node.name}
                    {node.birthYear !== undefined && <small>{node.birthYear}</small>}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          `${located} of ${nodes.length} people have a recorded birthplace · click a light to see who was born there`
        )}
      </div>
    </div>
  )
}
