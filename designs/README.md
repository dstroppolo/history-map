# History Map – Design Mockups

Mid-to-low fidelity Pencil designs for the History Map platform, based on the plan requirements.

## Files

**`history-map-screens.pen`** – Pencil design file (see below to create it in this folder)

**`pencil-new.pen`** – Your current Pencil session with the designs

### Creating the .pen file in this folder

The designs may be in your Pencil session (`pencil-new.pen`). To save a copy with a clearer name:

1. Open the **Pencil** panel/tab in Cursor (the design should be visible).
2. Use **File → Save As** (or equivalent) and save to:
   ```
   e:\Programming\history-map\designs\history-map-screens.pen
   ```

## Screens Included

### 1. Family Tree Page
- **Layout**: Youngest (modern) on the left, ancestors unfurl to the right
- **Branching**: Siblings shown at same level (e.g. Charles III, Anne, Andrew, Edward; Elizabeth II & Margaret)
- **Jump-to presets**: Charlemagne, Elizabeth II, Louis XIV
- **Tree canvas**: Person nodes with connecting arrows showing branching
- **Detail panel**: Slide-over panel from the right (dismissible, overlays content)

### 2. Timeline Page
- **Year scrubber**: Horizontal track with thumb (year 1776)
- **Event cards**: Grid of events for the selected year (e.g. American Revolution, Adam Smith, James Cook)
- **On this day**: Section with events for today's date in history
- **Hint**: "Click any event to explore in knowledge graph"

### 3. Map Page
- **Year filter**: "Events for year: 1776"
- **Map canvas**: Placeholder for world map with event markers
- **Side panel**: Location and event detail (e.g. Philadelphia – Declaration of Independence)

### 4. Detail Panel Variations (for feedback)
**Chosen: Option C – Slide-over panel**

Four options were presented; slide-over was selected for overlay behavior and dismissibility.

| Option | Description |
|--------|-------------|
| **A. Right sidebar** | Fixed panel on the right; always visible when an item is selected |
| **B. Bottom sheet** | Panel slides up from the bottom; good for mobile |
| **C. Slide-over** ✓ | Panel overlays from the right; more space, dismissible |
| **D. Modal** | Centered modal; focused view, blocks background |

## Proposed Color Palette (Classic Museum / Minimalist Historical)

| Use | Hex | Notes |
|-----|-----|-------|
| Background | `#FAFAF9` | Warm off-white |
| Card/panel | `#FFFFFF` | White |
| Muted surface | `#F5F5F4` | Light gray for buttons, cards |
| Border/divider | `#E7E5E4` | Stone gray |
| Secondary text | `#78716C` | Muted brown-gray |
| Body text | `#57534E` | Stone |
| Primary text | `#1C1917` | Near black |
| Accent (thumb, selected) | `#57534E` | Same as body for minimal accent |

## Typography
- **Font**: Inter (default in Pencil)
- **Weights**: 400 (body), 600 (headings, labels)

## Next Steps
1. Review the designs and detail panel options
2. Share feedback on layout, hierarchy, and panel placement
3. Iterate before moving to higher-fidelity design
