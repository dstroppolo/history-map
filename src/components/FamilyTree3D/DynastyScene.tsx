import { useCallback, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { createAnimStore, stepAnimStore, syncAnimStore } from './animStore'
import Bloodlines, { type LineMode } from './Bloodlines'
import CameraRig, { type RigHandle } from './CameraRig'
import Medallion from './Medallion'
import { getGlowTexture } from './textures'
import {
  NO_HOUSE_COLOR,
  buildSceneGraph,
  lineageOf,
  type House,
} from './treeGraph'

export interface DynastySceneProps {
  nodes: FamilyTreeNodeData[]
  rootId: string
  houses: House[]
  loadingIds: Set<string>
  selectedId: string | null
  hoveredId: string | null
  highlightHouseId: string | null
  panelOpen: boolean
  animatedLines: boolean
  rigRef: RefObject<RigHandle>
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
  onAddParent: (id: string) => void
  onAddChild: (id: string) => void
}

/** Far-off colour washes so the void isn't flat black. */
function Nebula() {
  const clouds: { pos: [number, number, number]; size: number; color: string; opacity: number }[] = [
    { pos: [-45, 18, -90], size: 120, color: '#2B3A8C', opacity: 0.5 },
    { pos: [55, -22, -100], size: 140, color: '#5A2A7A', opacity: 0.4 },
    { pos: [5, -40, -80], size: 90, color: '#8C6A2B', opacity: 0.16 },
  ]
  return (
    <>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} renderOrder={-10}>
          <planeGeometry args={[c.size, c.size]} />
          <meshBasicMaterial
            map={getGlowTexture()}
            color={c.color}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            fog={false}
          />
        </mesh>
      ))}
    </>
  )
}

function SceneContent({
  nodes,
  rootId,
  houses,
  loadingIds,
  selectedId,
  hoveredId,
  highlightHouseId,
  panelOpen,
  animatedLines,
  rigRef,
  onHover,
  onSelect,
  onAddParent,
  onAddChild,
}: DynastySceneProps) {
  const anim = useRef(createAnimStore()).current

  const graph = useMemo(() => {
    const g = buildSceneGraph(nodes, rootId)
    // Idempotent, so safe to run during render (and twice under StrictMode).
    syncAnimStore(anim, g)
    return g
  }, [nodes, rootId, anim])

  useFrame((_, dt) => stepAnimStore(anim, Math.min(dt, 0.05)))

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const houseColor = useMemo(() => new Map(houses.map((h) => [h.id, h.color])), [houses])

  const colorOf = useCallback(
    (id: string) => {
      const houseId = nodeById.get(id)?.houseId
      return (houseId && houseColor.get(houseId)) || NO_HOUSE_COLOR
    },
    [nodeById, houseColor],
  )

  const lineage = useMemo(
    () => (hoveredId && graph.targets.has(hoveredId) ? lineageOf(graph, hoveredId) : null),
    [graph, hoveredId],
  )

  const isDimmed = useCallback(
    (id: string) => {
      if (lineage && !lineage.has(id)) return true
      if (highlightHouseId && nodeById.get(id)?.houseId !== highlightHouseId) return true
      return false
    },
    [lineage, highlightHouseId, nodeById],
  )

  const modeOf = useCallback(
    (ids: string[]): LineMode => {
      if (ids.some(isDimmed)) return 'dim'
      if (lineage && ids.every((id) => lineage.has(id))) return 'bright'
      return 'normal'
    },
    [isDimmed, lineage],
  )

  return (
    <>
      <CameraRig ref={rigRef} anim={anim} rootId={rootId} panelOpen={panelOpen} />
      <Bloodlines
        threads={graph.threads}
        couples={graph.couples}
        anim={anim}
        colorOf={colorOf}
        modeOf={modeOf}
        animated={animatedLines}
      />
      {nodes.map((node) => {
        const entry = anim.entries.get(node.id)
        if (!entry) return null
        return (
          <Medallion
            key={node.id}
            node={node}
            entry={entry}
            color={colorOf(node.id)}
            dimmed={isDimmed(node.id)}
            emphasised={!!lineage?.has(node.id)}
            selected={selectedId === node.id}
            hovered={hoveredId === node.id}
            loading={loadingIds.has(node.id)}
            onHover={onHover}
            onSelect={onSelect}
            onAddParent={node.parentsFetched ? undefined : () => onAddParent(node.id)}
            onAddChild={node.childrenFetched ? undefined : () => onAddChild(node.id)}
          />
        )
      })}
    </>
  )
}

export default function DynastyScene(props: DynastySceneProps) {
  const { onSelect } = props
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 500, position: [0, 9, 70] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#05060D']} />
      <Nebula />
      <Stars radius={140} depth={70} count={3500} factor={4.5} saturation={0.2} fade speed={0.5} />
      <Sparkles
        count={140}
        position={[0, 0, -14]}
        scale={[110, 70, 18]}
        size={3}
        speed={0.25}
        opacity={0.45}
        color="#F3D9A4"
      />
      <SceneContent {...props} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.25} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  )
}
