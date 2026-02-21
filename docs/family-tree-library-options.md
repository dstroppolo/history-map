# Family Tree Layout: Open Source Library Options

This document evaluates open source libraries that could replace the custom layout in `BranchingTree.tsx` to fix:
- Edge lines disappearing when nodes expand
- Lines misaligned with images when multiple nodes are expanded on the same row

## Current Setup

- **Stack**: React 18, Vite, TypeScript, Framer Motion
- **Data model**: `TreeNode` with `parents[]` and `children[]` (bidirectional DAG)
- **Features**: Expand up (parents) / down (children), focal node, custom node UI with images

---

## Recommended Options

### 1. **React Flow + dagre** (Best fit for your use case)

**Packages**: `@xyflow/react` (or `reactflow`), `dagre`, `@types/dagre`

**Why it fits:**
- **Layout**: dagre is a battle-tested hierarchical layout engine. It handles DAGs, computes proper positions, and avoids the edge-clipping and misalignment issues you're seeing.
- **Edges**: React Flow renders edges from node positions—no manual SVG path math, no disappearing lines.
- **Custom nodes**: You keep your existing `TreeNodeComponent` as a custom React Flow node.
- **Dynamic graphs**: Re-run layout when the tree changes (expand/collapse).
- **Well maintained**: React Flow has 20k+ GitHub stars, active development.

**Data mapping:**
```ts
// Your TreeNode → React Flow
nodes: positions.map(p => ({
  id: p.node.id,
  type: 'treeNode',
  position: { x: p.x, y: p.y },
  data: { node: p.node }
}))
edges: flatMap of parent→child from your tree
```

**Integration effort**: Medium. You wrap your tree in `<ReactFlow>`, use dagre for layout, and register your `TreeNodeComponent` as a custom node type.

**Resources:**
- [React Flow Dagre example](https://reactflow.dev/examples/layout/dagre)
- [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes)
- [Nicholas Coughlin: React Flow + Dagre + Custom Nodes](https://ncoughlin.com/posts/react-flow-dagre-custom-nodes)

---

### 2. **React Flow + elkjs** (More powerful layout)

**Packages**: `@xyflow/react`, `elkjs`

**Why consider:**
- ELK (Eclipse Layout Kernel) offers more layout algorithms and tuning (spacing, alignment, ports).
- Better for very complex trees with many crossing edges.
- Heavier and more configurable than dagre.

**When to use**: If dagre still produces suboptimal layouts (e.g. too many crossings), elkjs is the next step.

**Resources:**
- [React Flow ELK example](https://reactflow.dev/examples/layout/elkjs)

---

### 3. **reactflow-family-tree**

**Package**: `reactflow-family-tree`

**Pros:**
- Built specifically for family trees.
- Supports complex couples, divorces, shared children.
- Non-colliding edges, color-coded branches, portrait images.
- Uses React Flow under the hood.

**Cons:**
- Different data format: `familyMembers` + `familyRelations` (not your `TreeNode`).
- Less flexible for custom UI (expand buttons, Wikidata integration).
- Low adoption (few weekly downloads).

**Data mapping:** You’d need an adapter from `TreeNode` → `familyMembers` / `familyRelations`.

**When to use**: If you want a ready-made family tree UI and can adapt your data model.

---

### 4. **d3-hierarchy** (Layout only)

**Package**: `d3-hierarchy`

**Approach:** Use only D3’s layout algorithms (`tree()`, `cluster()`) to compute `(x, y)` positions. Keep your current SVG + custom rendering.

**Pros:**
- Minimal change: replace `computeLayout` with a d3-hierarchy call.
- No new UI framework.
- Small bundle impact.

**Cons:**
- D3’s `tree()` expects a strict tree (one parent per node). Your DAG (multiple parents) needs extra handling (e.g. pick a primary parent for layout).
- You still maintain edge drawing logic—potential for alignment bugs if not careful.

---

## Recommendation Summary

| Option              | Effort | Fit for DAG | Edge handling | Custom UI |
|---------------------|--------|-------------|---------------|-----------|
| React Flow + dagre  | Medium | ✅          | Built-in      | Full      |
| React Flow + elkjs  | Medium | ✅          | Built-in      | Full      |
| reactflow-family-tree | Medium–High | ✅ | Built-in      | Limited   |
| d3-hierarchy        | Low    | Partial     | Manual        | Full      |

**Suggested path:** Start with **React Flow + dagre**. It directly addresses layout and edge issues, lets you keep your custom nodes, and is widely used and maintained. If dagre’s layout is not good enough, switch to elkjs with minimal code changes.

---

## Quick Start: React Flow + dagre

```bash
npm install @xyflow/react dagre
npm install -D @types/dagre
```

```tsx
// Layout helper
import dagre from 'dagre'

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 96, height: 72 })
  })
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: { x: nodeWithPosition.x - 48, y: nodeWithPosition.y - 36 }
    }
  })
}
```

Then convert your `TreeNode` graph to React Flow nodes/edges, run `getLayoutedElements`, and render with `<ReactFlow>`.
