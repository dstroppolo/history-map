import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

const NODE_WIDTH = 220
const NODE_HEIGHT = 200
const GAP = 48

export interface LayoutPosition {
  x: number
  y: number
}

/**
 * Tree layout using a subtree-width algorithm:
 *
 * 1. Bottom-up: each node's subtree width = sum of its children's subtree
 *    widths + gaps, or NODE_WIDTH if it's a leaf.
 * 2. Top-down: each parent allocates horizontal space to its children
 *    proportional to their subtree widths, then centers itself over them.
 *
 * This guarantees nodes never overlap regardless of which branches are expanded.
 */
export function computeTreeLayout(
  nodes: FamilyTreeNodeData[]
): Map<string, LayoutPosition> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const positions = new Map<string, LayoutPosition>()

  const roots = nodes.filter((n) => n.childOf === undefined)
  if (roots.length === 0) return positions

  // Returns only the children that point back to this node via childOf
  // (structural children for layout). Other parents still draw lines
  // via parentOf but don't own the child in the tree structure.
  function structuralChildren(id: string): string[] {
    const node = nodeMap.get(id)
    return (node?.parentOf ?? []).filter((cid) => {
      const child = nodeMap.get(cid)
      return child && child.childOf === id
    })
  }

  // BFS to assign levels — only follow structural children
  const levelMap = new Map<string, number>()
  const queue = roots.map((r) => ({ id: r.id, level: 0 }))
  for (const r of roots) levelMap.set(r.id, 0)

  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    for (const cid of structuralChildren(id)) {
      if (!levelMap.has(cid)) {
        levelMap.set(cid, level + 1)
        queue.push({ id: cid, level: level + 1 })
      }
    }
  }

  // Non-structural parents (e.g. the mother when the child points to
  // the father via childOf) still need a level. Place them at the same
  // level as the structural parent they share children with.
  for (const node of nodes) {
    if (levelMap.has(node.id)) continue
    const childIds = (node.parentOf ?? []).filter((cid) => nodeMap.has(cid))
    for (const cid of childIds) {
      const childLevel = levelMap.get(cid)
      if (childLevel !== undefined) {
        levelMap.set(node.id, childLevel - 1)
        break
      }
    }
    if (!levelMap.has(node.id)) {
      levelMap.set(node.id, 0)
    }
  }

  // Memoised subtree width computation — structural children only
  const widthCache = new Map<string, number>()

  function subtreeWidth(id: string): number {
    const cached = widthCache.get(id)
    if (cached !== undefined) return cached

    const childIds = structuralChildren(id)

    if (childIds.length === 0) {
      widthCache.set(id, NODE_WIDTH)
      return NODE_WIDTH
    }

    const total =
      childIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
      (childIds.length - 1) * GAP

    widthCache.set(id, total)
    return total
  }

  // Top-down position assignment — structural children only
  function assignPositions(id: string, centerX: number) {
    const level = levelMap.get(id) ?? 0
    const y = level * (NODE_HEIGHT + GAP)
    positions.set(id, { x: centerX, y })

    const childIds = structuralChildren(id)
    if (childIds.length === 0) return

    const childWidths = childIds.map((cid) => subtreeWidth(cid))
    const totalWidth =
      childWidths.reduce((s, w) => s + w, 0) + (childIds.length - 1) * GAP

    let cursor = centerX - totalWidth / 2

    for (let i = 0; i < childIds.length; i++) {
      const childCenter = cursor + childWidths[i] / 2
      assignPositions(childIds[i], childCenter)
      cursor += childWidths[i] + GAP
    }
  }

  // Lay out all root subtrees side by side
  const rootWidths = roots.map((r) => subtreeWidth(r.id))
  const totalWidth =
    rootWidths.reduce((s, w) => s + w, 0) + (roots.length - 1) * GAP
  let cursor = -totalWidth / 2

  for (let i = 0; i < roots.length; i++) {
    const centerX = cursor + rootWidths[i] / 2
    assignPositions(roots[i].id, centerX)
    cursor += rootWidths[i] + GAP
  }

  return positions
}

export function getLayoutBounds(positions: Map<string, LayoutPosition>) {
  if (positions.size === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0 }
  }
  const coords = [...positions.values()]
  const minX = Math.min(...coords.map((p) => p.x)) - NODE_WIDTH / 2
  const maxX = Math.max(...coords.map((p) => p.x)) + NODE_WIDTH / 2
  const minY = Math.min(...coords.map((p) => p.y))
  const maxY = Math.max(...coords.map((p) => p.y)) + NODE_HEIGHT
  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
  }
}

export { NODE_WIDTH, NODE_HEIGHT, GAP }
