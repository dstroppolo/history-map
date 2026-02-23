import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

const NODE_WIDTH = 220
const NODE_HEIGHT = 200
const GAP = 48
const COUPLE_GAP = 24

export interface LayoutPosition {
  x: number
  y: number
}

export interface CompanionChildGroup {
  compId: string | null
  childIds: string[]
}

export interface TreeLayoutResult {
  positions: Map<string, LayoutPosition>
  companions: Map<string, string[]>
  companionOf: Map<string, string>
  /** Children grouped by companion pair for each structural parent that has companions. */
  companionChildGroups: Map<string, CompanionChildGroup[]>
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

  const companionChildGroups = new Map<string, CompanionChildGroup[]>()

  const empty: TreeLayoutResult = { positions, companions, companionOf, companionChildGroups }
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

  const GROUP_GAP = GAP * 1.5

  function childGroupsFor(parentId: string): CompanionChildGroup[] {
    const comps = companions.get(parentId) ?? []
    const allChildren = structuralChildren(parentId)
    if (comps.length === 0) {
      return allChildren.length > 0
        ? [{ compId: null, childIds: allChildren }]
        : []
    }

    const compSet = new Set(comps)
    const compChildMap = new Map<string | null, string[]>()

    for (const cid of allChildren) {
      const child = nodeMap.get(cid)
      const otherId =
        child?.fatherId === parentId ? child?.motherId :
        child?.motherId === parentId ? child?.fatherId :
        undefined
      const matchedComp =
        otherId && compSet.has(otherId) ? otherId : null
      const list = compChildMap.get(matchedComp) ?? []
      list.push(cid)
      compChildMap.set(matchedComp, list)
    }

    const groups: CompanionChildGroup[] = []
    for (const comp of comps) {
      const children = compChildMap.get(comp)
      if (children?.length) groups.push({ compId: comp, childIds: children })
    }
    const ungrouped = compChildMap.get(null)
    if (ungrouped?.length) groups.push({ compId: null, childIds: ungrouped })

    if (groups.length > 0) {
      companionChildGroups.set(parentId, groups)
    }
    return groups
  }

  const widthCache = new Map<string, number>()

  function subtreeWidth(id: string): number {
    const cached = widthCache.get(id)
    if (cached !== undefined) return cached

    const comps = companions.get(id) ?? []
    const coupleW = NODE_WIDTH + comps.length * (NODE_WIDTH + COUPLE_GAP)

    const groups = childGroupsFor(id)
    const totalChildCount = groups.reduce((s, g) => s + g.childIds.length, 0)

    if (totalChildCount === 0) {
      widthCache.set(id, coupleW)
      return coupleW
    }

    let childrenTotal = 0
    for (const group of groups) {
      const groupW =
        group.childIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
        (group.childIds.length - 1) * GAP
      childrenTotal += groupW
    }
    if (groups.length > 1) {
      childrenTotal += (groups.length - 1) * GROUP_GAP
    }

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

    const groups = childGroupsFor(id)
    const totalChildCount = groups.reduce((s, g) => s + g.childIds.length, 0)
    if (totalChildCount === 0) return

    const groupWidths = groups.map((g) =>
      g.childIds.reduce((sum, cid) => sum + subtreeWidth(cid), 0) +
      (g.childIds.length - 1) * GAP
    )

    let totalWidth = groupWidths.reduce((s, w) => s + w, 0)
    if (groups.length > 1) totalWidth += (groups.length - 1) * GROUP_GAP

    let cursor = centerX - totalWidth / 2

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      const childWidths = group.childIds.map((cid) => subtreeWidth(cid))

      for (let i = 0; i < group.childIds.length; i++) {
        const childCenter = cursor + childWidths[i] / 2
        assignPositions(group.childIds[i], childCenter)
        cursor += childWidths[i] + GAP
      }

      if (gi < groups.length - 1) {
        cursor += GROUP_GAP - GAP
      }
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

  return { positions, companions, companionOf, companionChildGroups }
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
