import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FamilyTreeNode from '@/components/FamilyTree/FamilyTreeNode'
import FamilyTreeBreadcrumb from '@/components/FamilyTree/FamilyTreeBreadcrumb'
import PersonSearchBar from '@/components/FamilyTree/PersonSearchBar'
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
const PINCH_SMOOTHING = 0.35
const INERTIA_FRICTION = 0.92
const INERTIA_MIN_SPEED = 0.02
const DRAG_VELOCITY_BLEND = 0.2

type Point = { x: number; y: number }
type PinchState = {
  initialDistance: number
  initialScale: number
  initialPosition: Point
  initialCenter: Point
  containerCenter: Point
}
type DragVelocity = {
  vx: number
  vy: number
  lastX: number
  lastY: number
  lastTime: number
}

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
const getTouchDistance = (
  a: Pick<Touch, 'clientX' | 'clientY'>,
  b: Pick<Touch, 'clientX' | 'clientY'>,
) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
const getTouchCenter = (
  a: Pick<Touch, 'clientX' | 'clientY'>,
  b: Pick<Touch, 'clientX' | 'clientY'>,
): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })

export default function FamilyTreePage() {
  const rootQId = useRootFromUrl()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const dragVelocityRef = useRef<DragVelocity | null>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const inertiaFrameRef = useRef<number | null>(null)
  const scaleRef = useRef(scale)
  const positionRef = useRef(position)
  const [isDragging, setIsDragging] = useState(false)
  const didDragRef = useRef(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Close detail panel when root changes (e.g. after "View tree from this person")
  useEffect(() => {
    setSelectedNodeId(null)
  }, [rootQId])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  const stopInertia = useCallback(() => {
    if (inertiaFrameRef.current === null) return
    cancelAnimationFrame(inertiaFrameRef.current)
    inertiaFrameRef.current = null
  }, [])

  const setPositionAndRef = useCallback((nextPosition: Point) => {
    positionRef.current = nextPosition
    setPosition(nextPosition)
  }, [])

  const setTransformAndRefs = useCallback((nextScale: number, nextPosition: Point) => {
    scaleRef.current = nextScale
    positionRef.current = nextPosition
    setScale(nextScale)
    setPosition(nextPosition)
  }, [])

  const startInertia = useCallback((vx: number, vy: number) => {
    stopInertia()
    let velocityX = vx
    let velocityY = vy
    let lastTs = performance.now()

    const step = (now: number) => {
      const dt = now - lastTs
      lastTs = now

      setPositionAndRef({
        x: positionRef.current.x + velocityX * dt,
        y: positionRef.current.y + velocityY * dt,
      })

      const decay = Math.pow(INERTIA_FRICTION, dt / 16.67)
      velocityX *= decay
      velocityY *= decay

      if (Math.hypot(velocityX, velocityY) < INERTIA_MIN_SPEED) {
        inertiaFrameRef.current = null
        return
      }
      inertiaFrameRef.current = requestAnimationFrame(step)
    }

    inertiaFrameRef.current = requestAnimationFrame(step)
  }, [setPositionAndRef, stopInertia])

  useEffect(() => {
    return () => stopInertia()
  }, [stopInertia])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setScale((s) => {
      const next = clampScale(s + delta)
      scaleRef.current = next
      return next
    })
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
    stopInertia()
    pinchRef.current = null
    didDragRef.current = false
    setIsDragging(true)
    dragRef.current = {
      x: positionRef.current.x,
      y: positionRef.current.y,
      startX: e.clientX,
      startY: e.clientY,
    }
  }, [stopInertia])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true
      setPositionAndRef({
        x: dragRef.current.x + dx,
        y: dragRef.current.y + dy,
      })
    },
    [setPositionAndRef]
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  const startPinchGesture = useCallback((touches: React.TouchList) => {
    if (touches.length < 2 || !containerRef.current) return false
    stopInertia()
    dragVelocityRef.current = null
    const first = touches[0]
    const second = touches[1]
    const initialDistance = getTouchDistance(first, second)
    if (!initialDistance) return false

    const rect = containerRef.current.getBoundingClientRect()
    pinchRef.current = {
      initialDistance,
      initialScale: scaleRef.current,
      initialPosition: { ...positionRef.current },
      initialCenter: getTouchCenter(first, second),
      containerCenter: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
    }
    didDragRef.current = true
    dragRef.current = null
    setIsDragging(true)
    return true
  }, [stopInertia])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      stopInertia()

      if (e.touches.length === 2) {
        startPinchGesture(e.touches)
        return
      }
      if (e.touches.length !== 1 || pinchRef.current) return

      didDragRef.current = false
      setIsDragging(true)
      const t = e.touches[0]
      dragRef.current = {
        x: positionRef.current.x,
        y: positionRef.current.y,
        startX: t.clientX,
        startY: t.clientY,
      }
      dragVelocityRef.current = {
        vx: 0,
        vy: 0,
        lastX: t.clientX,
        lastY: t.clientY,
        lastTime: performance.now(),
      }
    },
    [startPinchGesture, stopInertia]
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      if (!pinchRef.current && !startPinchGesture(e.touches)) return
      const pinch = pinchRef.current
      if (!pinch) return

      const first = e.touches[0]
      const second = e.touches[1]
      const distance = getTouchDistance(first, second)
      if (!distance) return

      const center = getTouchCenter(first, second)
      const targetScale = clampScale(
        pinch.initialScale * (distance / pinch.initialDistance),
      )
      const scaleRatio = targetScale / pinch.initialScale

      // Keep the initial pinch focal point under the users' fingers.
      const offsetX =
        pinch.initialCenter.x - pinch.containerCenter.x - pinch.initialPosition.x
      const offsetY =
        pinch.initialCenter.y - pinch.containerCenter.y - pinch.initialPosition.y

      const targetPosition = {
        x: center.x - pinch.containerCenter.x - offsetX * scaleRatio,
        y: center.y - pinch.containerCenter.y - offsetY * scaleRatio,
      }
      const nextScale =
        scaleRef.current + (targetScale - scaleRef.current) * PINCH_SMOOTHING
      const nextPosition = {
        x:
          positionRef.current.x +
          (targetPosition.x - positionRef.current.x) * PINCH_SMOOTHING,
        y:
          positionRef.current.y +
          (targetPosition.y - positionRef.current.y) * PINCH_SMOOTHING,
      }

      setTransformAndRefs(nextScale, nextPosition)
      dragVelocityRef.current = null
      didDragRef.current = true
      return
    }

    if (e.touches.length !== 1 || pinchRef.current || !dragRef.current) return

    e.preventDefault()
    const t = e.touches[0]
    const dx = t.clientX - dragRef.current.startX
    const dy = t.clientY - dragRef.current.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true
    setPositionAndRef({
      x: dragRef.current.x + dx,
      y: dragRef.current.y + dy,
    })

    const velocity = dragVelocityRef.current
    if (!velocity) return
    const now = performance.now()
    const dt = now - velocity.lastTime
    if (dt > 0) {
      const instantVx = (t.clientX - velocity.lastX) / dt
      const instantVy = (t.clientY - velocity.lastY) / dt
      velocity.vx =
        velocity.vx * (1 - DRAG_VELOCITY_BLEND) +
        instantVx * DRAG_VELOCITY_BLEND
      velocity.vy =
        velocity.vy * (1 - DRAG_VELOCITY_BLEND) +
        instantVy * DRAG_VELOCITY_BLEND
      velocity.lastX = t.clientX
      velocity.lastY = t.clientY
      velocity.lastTime = now
    }
  }, [setPositionAndRef, setTransformAndRefs, startPinchGesture])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length >= 2) {
        startPinchGesture(e.touches)
        return
      }

      if (e.touches.length === 1 && pinchRef.current) {
        pinchRef.current = null
        const t = e.touches[0]
        dragRef.current = {
          x: positionRef.current.x,
          y: positionRef.current.y,
          startX: t.clientX,
          startY: t.clientY,
        }
        dragVelocityRef.current = {
          vx: 0,
          vy: 0,
          lastX: t.clientX,
          lastY: t.clientY,
          lastTime: performance.now(),
        }
        setIsDragging(true)
        return
      }

      pinchRef.current = null
      dragRef.current = null
      setIsDragging(false)

      const velocity = dragVelocityRef.current
      dragVelocityRef.current = null
      if (!velocity) return
      const speed = Math.hypot(velocity.vx, velocity.vy)
      if (speed < INERTIA_MIN_SPEED) return
      startInertia(velocity.vx, velocity.vy)
    },
    [startInertia, startPinchGesture]
  )

  const handleTouchCancel = useCallback(() => {
    pinchRef.current = null
    dragRef.current = null
    dragVelocityRef.current = null
    setIsDragging(false)
  }, [])

  const { nodes, loadingIds, fetchChildren, fetchParents, getPersonById } = useFamilyTree({
    rootQId,
  })

  const selectedPerson = selectedNodeId ? getPersonById(selectedNodeId) : undefined
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : undefined

  const treeLayout = useMemo(() => computeTreeLayout(nodes), [nodes])
  const rawLayout = treeLayout.positions
  const { companions: companionMap, companionOf, companionChildGroups } = treeLayout
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

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      stopInertia()
      setSelectedNodeId(null)
      // Wait one frame so the drawer closes and the DOM reflects current positions
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        const nodeEl = containerRef.current.querySelector(
          `[data-node-id="${nodeId}"]`,
        )
        if (!nodeEl) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const nodeRect = nodeEl.getBoundingClientRect()
        const dx =
          containerRect.left + containerRect.width / 2 -
          (nodeRect.left + nodeRect.width / 2)
        const dy =
          containerRect.top + containerRect.height / 2 -
          (nodeRect.top + nodeRect.height / 2)
        setPosition((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy }
          positionRef.current = next
          return next
        })
      })
    },
    [stopInertia],
  )

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

    function drawFork(
      stemX: number,
      stemTopY: number,
      forkY: number,
      childEntries: { id: string; px: Px }[],
      parentIds: string[],
    ) {
      const gChildIds = childEntries.map((e) => e.id)
      out.push({ x1: stemX, y1: stemTopY, x2: stemX, y2: forkY, childIds: gChildIds, parentIds })

      if (childEntries.length === 1) {
        const { id, px: c } = childEntries[0]
        if (Math.abs(stemX - c.cx) < 1) {
          out.push({ x1: stemX, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
        } else {
          out.push({ x1: Math.min(stemX, c.cx), y1: forkY, x2: Math.max(stemX, c.cx), y2: forkY, childIds: [id], parentIds })
          out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
        }
      } else {
        const leftX = Math.min(stemX, ...childEntries.map((e) => e.px.cx))
        const rightX = Math.max(stemX, ...childEntries.map((e) => e.px.cx))
        out.push({ x1: leftX, y1: forkY, x2: rightX, y2: forkY, childIds: gChildIds, parentIds })
        for (const { id, px: c } of childEntries) {
          out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
        }
      }
    }

    const drawnCouples = new Set<string>()

    for (const node of nodes) {
      if (companionOf.has(node.id)) continue

      const parentPx = pixelPos.get(node.id)
      if (!parentPx) continue

      const comps = companionMap.get(node.id) ?? []
      const coupleKey = [node.id, ...comps].sort().join('|')
      if (drawnCouples.has(coupleKey)) continue
      drawnCouples.add(coupleKey)

      const allChildIdSet = new Set(node.parentOf ?? [])
      for (const cid of comps) {
        const comp = nodes.find((n) => n.id === cid)
        if (comp?.parentOf) comp.parentOf.forEach((id) => allChildIdSet.add(id))
      }
      if (allChildIdSet.size === 0) continue

      const coupleBottomY = parentPx.bottomY

      if (comps.length > 0) {
        const compPxList = comps.map((cid) => pixelPos.get(cid)).filter(Boolean) as Px[]
        const allCx = [parentPx.cx, ...compPxList.map((p) => p.cx)]
        const cplLeftX = Math.min(...allCx)
        const cplRightX = Math.max(...allCx)
        const allChildIds = [...allChildIdSet]
        const allParentIds = [node.id, ...comps]

        out.push({ x1: cplLeftX, y1: coupleBottomY, x2: cplRightX, y2: coupleBottomY, childIds: allChildIds, parentIds: allParentIds })

        const groups = companionChildGroups.get(node.id)

        if (groups && groups.length > 0) {
          const forkY = coupleBottomY + GAP / 2
          for (const group of groups) {
            const pairParentIds = group.compId ? [node.id, group.compId] : [node.id]
            let stemX: number
            if (group.compId) {
              const compPx = pixelPos.get(group.compId)
              stemX = compPx ? (parentPx.cx + compPx.cx) / 2 : parentPx.cx
            } else {
              stemX = parentPx.cx
            }

            const childEntries = group.childIds
              .map((id) => ({ id, px: pixelPos.get(id) }))
              .filter((e): e is { id: string; px: Px } => !!e.px && e.px.top > parentPx.top)

            if (childEntries.length === 0) continue
            drawFork(stemX, coupleBottomY, forkY, childEntries, pairParentIds)
          }
        } else {
          const childEntries = allChildIds
            .map((id) => ({ id, px: pixelPos.get(id) }))
            .filter((e): e is { id: string; px: Px } => !!e.px && e.px.top > parentPx.top)
          if (childEntries.length > 0) {
            const coupleMidX = (cplLeftX + cplRightX) / 2
            const forkY = coupleBottomY + GAP / 2
            drawFork(coupleMidX, coupleBottomY, forkY, childEntries, allParentIds)
          }
        }
      } else {
        const allChildIds = [...allChildIdSet]
        const parentIds = [node.id]
        const childEntries = allChildIds
          .map((id) => ({ id, px: pixelPos.get(id) }))
          .filter((e): e is { id: string; px: Px } => !!e.px && e.px.top > parentPx.top)

        if (childEntries.length === 0) continue

        if (childEntries.length === 1) {
          const { id, px: c } = childEntries[0]
          out.push({ x1: parentPx.cx, y1: coupleBottomY, x2: c.cx, y2: c.top, childIds: [id], parentIds })
        } else {
          const forkY = coupleBottomY + GAP / 2
          drawFork(parentPx.cx, coupleBottomY, forkY, childEntries, parentIds)
        }
      }
    }

    return out
  }, [nodes, pixelPos, companionMap, companionOf, companionChildGroups])

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
        <div style={{ marginLeft: 'auto' }}>
          <PersonSearchBar />
        </div>
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
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
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
                  data-node-id={node.id}
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
            fatherId={selectedNode?.fatherId}
            motherId={selectedNode?.motherId}
            getPersonById={getPersonById}
            onFocusNode={handleFocusNode}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
