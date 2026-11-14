import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import type { AnimEntry } from './animStore'
import {
  LABEL_ASPECT,
  getGlowTexture,
  getPlusTexture,
  loadPortrait,
  makeLabelTexture,
  makeMonogramTexture,
} from './textures'

const RADIUS = 0.8
const LABEL_WIDTH = 3
const CLICK_SLOP_PX = 6
/** Labels fade out between these camera distances. */
const LABEL_FADE_NEAR = 34
const LABEL_FADE_FAR = 52

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

function setCursor(pointer: boolean) {
  // The canvas sets its own grab cursor, so flag the body and let CSS override it.
  document.body.classList.toggle('dynasty-pointer', pointer)
}

interface ExpandButtonProps {
  y: number
  color: THREE.Color
  opacity: React.MutableRefObject<number>
  onPress: () => void
}

function ExpandButton({ y, color, opacity, onPress }: ExpandButtonProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const [hot, setHot] = useState(false)
  const scale = useRef(1)

  useFrame(({ clock }, dt) => {
    if (!mesh.current || !mat.current) return
    const breathe = 1 + Math.sin(clock.elapsedTime * 2.4 + y) * 0.06
    scale.current = damp(scale.current, hot ? 1.45 : breathe, 12, dt)
    mesh.current.scale.setScalar(scale.current)
    mat.current.opacity = opacity.current * (hot ? 1 : 0.8)
  })

  return (
    <mesh
      ref={mesh}
      position={[0, y, 0.06]}
      renderOrder={5}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHot(true)
        setCursor(true)
      }}
      onPointerOut={() => {
        setHot(false)
        setCursor(false)
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.delta > CLICK_SLOP_PX) return
        onPress()
      }}
    >
      <circleGeometry args={[0.2, 32]} />
      <meshBasicMaterial
        ref={mat}
        map={getPlusTexture()}
        color={color}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export interface MedallionProps {
  node: FamilyTreeNodeData
  entry: AnimEntry
  color: string
  /** Faded back because something else has focus. */
  dimmed: boolean
  /** Part of the hovered person's lineage. */
  emphasised: boolean
  selected: boolean
  hovered: boolean
  loading: boolean
  /** Explicit opacity (0–1), used by the time scrubber; overrides `dimmed`. */
  fade?: number
  /** Poster capture: always show the name, on a plate that hides lines behind it. */
  poster?: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onAddParent?: () => void
  onAddChild?: () => void
}

export default function Medallion({
  node,
  entry,
  color,
  dimmed,
  emphasised,
  selected,
  hovered,
  loading,
  fade,
  poster = false,
  onHover,
  onSelect,
  onAddParent,
  onAddChild,
}: MedallionProps) {
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const spinner = useRef<THREE.Mesh>(null)
  const discMat = useRef<THREE.MeshBasicMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)
  const labelMat = useRef<THREE.MeshBasicMaterial>(null)
  const spinMat = useRef<THREE.MeshBasicMaterial>(null)

  const state = useRef({ scale: 0, opacity: 0, glow: 0, phase: Math.random() * Math.PI * 2 })
  const buttonOpacity = useRef(0)

  const years =
    node.birthYear || node.deathYear
      ? `${node.birthYear ?? '?'} – ${node.deathYear ?? ''}`.trim()
      : null

  const labelTex = useMemo(
    () => makeLabelTexture(node.name, years, poster),
    [node.name, years, poster],
  )
  const monoTex = useMemo(() => makeMonogramTexture(node.name, color), [node.name, color])
  const [portrait, setPortrait] = useState<THREE.Texture | null>(null)

  useEffect(() => () => labelTex.dispose(), [labelTex])
  useEffect(() => () => monoTex.dispose(), [monoTex])

  useEffect(() => {
    if (!node.avatarUrl) return
    let loaded: THREE.Texture | null = null
    const cancel = loadPortrait(node.avatarUrl, (tex) => {
      loaded = tex
      setPortrait(tex)
    })
    return () => {
      cancel()
      loaded?.dispose()
      setPortrait(null)
    }
  }, [node.avatarUrl])

  const ringColor = useMemo(() => new THREE.Color(color).multiplyScalar(1.9), [color])
  const baseColor = useMemo(() => new THREE.Color(color), [color])

  useEffect(() => () => setCursor(false), [])

  useFrame(({ clock, camera }, dt) => {
    const s = state.current
    if (!group.current || !inner.current) return

    group.current.position.copy(entry.cur)
    inner.current.position.y = Math.sin(clock.elapsedTime * 0.7 + s.phase) * 0.06

    s.scale = damp(s.scale, hovered ? 1.14 : selected ? 1.08 : 1, 7, dt)
    inner.current.scale.setScalar(s.scale)

    s.opacity = damp(s.opacity, fade ?? (dimmed ? 0.14 : 1), 7, dt)
    const glowTarget = hovered || selected ? 0.95 : emphasised ? 0.6 : 0.26
    s.glow = damp(s.glow, glowTarget, 6, dt)
    buttonOpacity.current = s.opacity

    const distance = camera.position.z - entry.cur.z
    const labelLod =
      hovered || selected || poster
        ? 1
        : 1 - THREE.MathUtils.smoothstep(distance, LABEL_FADE_NEAR, LABEL_FADE_FAR)

    if (discMat.current) discMat.current.opacity = s.opacity
    if (ringMat.current) ringMat.current.opacity = s.opacity
    if (glowMat.current) glowMat.current.opacity = s.glow * s.opacity
    // On a poster even faded people keep a readable name.
    if (labelMat.current) {
      labelMat.current.opacity = (poster ? Math.max(s.opacity, 0.75) : s.opacity) * labelLod
    }

    if (spinner.current && spinMat.current) {
      const active = selected || loading
      spinner.current.rotation.z -= dt * (loading ? 4 : 0.6)
      spinMat.current.opacity = damp(spinMat.current.opacity, active ? s.opacity : 0, 8, dt)
    }
  })

  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(node.id)
    setCursor(true)
  }
  const handleOut = () => {
    onHover(null)
    setCursor(false)
  }
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > CLICK_SLOP_PX) return
    onSelect(node.id)
  }

  return (
    <group ref={group}>
      <group ref={inner}>
        {/* Halo */}
        <mesh position={[0, 0, -0.05]} renderOrder={0}>
          <planeGeometry args={[4.4, 4.4]} />
          <meshBasicMaterial
            ref={glowMat}
            map={getGlowTexture()}
            color={baseColor}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        {/* Portrait */}
        <mesh
          renderOrder={1}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
          onClick={handleClick}
        >
          <circleGeometry args={[RADIUS, 64]} />
          <meshBasicMaterial
            ref={discMat}
            key={portrait ? 'portrait' : 'monogram'}
            map={portrait ?? monoTex}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* House ring */}
        <mesh position={[0, 0, 0.01]} renderOrder={2}>
          <ringGeometry args={[RADIUS, RADIUS + 0.075, 96]} />
          <meshBasicMaterial
            ref={ringMat}
            color={ringColor}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Selection / loading arcs */}
        <mesh ref={spinner} position={[0, 0, 0.02]} renderOrder={3}>
          <ringGeometry args={[RADIUS + 0.16, RADIUS + 0.2, 64, 1, 0, Math.PI * 1.25]} />
          <meshBasicMaterial
            ref={spinMat}
            color={ringColor}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>

        {/* Name and lifespan */}
        <mesh position={[0, -(RADIUS + 0.82), 0.03]} renderOrder={8}>
          <planeGeometry args={[LABEL_WIDTH, LABEL_WIDTH / LABEL_ASPECT]} />
          <meshBasicMaterial
            ref={labelMat}
            map={labelTex}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {onAddParent && (
          <ExpandButton
            y={RADIUS + 0.12}
            color={ringColor}
            opacity={buttonOpacity}
            onPress={onAddParent}
          />
        )}
        {onAddChild && (
          <ExpandButton
            y={-(RADIUS + 0.12)}
            color={ringColor}
            opacity={buttonOpacity}
            onPress={onAddChild}
          />
        )}
      </group>
    </group>
  )
}
