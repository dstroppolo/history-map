import { useState, useCallback, useEffect, useRef } from 'react'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'
import type { Person } from '@/types/person'
import { fetchPersonWithRelations, fetchEntities } from '@/services/wikidata'

interface UseFamilyTreeOptions {
  rootQId: string
}

export default function useFamilyTree({ rootQId }: UseFamilyTreeOptions) {
  const [nodes, setNodes] = useState<FamilyTreeNodeData[]>([])
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const personMap = useRef<Map<string, Person>>(new Map())

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
      personMap.current.set(rootQId, person)

      const rootNode: FamilyTreeNodeData = {
        id: rootQId,
        qId: rootQId,
        name: person.name,
        avatarUrl: person.imageUrl,
        birthYear: person.birthYear,
        deathYear: person.deathYear,
        title: person.title,
        houseId: person.houseId,
        houseLabel: person.houseLabel,
        childOf: undefined,
        parentOf: childIds.length > 0 ? childIds : undefined,
        childrenFetched: true,
        parentsFetched: false,
      }

      const childNodes: FamilyTreeNodeData[] = []
      if (childIds.length > 0) {
        const childPeople = await fetchEntities(childIds)
        childPeople.forEach((p, id) => personMap.current.set(id, p))
        for (const cid of childIds) {
          const cp = childPeople.get(cid)
          childNodes.push({
            id: cid,
            qId: cid,
            name: cp?.name ?? cid,
            avatarUrl: cp?.imageUrl,
            birthYear: cp?.birthYear,
            deathYear: cp?.deathYear,
            title: cp?.title,
            houseId: cp?.houseId,
            houseLabel: cp?.houseLabel,
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
    childPeople.forEach((p, id) => personMap.current.set(id, p))
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
          title: cp?.title,
          houseId: cp?.houseId,
          houseLabel: cp?.houseLabel,
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

    const parentPeople = await fetchEntities(parentIds)
    parentPeople.forEach((p, id) => personMap.current.set(id, p))
    const primaryId = parentIds[0]

    setNodes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id))
      const newParentNodes: FamilyTreeNodeData[] = []

      for (const pid of parentIds) {
        if (!existingIds.has(pid)) {
          const pp = parentPeople.get(pid)
          newParentNodes.push({
            id: pid,
            qId: pid,
            name: pp?.name ?? pid,
            avatarUrl: pp?.imageUrl,
            birthYear: pp?.birthYear,
            deathYear: pp?.deathYear,
            title: pp?.title,
            houseId: pp?.houseId,
            houseLabel: pp?.houseLabel,
            childOf: undefined,
            parentOf: [nodeId],
            childrenFetched: false,
            parentsFetched: false,
          })
        }
      }

      const parentIdSet = new Set(parentIds)

      const updated = prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, childOf: n.childOf ?? primaryId, parentsFetched: true }
        }
        // For existing parents, add this child to their parentOf
        if (parentIdSet.has(n.id)) {
          const existing = n.parentOf ?? []
          if (!existing.includes(nodeId)) {
            return { ...n, parentOf: [...existing, nodeId] }
          }
        }
        return n
      })

      return [...newParentNodes, ...updated]
    })
    removeLoading(nodeId)
  }, [nodes])

  const getPersonById = useCallback((id: string): Person | undefined => {
    return personMap.current.get(id)
  }, [])

  return { nodes, loadingIds, fetchChildren, fetchParents, getPersonById }
}
