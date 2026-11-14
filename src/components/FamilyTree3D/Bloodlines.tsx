import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import type { AnimStore } from './animStore'
import type { Couple, Thread } from './treeGraph'

const SEGMENTS = 24
const EDGE = 0.9

export type LineMode = 'normal' | 'bright' | 'dim'

const BASE_OPACITY: Record<LineMode, number> = { normal: 0.34, bright: 0.95, dim: 0.05 }
const PULSE_OPACITY: Record<LineMode, number> = { normal: 0.85, bright: 1, dim: 0.06 }
/** With the pulses off, the plain threads carry the picture alone, so lift them. */
const STATIC_OPACITY: Record<LineMode, number> = { normal: 0.6, bright: 1, dim: 0.06 }
const BASE_WIDTH: Record<LineMode, number> = { normal: 1.3, bright: 2.4, dim: 1 }

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

function placeholder(count: number): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => [0, -i * 0.01, 0] as [number, number, number])
}

interface BloodThreadProps {
  thread: Thread
  anim: AnimStore
  color: string
  mode: LineMode
  animated: boolean
}

/** A curved thread from a child's parents down to the child, with a travelling pulse. */
function BloodThread({ thread, anim, color, mode, animated }: BloodThreadProps) {
  const base = useRef<Line2>(null)
  const pulse = useRef<Line2>(null)
  const buffer = useMemo(() => new Float32Array((SEGMENTS + 1) * 3), [])
  const initial = useMemo(() => placeholder(SEGMENTS + 1), [])
  const frames = useRef(0)
  const baseColor = useMemo(() => new THREE.Color(color), [color])
  const pulseColor = useMemo(() => new THREE.Color(color).multiplyScalar(2.6), [color])
  const speed = useMemo(() => 1.1 + Math.random() * 0.7, [])

  useFrame((_, dt) => {
    const b = base.current
    const p = pulse.current
    if (!b || !p) return

    if (anim.moving || frames.current < 3) {
      frames.current += 1
      const child = anim.entries.get(thread.childId)
      const parents = thread.parentIds
        .map((id) => anim.entries.get(id))
        .filter((e): e is NonNullable<typeof e> => !!e)
      if (child && parents.length > 0) {
        let sx = 0
        let sy = 0
        let sz = 0
        for (const parent of parents) {
          sx += parent.cur.x
          sy += parent.cur.y
          sz += parent.cur.z
        }
        sx /= parents.length
        sy /= parents.length
        sz /= parents.length
        if (parents.length === 1) sy -= EDGE

        const ex = child.cur.x
        const ey = child.cur.y + EDGE
        const ez = child.cur.z
        const drop = Math.max(Math.abs(sy - ey), 0.5) * 0.55

        for (let i = 0; i <= SEGMENTS; i++) {
          const t = i / SEGMENTS
          const u = 1 - t
          const w0 = u * u * u
          const w1 = 3 * u * u * t
          const w2 = 3 * u * t * t
          const w3 = t * t * t
          buffer[i * 3] = (w0 + w1) * sx + (w2 + w3) * ex
          buffer[i * 3 + 1] = w0 * sy + w1 * (sy - drop) + w2 * (ey + drop) + w3 * ey
          buffer[i * 3 + 2] = (w0 + w1) * sz + (w2 + w3) * ez - 0.08
        }
        b.geometry.setPositions(buffer)
        p.geometry.setPositions(buffer)
        p.computeLineDistances()
      }
    }

    const baseOpacity = animated ? BASE_OPACITY[mode] : STATIC_OPACITY[mode]
    b.material.opacity = damp(b.material.opacity, baseOpacity, 7, dt)
    b.material.linewidth = damp(b.material.linewidth, BASE_WIDTH[mode], 7, dt)
    p.material.opacity = damp(p.material.opacity, animated ? PULSE_OPACITY[mode] : 0, 7, dt)
    p.visible = p.material.opacity > 0.01
    if (animated) p.material.dashOffset -= dt * speed * (mode === 'bright' ? 1.8 : 1)
  })

  return (
    <>
      <Line
        ref={base}
        points={initial}
        color={baseColor}
        lineWidth={1.3}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
        renderOrder={-2}
      />
      <Line
        ref={pulse}
        points={initial}
        color={pulseColor}
        lineWidth={2.6}
        dashed
        dashSize={0.3}
        gapSize={2.6}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
        renderOrder={-1}
      />
    </>
  )
}

interface CoupleLinkProps {
  couple: Couple
  anim: AnimStore
  mode: LineMode
}

const COUPLE_COLOR = new THREE.Color('#F2DDB0')

/** A quiet link between two people who share a child. */
function CoupleLink({ couple, anim, mode }: CoupleLinkProps) {
  const line = useRef<Line2>(null)
  const buffer = useMemo(() => new Float32Array(6), [])
  const initial = useMemo(() => placeholder(2), [])
  const frames = useRef(0)

  useFrame((_, dt) => {
    const l = line.current
    if (!l) return
    if (anim.moving || frames.current < 3) {
      frames.current += 1
      const a = anim.entries.get(couple.a)
      const b = anim.entries.get(couple.b)
      if (a && b) {
        const dir = Math.sign(b.cur.x - a.cur.x) || 1
        buffer[0] = a.cur.x + dir * EDGE
        buffer[1] = a.cur.y
        buffer[2] = a.cur.z - 0.08
        buffer[3] = b.cur.x - dir * EDGE
        buffer[4] = b.cur.y
        buffer[5] = b.cur.z - 0.08
        l.geometry.setPositions(buffer)
      }
    }
    l.material.opacity = damp(l.material.opacity, BASE_OPACITY[mode] * 1.3, 7, dt)
  })

  return (
    <Line
      ref={line}
      points={initial}
      color={COUPLE_COLOR}
      lineWidth={1.6}
      transparent
      opacity={0}
      depthWrite={false}
      toneMapped={false}
      renderOrder={-2}
    />
  )
}

interface BloodlinesProps {
  threads: Thread[]
  couples: Couple[]
  anim: AnimStore
  colorOf: (personId: string) => string
  modeOf: (ids: string[]) => LineMode
  /** When false, the travelling pulses are hidden and threads are plain links. */
  animated: boolean
}

export default function Bloodlines({
  threads,
  couples,
  anim,
  colorOf,
  modeOf,
  animated,
}: BloodlinesProps) {
  return (
    <>
      {threads.map((thread) => (
        <BloodThread
          key={thread.id}
          thread={thread}
          anim={anim}
          color={colorOf(thread.childId)}
          mode={modeOf([thread.childId, ...thread.parentIds])}
          animated={animated}
        />
      ))}
      {couples.map((couple) => (
        <CoupleLink
          key={couple.id}
          couple={couple}
          anim={anim}
          mode={modeOf([couple.a, couple.b])}
        />
      ))}
    </>
  )
}
