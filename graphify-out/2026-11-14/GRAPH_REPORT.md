# Graph Report - history-map  (2026-11-14)

## Corpus Check
- Corpus is ~18,506 words - fits in a single context window. You may not need a graph.

## Summary
- 262 nodes · 452 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 15,000 input · 6,000 output

## Community Hubs (Navigation)
- Event Card & Detail UI
- Dev Tooling Dependencies
- Family Tree Entity Search
- Family Tree Navigation
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `compilerOptions` - 19 edges
3. `FamilyTreePage()` - 15 edges
4. `Event` - 11 edges
5. `framer-motion` - 10 edges
6. `react` - 10 edges
7. `computeTreeLayout()` - 10 edges
8. `react-router-dom` - 9 edges
9. `fetchPersonWithRelations()` - 9 edges
10. `History Map Royal Family Tree plan` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Timeline page screen mockup` --conceptually_related_to--> `World Timeline page (/ or /timeline)`  [INFERRED]
  designs/README.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `Family Tree page screen mockup` --conceptually_related_to--> `Royal Family Tree page (/family-tree)`  [INFERRED]
  designs/README.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `graphify skill (.claude/skills/graphify/SKILL.md)` --conceptually_related_to--> `graphify usage rules (project CLAUDE.md)`  [INFERRED]
  .claude/CLAUDE.md → CLAUDE.md
- `BranchingTree.tsx (current custom layout)` --conceptually_related_to--> `Royal Family Tree page (/family-tree)`  [INFERRED]
  docs/family-tree-library-options.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md
- `Map page screen mockup` --conceptually_related_to--> `Map page (/map)`  [INFERRED]
  designs/README.md → .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-linked feature pages** — cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_world_timeline_page, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_family_tree_page, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_map_page [INFERRED 0.75]
- **Cache and Wikidata data layer** — cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_cache_adapter, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_upstash_redis, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_supabase, cursor_plans_history_map_royal_family_tree_acdd2bdc_plan_wikidata [INFERRED 0.75]
- **Family tree layout library options** — docs_family_tree_library_options_branching_tree, docs_family_tree_library_options_react_flow_dagre, docs_family_tree_library_options_react_flow_elkjs, docs_family_tree_library_options_d3_hierarchy [INFERRED 0.75]

## Communities (16 total, 4 thin omitted)

### Community 0 - "Event Card & Detail UI"
Cohesion: 0.09
Nodes (37): EventCard(), EventCardProps, EventDetailPanel(), EventDetailPanelProps, config, dummyEventsByYear, dummyOnThisDay, useEventArticle() (+29 more)

### Community 1 - "Dev Tooling Dependencies"
Cohesion: 0.08
Nodes (32): devDependencies, eslint@^9.15.0, @eslint/js@^9.15.0, eslint-plugin-react-hooks@^5.0.0, eslint-plugin-react-refresh@^0.4.14, globals@^15.12.0, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+24 more)

### Community 2 - "Family Tree Entity Search"
Cohesion: 0.15
Nodes (25): EntityDetailPanelProps, PersonSearchBar(), useFamilyTree(), init(), UseFamilyTreeOptions, ClaimSnak, entityIsHuman(), entityToPerson() (+17 more)

### Community 3 - "Family Tree Navigation"
Cohesion: 0.12
Nodes (19): EntityDetailPanel(), FamilyTreeBreadcrumb(), FamilyTreeBreadcrumbProps, pathFromRootToSelected(), FamilyTreeNode(), FamilyTreeNodeProps, clampScale(), DragVelocity (+11 more)

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
Cohesion: 0.20
Nodes (12): dependencies, framer-motion@^11.11.17, react@^18.3.1, react-dom@^18.3.1, react-router-dom@^6.28.0, framer-motion, react, react-dom (+4 more)

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

## Ambiguous Edges - Review These
- `World Timeline page (/ or /timeline)` → `Map page (/map)`  [AMBIGUOUS]
  .cursor/plans/history_map_royal_family_tree_acdd2bdc.plan.md · relation: conceptually_related_to

## Knowledge Gaps
- **15 isolated node(s):** `graphify skill (.claude/skills/graphify/SKILL.md)`, `graphify query / path / explain commands`, `Upstash Redis (chosen cache backend)`, `Supabase (Postgres) cache option`, `config.ts (minYear, maxYear scope)` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 91 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Runtime Dependencies` to `Event Card & Detail UI`, `Dev Tooling Dependencies`, `Family Tree Entity Search`, `Family Tree Navigation`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **What connects `graphify skill (.claude/skills/graphify/SKILL.md)`, `graphify query / path / explain commands`, `Upstash Redis (chosen cache backend)` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Event Card & Detail UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09158186864014801 - nodes in this community are weakly interconnected._
- **Why does `@upstash/redis` connect `Events-by-Year API` to `Dev Tooling Dependencies`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Should `Dev Tooling Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._
- **Why does `framer-motion` connect `Runtime Dependencies` to `Event Card & Detail UI`, `Dev Tooling Dependencies`, `Family Tree Entity Search`, `Family Tree Navigation`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `World Timeline page (/ or /timeline)` and `Map page (/map)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._