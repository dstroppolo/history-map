import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

const NODE_WIDTH = 220
const NODE_HEIGHT = 200
const GAP = 48
const COUPLE_GAP = 24

export interface LayoutPosition {
  x: number
  y: number
}

export interface TreeLayoutResult {
  positions: Map<string, LayoutPosition>
  companions: Map<string, string[]>
  companionOf: Map<string, string>
}

/**
 * Tree layout with companion (spouse) positioning.
 *
 * Non-structural parents (nodes whose parentOf lists children that point
 * to a different structural parent via childOf) are detected as
 * "companions" and placed side-by-side with their structural partner.
 *
 * Subtree-width algorithm guarantees no overlaps.
 */
export function computeTreeLayout(
  nodes: FamilyTreeNodeData[]
): TreeLayoutResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const positions = new Map<string, LayoutPosition>()
  const companions = new Map<string, string[]>()
  const companionOf = new Map<string, string>()

  const empty: TreeLayoutResult = { positions, companions, companionOf }
  if (nodes.length === 0) return empty

  const allRoots = nodes.filter((n) => n.childOf === undefined)
  if (allRoots.length === 0) return empty

  function initialStructuralChildren(id: string): string[] {
    const node = nodeMap.get(id)
    return (node?.parentOf ?? []).filter((cid) => {
      const child = nodeMap.get(cid)
      return child && child.childOf === id
    })
  }

  // BFS to assign levels
  const levelMap = new Map<string, number>()
  const queue = allRoots.map((r) => ({ id: r.id, level: 0 }))
  for (const r of allRoots) levelMap.set(r.id, 0)

  while (queue.length > 0) {
    const { id, level } = queue.shift()!
    for (const cid of initialStructuralChildren(id)) {
      if (!levelMap.has(cid)) {
        levelMap.set(cid, level + 1)
        queue.push({ id: cid, level: level + 1 })
      }
    }
  }

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
    if (!levelMap.has(node.id)) levelMap.set(node.id, 0)
  }

  // Push root subtrees down when a cross-tree parent is at the same
  // level as (or below) its non-structural child.
  function subtreeRoot(nid: string): string {
    const n = nodeMap.get(nid)
    if (!n?.childOf) return nid
    return subtreeRoot(n.childOf)
  }

  function subtreeDescendants(rootId: string): string[] {
    const result = [rootId]
    const q = [rootId]
    while (q.length > 0) {
      const cur = q.shift()!
      for (const cid of initialStructuralChildren(cur)) {
        result.push(cid)
        q.push(cid)
      }
    }
    return result
  }

  const adjustedRoots = new Set<string>()
  for (const node of nodes) {
    const nodeLevel = levelMap.get(node.id)
    if (nodeLevel === undefined) continue
    const childIds = (node.parentOf ?? []).filter((cid) => nodeMap.has(cid))
    for (const cid of childIds) {
      const childLevel = levelMap.get(cid)
      if (childLevel === undefined) continue
      if (nodeLevel < childLevel) continue
      const cRoot = subtreeRoot(cid)
      if (cRoot === subtreeRoot(node.id)) continue
      if (adjustedRoots.has(cRoot)) continue
      adjustedRoots.add(cRoot)
      const offset = nodeLevel - childLevel + 1
      for (const did of subtreeDescendants(cRoot)) {
        const cur = levelMap.get(did)
        if (cur !== undefined) levelMap.set(did, cur + offset)
      }
    }
  }

  // Snap non-structural parents to their partner's level so they can
  // be detected as companions even when BFS placed them at level 0.
  for (const node of nodes) {
    if (initialStructuralChildren(node.id).length > 0) continue
    const childIds = (node.parentOf ?? []).filter((cid) => nodeMap.has(cid))
    if (childIds.length === 0) continue

    const firstChild = nodeMap.get(childIds[0])
    if (!firstChild?.childOf) continue
    if (firstChild.childOf === node.id) continue

    const partnerId = firstChild.childOf
    if (!nodeMap.has(partnerId)) continue

    const partnerLevel = levelMap.get(partnerId)
    if (partnerLevel !== undefined) levelMap.set(node.id, partnerLevel)
  }

  // Identify companions: non-structural parents that share children
  // with a structural parent at the same level.
  for (const node of nodes) {
    if (initialStructuralChildren(node.id).length > 0) continue
    const childIds = (node.parentOf ?? []).filter((cid) => nodeMap.has(cid))
    if (childIds.length === 0) continue

    const firstChild = nodeMap.get(childIds[0])
    if (!firstChild?.childOf) continue
    if (firstChild.childOf === node.id) continue

    const partnerId = firstChild.childOf
    if (!nodeMap.has(partnerId)) continue

    const partnerLevel = levelMap.get(partnerId)
    const nodeLevel = levelMap.get(node.id)
    if (partnerLevel === undefined || nodeLevel === undefined) continue
    if (partnerLevel !== nodeLevel) continue

    if (!companions.has(partnerId)) companions.set(partnerId, [])
    companions.get(partnerId)!.push(node.id)
    companionOf.set(node.id, partnerId)
  }

  for (const [cid, pid] of companionOf) {
    levelMap.set(cid, levelMap.get(pid) ?? 0)
  }

  // Structural children excluding companions
  function structuralChildren(id: string): string[] {
    const node = nodeMap.get(id)
    return (node?.parentOf ?? []).filter((cid) => {
      const child = nodeMap.get(cid)
      return child && child.childOf === id && !companionOf.has(cid)
    })
  }

  const roots = allRoots.filter((r) => !companionOf.has(r.id))
  if (roots.length === 0) return empty

  const widthCache = new Map<string, number>()

  function subtreeWidth(id: string): number {
    const cached = widthCache.get(id)
    if (cached !== undefined) return cached

    const comps = companions.get(id) ?? []
    const coupleW = NODE_WIDTH + comps.length * (NODE_WIDTH + COUPLE_GAP)

    const childIds = structuralChildren(id)

    if (childIds.length === 0) {
      widthCache.set(id, coupleW)
      return coupleW
    }

    const childrenTotal =
      childIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
      (childIds.length - 1) * GAP

    const total = Math.max(childrenTotal, coupleW)
    widthCache.set(id, total)
    return total
  }

  function assignPositions(id: string, centerX: number) {
    const level = levelMap.get(id) ?? 0
    const y = level * (NODE_HEIGHT + GAP)

    const comps = companions.get(id) ?? []
    if (comps.length > 0) {
      const coupleW = NODE_WIDTH + comps.length * (NODE_WIDTH + COUPLE_GAP)
      const startX = centerX - coupleW / 2 + NODE_WIDTH / 2
      positions.set(id, { x: startX, y })
      let cx = startX + NODE_WIDTH + COUPLE_GAP
      for (const cid of comps) {
        positions.set(cid, { x: cx, y })
        cx += NODE_WIDTH + COUPLE_GAP
      }
    } else {
      positions.set(id, { x: centerX, y })
    }

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

  const rootWidths = roots.map((r) => subtreeWidth(r.id))
  const totalWidth =
    rootWidths.reduce((s, w) => s + w, 0) + (roots.length - 1) * GAP
  let cursor = -totalWidth / 2

  for (let i = 0; i < roots.length; i++) {
    const centerX = cursor + rootWidths[i] / 2
    assignPositions(roots[i].id, centerX)
    cursor += rootWidths[i] + GAP
  }

  return { positions, companions, companionOf }
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

export { NODE_WIDTH, NODE_HEIGHT, GAP, COUPLE_GAP }
