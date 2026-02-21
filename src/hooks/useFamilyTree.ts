import { useState, useCallback, useEffect } from 'react'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import { fetchPersonWithRelations, fetchEntities } from '@/services/wikidata'

interface UseFamilyTreeOptions {
  rootQId: string
}

export default function useFamilyTree({ rootQId }: UseFamilyTreeOptions) {
  const [nodes, setNodes] = useState<FamilyTreeNodeData[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const addLoading = (id: string) =>
    setLoadingIds((s) => new Set(s).add(id))
  const removeLoading = (id: string) =>
    setLoadingIds((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })

  // Initial fetch of the root person + children
  useEffect(() => {
    let cancelled = false

    async function init() {
      addLoading(rootQId)

      const result = await fetchPersonWithRelations(rootQId)
      if (cancelled || !result) {
        removeLoading(rootQId)
        return
      }

      const { person, childIds } = result

      const rootNode: FamilyTreeNodeData = {
        id: rootQId,
        qId: rootQId,
        name: person.name,
        avatarUrl: person.imageUrl,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        childOf: undefined,
        parentOf: childIds.length > 0 ? childIds : undefined,
        childrenFetched: true,
        parentsFetched: false,
      }

      const childNodes: FamilyTreeNodeData[] = []
      if (childIds.length > 0) {
        const childPeople = await fetchEntities(childIds)
        for (const cid of childIds) {
          const cp = childPeople.get(cid)
          childNodes.push({
            id: cid,
            qId: cid,
            name: cp?.name ?? cid,
            avatarUrl: cp?.imageUrl,
            birthYear: cp?.birthYear,
            deathYear: cp?.deathYear,
            childOf: rootQId,
            parentOf: undefined,
            childrenFetched: false,
            parentsFetched: false,
          })
        }
      }

      if (!cancelled) {
        setNodes([rootNode, ...childNodes])
        removeLoading(rootQId)
      }
    }

    init()
    return () => { cancelled = true }
  }, [rootQId])

  const fetchChildren = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node?.qId || node.childrenFetched) return

    addLoading(nodeId)

    const result = await fetchPersonWithRelations(node.qId)
    if (!result) {
      removeLoading(nodeId)
      return
    }

    const { childIds } = result

    if (childIds.length === 0) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, childrenFetched: true } : n
        )
      )
      removeLoading(nodeId)
      return
    }

    const childPeople = await fetchEntities(childIds)
    const existingIds = new Set(nodes.map((n) => n.id))

    const newChildren: FamilyTreeNodeData[] = childIds
      .filter((cid) => !existingIds.has(cid))
      .map((cid) => {
        const cp = childPeople.get(cid)
        return {
          id: cid,
          qId: cid,
          name: cp?.name ?? cid,
          avatarUrl: cp?.imageUrl,
          birthYear: cp?.birthYear,
          deathYear: cp?.deathYear,
          childOf: nodeId,
          parentOf: undefined,
          childrenFetched: false,
          parentsFetched: false,
        }
      })

    setNodes((prev) => [
      ...prev.map((n) =>
        n.id === nodeId
          ? { ...n, parentOf: childIds, childrenFetched: true }
          : n
      ),
      ...newChildren,
    ])
    removeLoading(nodeId)
  }, [nodes])

  const fetchParents = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node?.qId || node.parentsFetched) return

    addLoading(nodeId)

    const result = await fetchPersonWithRelations(node.qId)
    if (!result) {
      removeLoading(nodeId)
      return
    }

    const { parentIds } = result

    if (parentIds.length === 0) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, parentsFetched: true } : n
        )
      )
      removeLoading(nodeId)
      return
    }

    const existingIds = new Set(nodes.map((n) => n.id))
    const parentPeople = await fetchEntities(parentIds)
    const newParentNodes: FamilyTreeNodeData[] = []

    // First parent is the "structural" parent (child.childOf points here).
    // Second parent is the partner — same level, draws lines, but child
    // doesn't point to them via childOf so layout doesn't double-count.
    const primaryId = parentIds[0]

    for (const pid of parentIds) {
      if (existingIds.has(pid)) {
        // Already in the tree — just add the child to their parentOf
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === pid) {
              const existing = n.parentOf ?? []
              return existing.includes(nodeId)
                ? n
                : { ...n, parentOf: [...existing, nodeId] }
            }
            return n
          })
        )
      } else {
        const pp = parentPeople.get(pid)
        newParentNodes.push({
          id: pid,
          qId: pid,
          name: pp?.name ?? pid,
          avatarUrl: pp?.imageUrl,
          birthYear: pp?.birthYear,
          deathYear: pp?.deathYear,
          childOf: undefined,
          parentOf: [nodeId],
          childrenFetched: false,
          parentsFetched: false,
        })
      }
    }

    setNodes((prev) => [
      ...newParentNodes,
      ...prev.map((n) =>
        n.id === nodeId
          ? { ...n, childOf: primaryId, parentsFetched: true }
          : n
      ),
    ])
    removeLoading(nodeId)
  }, [nodes])

  return { nodes, loadingIds, fetchChildren, fetchParents }
}
