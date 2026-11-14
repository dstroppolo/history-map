import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { computeTreeLayout } from '@/utils/familyTreeLayout'

/** Layout pixels → world units. */
const SX = 1 / 80
const SY = 1 / 70
const DEPTH_CURVE = 0.012
const MAX_DEPTH = 14

export type Vec3 = [number, number, number]

export interface Thread {
  id: string
  childId: string
  parentIds: string[]
}

export interface Couple {
  id: string
  a: string
  b: string
}

export interface SceneGraph {
  targets: Map<string, Vec3>
  parentsOf: Map<string, string[]>
  childrenOf: Map<string, string[]>
  threads: Thread[]
  couples: Couple[]
}

/** Depth of the curved tree surface at a given world x. */
export function depthAt(x: number): number {
  return -Math.min(x * x * DEPTH_CURVE, MAX_DEPTH)
}

/**
 * Turn the flat tree layout into 3D targets anchored on the root person
 * (so the root stays put as relatives are revealed), plus the relationship
 * lists the scene draws.
 */
export function buildSceneGraph(
  nodes: FamilyTreeNodeData[],
  rootId: string,
): SceneGraph {
  const targets = new Map<string, Vec3>()
  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const threads: Thread[] = []
  const couples: Couple[] = []

  const { positions } = computeTreeLayout(nodes)
  if (positions.size === 0) {
    return { targets, parentsOf, childrenOf, threads, couples }
  }

  const anchor = positions.get(rootId) ?? [...positions.values()][0]
  for (const [id, p] of positions) {
    const x = (p.x - anchor.x) * SX
    const y = -(p.y - anchor.y) * SY
    targets.set(id, [x, y, depthAt(x)])
  }

  const link = (parentId: string, childId: string) => {
    if (!targets.has(parentId) || !targets.has(childId)) return
    const ps = parentsOf.get(childId) ?? []
    if (!ps.includes(parentId)) ps.push(parentId)
    parentsOf.set(childId, ps)
    const cs = childrenOf.get(parentId) ?? []
    if (!cs.includes(childId)) cs.push(childId)
    childrenOf.set(parentId, cs)
  }

  for (const node of nodes) {
    for (const cid of node.parentOf ?? []) link(node.id, cid)
    if (node.childOf) link(node.childOf, node.id)
  }

  const seenCouples = new Set<string>()
  for (const [childId, parentIds] of parentsOf) {
    const pair = parentIds.slice(0, 2)
    threads.push({ id: `t:${childId}`, childId, parentIds: pair })
    if (pair.length === 2) {
      const key = [...pair].sort().join('|')
      if (!seenCouples.has(key)) {
        seenCouples.add(key)
        couples.push({ id: `c:${key}`, a: pair[0], b: pair[1] })
      }
    }
  }

  return { targets, parentsOf, childrenOf, threads, couples }
}

/** A person plus all their ancestors and descendants. */
export function lineageOf(graph: SceneGraph, id: string): Set<string> {
  const out = new Set<string>([id])
  const walk = (start: string, edges: Map<string, string[]>) => {
    const queue = [start]
    while (queue.length > 0) {
      const cur = queue.pop()!
      for (const next of edges.get(cur) ?? []) {
        if (!out.has(next)) {
          out.add(next)
          queue.push(next)
        }
      }
    }
  }
  walk(id, graph.parentsOf)
  walk(id, graph.childrenOf)
  return out
}

const HOUSE_PALETTE = [
  '#E8C170',
  '#5FA8FF',
  '#E0566F',
  '#4FD1A1',
  '#A98BFF',
  '#FF9B5E',
  '#4FC8D9',
  '#F08BC0',
]
export const NO_HOUSE_COLOR = '#B9B4C7'

export interface House {
  id: string
  label: string
  color: string
}

/** Houses in order of first appearance, each with a stable colour. */
export function housesOf(nodes: FamilyTreeNodeData[]): House[] {
  const seen = new Map<string, string>()
  for (const node of nodes) {
    if (node.houseId && !seen.has(node.houseId)) {
      seen.set(node.houseId, node.houseLabel ?? node.houseId)
    }
  }
  // Colour comes from the house's own id, so it never changes as more
  // houses are revealed.
  return [...seen.entries()].map(([id, label]) => ({
    id,
    label,
    color: HOUSE_PALETTE[(parseInt(id.slice(1), 10) || 0) % HOUSE_PALETTE.length],
  }))
}
