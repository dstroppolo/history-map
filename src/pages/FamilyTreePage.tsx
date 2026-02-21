import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import FamilyTreeNode from '@/components/FamilyTree/FamilyTreeNode'
import useFamilyTree from '@/hooks/useFamilyTree'
import {
  computeTreeLayout,
  getLayoutBounds,
  NODE_WIDTH,
  NODE_HEIGHT,
} from '@/utils/familyTreeLayout'

const GEORGE_VI_QID = 'Q280856'

const MIN_SCALE = 0.3
const LINE_WIDTH = 2
const GAP = 48
const MAX_SCALE = 3
const ZOOM_STEP = 0.15

export default function FamilyTreePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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
      setPosition({
        x: dragRef.current.x + e.clientX - dragRef.current.startX,
        y: dragRef.current.y + e.clientY - dragRef.current.startY,
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

  const { nodes, loadingIds, fetchChildren, fetchParents } = useFamilyTree({
    rootQId: GEORGE_VI_QID,
  })

  const rawLayout = useMemo(() => computeTreeLayout(nodes), [nodes])
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

  const lines = useMemo(() => {
    const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    for (const node of nodes) {
      const childIds = node.parentOf
      if (!childIds?.length) continue

      const parentPx = pixelPos.get(node.id)
      if (!parentPx) continue

      const parentBottomX = parentPx.cx
      const parentBottomY = parentPx.bottomY

      if (childIds.length === 1) {
        const childPx = pixelPos.get(childIds[0])
        if (childPx) {
          out.push({
            x1: parentBottomX,
            y1: parentBottomY,
            x2: childPx.cx,
            y2: childPx.top,
          })
        }
      } else {
        const childPxList = childIds
          .map((id) => pixelPos.get(id))
          .filter(Boolean) as Array<{ left: number; top: number; cx: number }>

        if (childPxList.length === 0) continue

        const forkY = parentBottomY + GAP / 2
        const leftX = Math.min(...childPxList.map((c) => c.cx))
        const rightX = Math.max(...childPxList.map((c) => c.cx))

        // Vertical line from parent bottom to fork
        out.push({ x1: parentBottomX, y1: parentBottomY, x2: parentBottomX, y2: forkY })
        // Horizontal line across children
        out.push({ x1: leftX, y1: forkY, x2: rightX, y2: forkY })
        // Vertical lines from fork down to each child
        for (const c of childPxList) {
          out.push({ x1: c.cx, y1: forkY, x2: c.cx, y2: c.top })
        }
      }
    }

    return out
  }, [nodes, pixelPos])

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
              {lines.map((line, i) => (
                <line
                  key={i}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="var(--color-border)"
                  strokeWidth={LINE_WIDTH}
                />
              ))}
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
                >
                  <FamilyTreeNode
                    {...node}
                    loading={loadingIds.has(node.id)}
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
    </motion.div>
  )
}
