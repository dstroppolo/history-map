# Graph Report - history-map  (2026-11-14)

## Corpus Check
- 47 files · ~22,013 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .pen 2, .css 2, .graphify-bak 1)

## Summary
- 338 nodes · 651 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 15,000 input · 6,000 output

## Graph Freshness
- Built from commit: `bbaec97d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Event Card & Detail UI
- Dev Tooling Dependencies
- Family Tree Entity Search
- FamilyTreePage.tsx
- Royal Family Tree Plan
- TypeScript Root Config
- TypeScript App Config
- Runtime Dependencies
- Events-by-Year API
- Tree Layout Algorithm
- Graphify Tooling Docs
- Cache Backend Options
- Pencil Design Files
- Deployment Rewrites
- Classic Museum Palette
- DynastyScene.tsx
- Medallion.tsx
- Family Tree 3D "Dynasty Space" — Design

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `compilerOptions` - 19 edges
3. `react` - 15 edges
4. `FamilyTreeNodeData` - 13 edges
5. `FamilyTreePage()` - 11 edges
6. `Event` - 11 edges
7. `framer-motion` - 10 edges
8. `react-router-dom` - 10 edges
9. `SceneContent()` - 10 edges
10. `Medallion()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Family Tree page screen mockup` --conceptually_related_to--> `Royal Family Tree page (/family-tree)`  [INFERRED]
  designs/README.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `Timeline page screen mockup` --conceptually_related_to--> `World Timeline page (/ or /timeline)`  [INFERRED]
  designs/README.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `graphify skill (.claude/skills/graphify/SKILL.md)` --conceptually_related_to--> `graphify usage rules (project CLAUDE.md)`  [INFERRED]
  .claude/CLAUDE.md → CLAUDE.md
- `BranchingTree.tsx (current custom layout)` --conceptually_related_to--> `Royal Family Tree page (/family-tree)`  [INFERRED]
  docs/family-tree-library-options.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `BranchingTree.tsx (current custom layout)` --conceptually_related_to--> `Framer Motion / GSAP animations`  [INFERRED]
  docs/family-tree-library-options.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cache and Wikidata data layer** — cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_cache_adapter, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_upstash_redis, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_supabase, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_wikidata [INFERRED 0.75]
- **Family tree layout library options** — docs_family_tree_library_options_branching_tree, docs_family_tree_library_options_react_flow_dagre, docs_family_tree_library_options_react_flow_elkjs, docs_family_tree_library_options_d3_hierarchy [INFERRED 0.75]
- **Cross-linked feature pages** — cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_world_timeline_page, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_family_tree_page, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_map_page [INFERRED 0.75]

## Communities (19 total, 4 thin omitted)

### Community 0 - "Event Card & Detail UI"
Cohesion: 0.09
Nodes (37): framer-motion, EventCard(), EventCardProps, EventDetailPanel(), EventDetailPanelProps, config, dummyEventsByYear, dummyOnThisDay (+29 more)

### Community 1 - "Dev Tooling Dependencies"
Cohesion: 0.07
Nodes (34): devDependencies, eslint@^9.15.0, @eslint/js@^9.15.0, eslint-plugin-react-hooks@^5.0.0, eslint-plugin-react-refresh@^0.4.14, globals@^15.12.0, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+26 more)

### Community 2 - "Family Tree Entity Search"
Cohesion: 0.13
Nodes (28): EntityDetailPanel(), EntityDetailPanelProps, DynastyPanelProps, PersonSearchBar(), useFamilyTree(), init(), UseFamilyTreeOptions, ClaimSnak (+20 more)

### Community 3 - "FamilyTreePage.tsx"
Cohesion: 0.17
Nodes (14): DynastyPanel(), DynastyScene(), Nebula(), housesOf(), FamilyTreeBreadcrumb(), FamilyTreeBreadcrumbProps, pathFromRootToSelected(), FamilyTreePage() (+6 more)

### Community 4 - "Royal Family Tree Plan"
Cohesion: 0.11
Nodes (26): config.ts (minYear, maxYear scope), Royal Family Tree page (/family-tree), Framer Motion / GSAP animations, GraphNode and generic edge model, History Map Royal Family Tree plan, Map page (/map), On This Day feature, Path between two nodes (+18 more)

### Community 5 - "TypeScript Root Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 6 - "TypeScript App Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+12 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (15): dependencies, framer-motion@^11.11.17, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.0, @react-three/postprocessing@^2.19.1, three@^0.169.0, react (+7 more)

### Community 8 - "Events-by-Year API"
Cohesion: 0.17
Nodes (14): cleanWikitext(), config, fetchEventsForYear(), handler(), MONTH_NAMES, parseDatePrefix(), parseWikitextEvents(), TimelineEvent (+6 more)

### Community 9 - "Tree Layout Algorithm"
Cohesion: 0.43
Nodes (8): computeTreeLayout(), assignPositions(), childGroupsFor(), initialStructuralChildren(), structuralChildren(), subtreeDescendants(), subtreeRoot(), subtreeWidth()

### Community 10 - "Graphify Tooling Docs"
Cohesion: 0.67
Nodes (3): graphify skill (.claude/skills/graphify/SKILL.md), graphify query / path / explain commands, graphify usage rules (project CLAUDE.md)

### Community 11 - "Cache Backend Options"
Cohesion: 0.67
Nodes (3): CacheAdapter interface, Supabase (Postgres) cache option, Upstash Redis (chosen cache backend)

### Community 16 - "DynastyScene.tsx"
Cohesion: 0.10
Nodes (40): @react-three/drei@^9.122.0, @react-three/fiber@^8.18.0, @react-three/drei, @react-three/fiber, three, AnimStore, createAnimStore(), stepAnimStore() (+32 more)

### Community 17 - "Medallion.tsx"
Cohesion: 0.19
Nodes (20): AnimEntry, damp(), ExpandButton(), ExpandButtonProps, Medallion(), MedallionProps, setCursor(), canvasTexture() (+12 more)

### Community 18 - "Family Tree 3D "Dynasty Space" — Design"
Cohesion: 0.29
Nodes (6): Behaviour, Family Tree 3D "Dynasty Space" — Design, Goal, Kept as is, New, Risks

## Ambiguous Edges - Review These
- `Map page (/map)` → `World Timeline page (/ or /timeline)`  [AMBIGUOUS]
  .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md · relation: conceptually_related_to

## Knowledge Gaps
- **15 isolated node(s):** `graphify query / path / explain commands`, `graphify skill (.claude/skills/graphify/SKILL.md)`, `Supabase (Postgres) cache option`, `Upstash Redis (chosen cache backend)`, `Pencil design tool` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 105 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Runtime Dependencies` to `Event Card & Detail UI`, `Dev Tooling Dependencies`, `Family Tree Entity Search`, `FamilyTreePage.tsx`, `DynastyScene.tsx`, `Medallion.tsx`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **What connects `graphify query / path / explain commands`, `graphify skill (.claude/skills/graphify/SKILL.md)`, `Supabase (Postgres) cache option` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Event Card & Detail UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09250693802035152 - nodes in this community are weakly interconnected._
- **Why does `@upstash/redis` connect `Events-by-Year API` to `Dev Tooling Dependencies`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Dev Tooling Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07357357357357357 - nodes in this community are weakly interconnected._
- **Why does `framer-motion` connect `Event Card & Detail UI` to `Dev Tooling Dependencies`, `Family Tree Entity Search`, `FamilyTreePage.tsx`, `Runtime Dependencies`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Map page (/map)` and `World Timeline page (/ or /timeline)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._