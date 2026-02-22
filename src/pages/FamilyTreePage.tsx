import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FamilyTreeNode from '@/components/FamilyTree/FamilyTreeNode'
import FamilyTreeBreadcrumb from '@/components/FamilyTree/FamilyTreeBreadcrumb'
import EntityDetailPanel from '@/components/EntityDetail/EntityDetailPanel'
import useFamilyTree from '@/hooks/useFamilyTree'
import {
  computeTreeLayout,
  getLayoutBounds,
  NODE_WIDTH,
  NODE_HEIGHT,
  GAP,
} from '@/utils/familyTreeLayout'

const DEFAULT_ROOT_QID = 'Q280856' // George VI
const VALID_QID = /^Q\d+$/

function useRootFromUrl(): string {
  const [searchParams] = useSearchParams()
  const rootParam = searchParams.get('root')
  if (rootParam && VALID_QID.test(rootParam)) return rootParam
  return DEFAULT_ROOT_QID
}

const MIN_SCALE = 0.3
const LINE_WIDTH = 2
const LINE_WIDTH_HIGHLIGHT = 3.5
const MAX_SCALE = 3
const ZOOM_STEP = 0.15

export default function FamilyTreePage() {
  const rootQId = useRootFromUrl()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const didDragRef = useRef(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Close detail panel when root changes (e.g. after "View tree from this person")
  useEffect(() => {
    setSelectedNodeId(null)
  }, [rootQId])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    didDragRef.current = false
    setIsDragging(true)
    dragRef.current = {
      x: position.x,
      y: position.y,
      startX: e.clientX,
      startY: e.clientY,
    }
  }, [position])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true
      setPosition({
        x: dragRef.current.x + dx,
        y: dragRef.current.y + dy,
      })
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  const { nodes, loadingIds, fetchChildren, fetchParents, getPersonById } = useFamilyTree({
    rootQId,
  })

  const selectedPerson = selectedNodeId ? getPersonById(selectedNodeId) : undefined

  const treeLayout = useMemo(() => computeTreeLayout(nodes), [nodes])
  const rawLayout = treeLayout.positions
  const { companions: companionMap, companionOf } = treeLayout
  const bounds = useMemo(() => getLayoutBounds(rawLayout), [rawLayout])

  // Normalize layout: shift all positions so the top-left of the
  // bounding box maps to (0, 0). Both nodes and lines use this
  // identical pixel coordinate system — no viewBox translation needed.
  const pixelPos = useMemo(() => {
    const map = new Map<string, { left: number; top: number; cx: number; cy: number; bottomY: number }>()
    for (const [id, pos] of rawLayout) {
      const left = pos.x - NODE_WIDTH / 2 - bounds.minX
      const top = pos.y - bounds.minY
      map.set(id, {
        left,
        top,
        cx: left + NODE_WIDTH / 2,
        cy: top + NODE_HEIGHT / 2,
        bottomY: top + NODE_HEIGHT,
      })
    }
    return map
  }, [rawLayout, bounds])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [highlightHouseId, setHighlightHouseId] = useState<string | null>(null)

  const houses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const node of nodes) {
      if (node.houseId && node.houseLabel && !seen.has(node.houseId)) {
        seen.set(node.houseId, node.houseLabel)
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }))
  }, [nodes])

  const dimmedNodeIds = useMemo(() => {
    if (!highlightHouseId) return new Set<string>()
    const dimmed = new Set<string>()
    for (const node of nodes) {
      if (node.houseId !== highlightHouseId) dimmed.add(node.id)
    }
    return dimmed
  }, [nodes, highlightHouseId])

  const highlightedParentIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const parents = new Set<string>()
    for (const node of nodes) {
      if (node.parentOf?.includes(hoveredNodeId)) parents.add(node.id)
    }
    return parents
  }, [hoveredNodeId, nodes])

  type TreeLine = {
    x1: number
    y1: number
    x2: number
    y2: number
    childIds: string[]
    parentIds: string[]
  }

  const lines = useMemo(() => {
    type Px = { left: number; top: number; cx: number; cy: number; bottomY: number }
    const out: TreeLine[] = []
    const parentIdsForCouple = (n: { id: string }, comps: string[]) => [n.id, ...comps]

    const drawnCouples = new Set<string>()

    for (const node of nodes) {
      if (companionOf.has(node.id)) continue

      const parentPx = pixelPos.get(node.id)
      if (!parentPx) continue

      const comps = companionMap.get(node.id) ?? []
      const parentIds = parentIdsForCouple(node, comps)

      const allChildIds = new Set(node.parentOf ?? [])
      for (const cid of comps) {
        const comp = nodes.find((n) => n.id === cid)
        if (comp?.parentOf) comp.parentOf.forEach((id) => allChildIds.add(id))
      }
      if (allChildIds.size === 0) continue

      const childEntries = [...allChildIds]
        .map((id) => ({ id, px: pixelPos.get(id) }))
        .filter((e): e is { id: string; px: Px } => !!e.px && e.px.top > parentPx.top)

      if (childEntries.length === 0) continue

      const allParentPx: Px[] = [parentPx]
      for (const cid of comps) {
        const cpx = pixelPos.get(cid)
        if (cpx) allParentPx.push(cpx)
      }

      const coupleKey = [node.id, ...comps].sort().join('|')
      if (drawnCouples.has(coupleKey)) continue
      drawnCouples.add(coupleKey)

      const allIds = childEntries.map((e) => e.id)

      if (allParentPx.length > 1) {
        const leftPx = Math.min(...allParentPx.map((p) => p.cx))
        const rightPx = Math.max(...allParentPx.map((p) => p.cx))
        const coupleBottomY = parentPx.bottomY

        out.push({ x1: leftPx, y1: coupleBottomY, x2: rightPx, y2: coupleBottomY, childIds: allIds, parentIds })

        const coupleMidX = (leftPx + rightPx) / 2
        const forkY = coupleBottomY + GAP / 2

        out.push({ x1: coupleMidX, y1: coupleBottomY, x2: coupleMidX, y2: forkY, childIds: allIds, parentIds })

        if (childEntries.length === 1) {
          const { id, px: c } = childEntries[0]
          if (Math.abs(coupleMidX - c.cx) < 1) {
            out.push({ x1: coupleMidX, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
          } else {
            out.push({ x1: Math.min(coupleMidX, c.cx), y1: forkY, x2: Math.max(coupleMidX, c.cx), y2: forkY, childIds: [id], parentIds })
            out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
          }
        } else {
          const leftX = Math.min(coupleMidX, ...childEntries.map((e) => e.px.cx))
          const rightX = Math.max(coupleMidX, ...childEntries.map((e) => e.px.cx))
          out.push({ x1: leftX, y1: forkY, x2: rightX, y2: forkY, childIds: allIds, parentIds })
          for (const { id, px: c } of childEntries) {
            out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
          }
        }
      } else {
        const parentBottomX = parentPx.cx
        const parentBottomY = parentPx.bottomY

        if (childEntries.length === 1) {
          const { id, px: c } = childEntries[0]
          out.push({ x1: parentBottomX, y1: parentBottomY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
        } else {
          const forkY = parentBottomY + GAP / 2
          const leftX = Math.min(parentBottomX, ...childEntries.map((e) => e.px.cx))
          const rightX = Math.max(parentBottomX, ...childEntries.map((e) => e.px.cx))
          out.push({ x1: parentBottomX, y1: parentBottomY, x2: parentBottomX, y2: forkY, childIds: allIds, parentIds })
          out.push({ x1: leftX, y1: forkY, x2: rightX, y2: forkY, childIds: allIds, parentIds })
          for (const { id, px: c } of childEntries) {
            out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
          }
        }
      }
    }

    return out
  }, [nodes, pixelPos, companionMap, companionOf])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        <FamilyTreeBreadcrumb
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
        {houses.length > 0 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--color-secondary)' }}>House:</span>
            <select
              value={highlightHouseId ?? ''}
              onChange={(e) => setHighlightHouseId(e.target.value || null)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                color: 'var(--color-primary)',
                fontSize: 13,
              }}
            >
              <option value="">All</option>
              {houses.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {/* Tree canvas - zoomable and pannable */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          background: 'var(--color-card)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: Math.max(bounds.width, 1),
              height: Math.max(bounds.height, 1),
            }}
          >
            {/* SVG lines — same pixel coordinate system as the nodes */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: bounds.width,
                height: bounds.height,
                pointerEvents: 'none',
              }}
            >
              {lines.map((line, i) => {
                const highlighted = hoveredNodeId !== null && line.childIds.includes(hoveredNodeId)
                const hoverDimmed = hoveredNodeId !== null && !highlighted
                const lineNodeIds = [...line.parentIds, ...line.childIds]
                const houseDimmed =
                  highlightHouseId !== null &&
                  lineNodeIds.every((id) => dimmedNodeIds.has(id))
                const dimmed = hoverDimmed || houseDimmed
                return (
                  <line
                    key={i}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={highlighted ? 'var(--color-accent, #3b82f6)' : 'var(--color-border)'}
                    strokeWidth={highlighted ? LINE_WIDTH_HIGHLIGHT : LINE_WIDTH}
                    opacity={dimmed ? 0.25 : 1}
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s' }}
                  />
                )
              })}
            </svg>
            {/* Nodes — absolutely positioned with the same pixel offsets */}
            {nodes.map((node) => {
              const px = pixelPos.get(node.id)
              if (!px) return null
              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: px.left,
                    top: px.top,
                    width: NODE_WIDTH,
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((prev) => prev === node.id ? null : prev)}
                >
                  <FamilyTreeNode
                    {...node}
                    loading={loadingIds.has(node.id)}
                    parentHighlighted={highlightedParentIds.has(node.id)}
                    dimmed={dimmedNodeIds.has(node.id)}
                    onNodeClick={() => {
                      if (!didDragRef.current) setSelectedNodeId(node.id)
                    }}
                    onAddParent={
                      node.parentsFetched ? undefined : () => fetchParents(node.id)
                    }
                    onAddChild={
                      node.childrenFetched ? undefined : () => fetchChildren(node.id)
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedPerson && (
          <EntityDetailPanel
            person={selectedPerson}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
