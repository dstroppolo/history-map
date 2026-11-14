import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { AnimStore } from './animStore'
import { getCrownTexture } from './textures'

const GOLD = new THREE.Color('#F2C96B').multiplyScalar(2.2)
const RING_RADIUS = 0.95

interface JourneyMarkerProps {
  anim: AnimStore
  /** The person the journey is currently on. */
  targetId: string | null
  /** Show a crown above them (succession) rather than just the pulse. */
  crown: boolean
}

/** A pulse (and optionally a crown) that flies from person to person. */
export default function JourneyMarker({ anim, targetId, crown }: JourneyMarkerProps) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const crownMesh = useRef<THREE.Mesh>(null)
  const placed = useRef(false)

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    const entry = targetId ? anim.entries.get(targetId) : undefined
    g.visible = !!entry
    if (!entry) {
      placed.current = false
      return
    }
    if (placed.current) {
      g.position.lerp(entry.cur, 1 - Math.exp(-5 * dt))
    } else {
      g.position.copy(entry.cur)
      placed.current = true
    }

    const t = (clock.elapsedTime * 0.8) % 1
    if (ring.current && ringMat.current) {
      ring.current.scale.setScalar(1 + t * 0.7)
      ringMat.current.opacity = (1 - t) * 0.9
    }
    if (crownMesh.current) {
      crownMesh.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 2) * 0.05
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} position={[0, 0, 0.04]} renderOrder={6}>
        <ringGeometry args={[RING_RADIUS, RING_RADIUS + 0.05, 96]} />
        <meshBasicMaterial
          ref={ringMat}
          color={GOLD}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {crown && (
        <mesh ref={crownMesh} position={[0, 1.5, 0.08]} renderOrder={7}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshBasicMaterial
            map={getCrownTexture()}
            color={GOLD}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}
