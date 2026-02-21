import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

const NODE_WIDTH = 220
const NODE_HEIGHT = 200
const GAP = 48

export interface LayoutPosition {
  x: number
  y: number
}

/**
 * Computes positions for all nodes so that:
 * - Nodes at the same level are equidistant horizontally
 * - Parents are centered over their children
 * - Lines remain correct as the tree structure changes
 */
export function computeTreeLayout(
  nodes: FamilyTreeNodeData[]
): Map<string, LayoutPosition> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const positions = new Map<string, LayoutPosition>()

  const roots = nodes.filter((n) => n.childOf === undefined)
  if (roots.length === 0) return positions

  // BFS to assign levels and build level-order lists
  const levels: string[][] = []
  const levelMap = new Map<string, number>()
  const queue: { id: string; level: number }[] = roots.map((r) => ({ id: r.id, level: 0 }))

  for (const r of roots) {
    levelMap.set(r.id, 0)
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    if (!levels[level]) levels[level] = []
    levels[level].push(id)

    const node = nodeMap.get(id)
    const childIds = node?.parentOf ?? []
    for (const cid of childIds) {
      if (!levelMap.has(cid)) {
        levelMap.set(cid, level + 1)
        queue.push({ id: cid, level: level + 1 })
      }
    }
  }

  // Process from deepest level upward
  const maxLevel = levels.length - 1

  for (let L = maxLevel; L >= 0; L--) {
    const levelNodes = levels[L]
    if (!levelNodes?.length) continue

    if (L === maxLevel) {
      // Deepest level: equidistant horizontal positions
      const n = levelNodes.length
      const totalWidth = n * NODE_WIDTH + (n - 1) * GAP
      const startX = -totalWidth / 2 + NODE_WIDTH / 2

      levelNodes.forEach((id, i) => {
        const x = startX + i * (NODE_WIDTH + GAP)
        const y = L * (NODE_HEIGHT + GAP)
        positions.set(id, { x, y })
      })
    } else {
      // Parent level: center each parent over its children
      for (const id of levelNodes) {
        const node = nodeMap.get(id)
        const childIds = node?.parentOf ?? []

        if (childIds.length === 0) {
          // Leaf at non-bottom level - use position of single sibling or center
          const idx = levelNodes.indexOf(id)
          const n = levelNodes.length
          const totalWidth = n * NODE_WIDTH + (n - 1) * GAP
          const startX = -totalWidth / 2 + NODE_WIDTH / 2
          const x = startX + idx * (NODE_WIDTH + GAP)
          const y = L * (NODE_HEIGHT + GAP)
          positions.set(id, { x, y })
        } else {
          const childPositions = childIds
            .map((cid) => positions.get(cid))
            .filter((p): p is LayoutPosition => p != null)

          if (childPositions.length > 0) {
            const x =
              childPositions.reduce((s, p) => s + p.x, 0) / childPositions.length
            const y = L * (NODE_HEIGHT + GAP)
            positions.set(id, { x, y })
          }
        }
      }
    }
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
