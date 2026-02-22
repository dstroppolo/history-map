import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

interface FamilyTreeBreadcrumbProps {
  nodes: FamilyTreeNodeData[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}

/** Path from root to selected node (walking childOf upward). */
function pathFromRootToSelected(
  nodes: FamilyTreeNodeData[],
  selectedNodeId: string | null
): FamilyTreeNodeData[] {
  if (!selectedNodeId) return []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const path: FamilyTreeNodeData[] = []
  let id: string | undefined = selectedNodeId
  while (id) {
    const node = nodeMap.get(id)
    if (!node) break
    path.unshift(node)
    id = node.childOf
  }
  return path
}

export default function FamilyTreeBreadcrumb({
  nodes,
  selectedNodeId,
  onSelectNode,
}: FamilyTreeBreadcrumbProps) {
  const path = pathFromRootToSelected(nodes, selectedNodeId)
  if (path.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        fontSize: 13,
        color: 'var(--color-secondary)',
        marginBottom: 8,
      }}
    >
      {path.map((node, i) => (
        <span key={node.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && (
            <span style={{ color: 'var(--color-border)' }} aria-hidden>
              /
            </span>
          )}
          <button
            type="button"
            onClick={() => onSelectNode(node.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
              color: i === path.length - 1 ? 'var(--color-primary)' : 'var(--color-accent)',
              textDecoration: i === path.length - 1 ? 'none' : 'underline',
              cursor: 'pointer',
            }}
          >
            {node.name}
          </button>
        </span>
      ))}
    </nav>
  )
}
