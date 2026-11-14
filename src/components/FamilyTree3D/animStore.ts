import * as THREE from 'three'
import type { SceneGraph } from './treeGraph'

export interface AnimEntry {
  /** Where the person is right now. */
  cur: THREE.Vector3
  /** Where the layout wants them. */
  target: THREE.Vector3
}

/** Mutable per-frame state shared by medallions, bloodlines and the camera. */
export interface AnimStore {
  entries: Map<string, AnimEntry>
  /** True while any person is still gliding to their target. */
  moving: boolean
}

export function createAnimStore(): AnimStore {
  return { entries: new Map(), moving: true }
}

/**
 * Bring the store in line with a new layout. Existing people keep their
 * current position and glide to the new target. New people start at a
 * relative who is already on screen, or deep in the distance on first load.
 */
export function syncAnimStore(store: AnimStore, graph: SceneGraph): void {
  const existing = new Set(store.entries.keys())
  let fresh = 0

  for (const [id, [x, y, z]] of graph.targets) {
    const entry = store.entries.get(id)
    if (entry) {
      entry.target.set(x, y, z)
      continue
    }
    const relatives = [
      ...(graph.childrenOf.get(id) ?? []),
      ...(graph.parentsOf.get(id) ?? []),
    ]
    const originId = relatives.find((r) => existing.has(r))
    const origin = originId ? store.entries.get(originId) : undefined
    const target = new THREE.Vector3(x, y, z)
    const cur = origin
      ? origin.cur.clone()
      : new THREE.Vector3(x * 0.3, y * 0.3 - 2, z - 26 - Math.min(fresh, 8) * 5)
    store.entries.set(id, { cur, target })
    fresh += 1
  }

  for (const id of existing) {
    if (!graph.targets.has(id)) store.entries.delete(id)
  }
  store.moving = true
}

/** Advance every spring one frame. */
export function stepAnimStore(store: AnimStore, dt: number): void {
  let moving = false
  const k = 1 - Math.exp(-4.2 * dt)
  for (const entry of store.entries.values()) {
    if (entry.cur.distanceToSquared(entry.target) > 1e-6) {
      entry.cur.lerp(entry.target, k)
      moving = true
    } else {
      entry.cur.copy(entry.target)
    }
  }
  store.moving = moving
}
