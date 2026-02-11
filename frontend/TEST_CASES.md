# Rocket Engine Monitor - UI Test Cases

**Last Updated:** 2026-02-10
**Purpose:** Regression testing for Failure Analysis visualization

---

## Test Environment Setup

**Backend:**
```bash
cd backend
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Access:** http://localhost:3000

---

## Test Suite 1: Initial Load & Layout

### TC-001: Page Loads Successfully
**Steps:**
1. Navigate to http://localhost:3000
2. Wait for page to load

**Expected:**
- ✅ Page loads within 5 seconds
- ✅ Header shows "🚀 Rocket Engine Monitor"
- ✅ Subtitle shows "Failure Detection & Alert System"
- ✅ Subtitle aligns below title text (NOT below rocket emoji)
- ✅ Left sidebar shows 3 view buttons: Failure Analysis, Network View, Table View
- ✅ Failure Analysis button is highlighted (red border)

**Priority:** P0 (Blocker)

---

### TC-002: Graph Loads with All Nodes Visible
**Steps:**
1. Load the page
2. Wait for graph to render
3. Check viewport

**Expected:**
- ✅ Graph loads within 30 seconds (database query timeout)
- ✅ All nodes are visible in initial viewport (no nodes cut off at bottom)
- ✅ Graph is centered with padding around edges
- ✅ LOX_Tank, Temp_Sensor_A, Temp_Sensor_B, Temp_Sensor_C all visible without scrolling

**Priority:** P0 (Blocker)

---

### TC-003: Node Sizes and Readability
**Steps:**
1. Load the page
2. Inspect node sizes and text

**Expected:**
- ✅ Nodes are 80×80 pixels (large enough to read)
- ✅ Font size is 14px (easily readable)
- ✅ Component labels are legible (e.g., "LOX Tank", "LPOTP", "Temp Sensor A")
- ✅ Border width is 4px (prominent)

**Priority:** P1 (High)

---

## Test Suite 2: Stage 1 - Failed Sensor Detection

### TC-004: Only 3 Failed Sensors Highlighted
**Steps:**
1. Load the page (default: Stage 1)
2. Count red nodes

**Expected:**
- ✅ Exactly 3 nodes are RED: Temp_Sensor_A, Temp_Sensor_B, Temp_Sensor_C
- ✅ All other nodes are GREY (dimmed at 30% opacity)
- ✅ Top-right info shows "Failed: 3"
- ✅ No additional sensors incorrectly highlighted

**Priority:** P0 (Blocker)

---

### TC-005: Failed Sensor Styling
**Steps:**
1. Load the page
2. Inspect failed sensor nodes

**Expected:**
- ✅ Failed sensors have red background (#ef4444)
- ✅ Failed sensors have red border (#dc2626)
- ✅ Failed sensors are fully opaque (opacity: 1)
- ✅ Failed sensors have 3px border

**Priority:** P1 (High)

---

## Test Suite 3: Sensor Click Interaction

### TC-006: Click Temp_Sensor_A Shows Full Chain
**Steps:**
1. Load the page
2. Click on Temp_Sensor_A node
3. Observe highlighting

**Expected:**
- ✅ Temp_Sensor_A: Bright RED (selected)
- ✅ Direct parents: Highlighted RED (e.g., Fuel_Coolant_Valve_A)
- ✅ Grandparents: Highlighted RED (e.g., HPOTP)
- ✅ Great-grandparents: Highlighted RED (e.g., LOX_Tank, LPOTP)
- ✅ **Complete chain** highlighted, not just direct parent
- ✅ Other failed sensors dimmed (violet at 40%)
- ✅ Edges in chain highlighted RED
- ✅ Other edges dimmed (grey at 10%)

**Priority:** P0 (Blocker)

---

### TC-007: Click Temp_Sensor_B Shows Full Chain
**Steps:**
1. Load the page
2. Click on Temp_Sensor_B node
3. Observe highlighting

**Expected:**
- ✅ Temp_Sensor_B: Bright RED (selected)
- ✅ **All ancestors** highlighted (not just direct parent)
- ✅ Edges connect sensor → parents → grandparents → root
- ✅ No broken chains (all levels highlighted)

**Priority:** P0 (Blocker)

---

### TC-008: Click Temp_Sensor_C Shows Full Chain
**Steps:**
1. Load the page
2. Click on Temp_Sensor_C node
3. Observe highlighting

**Expected:**
- ✅ Temp_Sensor_C: Bright RED (selected)
- ✅ Full ancestor chain highlighted
- ✅ All propagation paths visible

**Priority:** P0 (Blocker)

---

### TC-009: Click Same Sensor Deselects
**Steps:**
1. Load the page
2. Click Temp_Sensor_A (highlights chain)
3. Click Temp_Sensor_A again

**Expected:**
- ✅ Returns to Stage 1 default view
- ✅ All 3 failed sensors RED
- ✅ Chain highlighting removed

**Priority:** P1 (High)

---

### TC-010: Click Non-Failed Node Does Nothing
**Steps:**
1. Load the page
2. Click on LOX_Tank (not a failed sensor)

**Expected:**
- ✅ No change to visualization
- ✅ Only failed sensors are clickable

**Priority:** P2 (Medium)

---

## Test Suite 4: Hotspot Panel

### TC-011: Hotspots Panel Shows Components
**Steps:**
1. Load the page
2. Check right sidebar "Hotspots" section

**Expected:**
- ✅ Section header: "Hotspots"
- ✅ Shows 5 convergence point hotspots (components affected by ALL 3 sensors)
- ✅ Each hotspot shows component name (bold blue text)
- ✅ Each hotspot shows ALL affected sensors (Sensor A, Sensor B, Sensor C)
- ✅ **No "+1" or sensor count text** - all sensors displayed
- ✅ **No yellow impact score badges** (removed as requested)
- ✅ Right padding applied (pr-8) to accommodate scrollbar

**Priority:** P1 (High)

---

### TC-012: Alert Notification Displayed
**Steps:**
1. Load the page
2. Check alert notification card at top of right sidebar

**Expected:**
- ✅ Orange border and background with bell icon 🔔
- ✅ Shows "ALERT SENT" header
- ✅ Displays team leader name (e.g., "Laura Grey")
- ✅ Shows team (e.g., "Team Leader of MainChainTeam")
- ✅ Lists "Sensors Failed:" with red badges (Sensor A, Sensor B, Sensor C)
- ✅ Shows "Likely Root Cause:" with component name
- ✅ All data comes from API (not hardcoded)

**Priority:** P0 (Blocker)

---

### TC-013: Root Cause Card Displayed
**Steps:**
1. Load the page
2. Check "LIKELY ROOT CAUSE" card in right sidebar

**Expected:**
- ✅ Header reads "LIKELY ROOT CAUSE" (not just "Root Cause")
- ✅ Shows **LOX_Tank** (component with 0 parents = true root cause)
- ✅ **NOT LPOTP, HPOTP**, or other components with parents
- ✅ **"Affected by:" label** appears above sensor badges
- ✅ Red border and background
- ✅ Shows ALL affected sensors as red badges (Sensor A, Sensor B, Sensor C)
- ✅ **No "Impact Score: 3" text** (removed)

**Priority:** P0 (Blocker - Root cause logic critical)

---

## Test Suite 5: Performance & Stability

### TC-014: No Infinite Re-rendering
**Steps:**
1. Load the page
2. Open browser DevTools Console
3. Observe for 30 seconds

**Expected:**
- ✅ No continuous console errors
- ✅ No websocket connection spam
- ✅ No continuous page reloads
- ✅ Backend logs show only 1-2 `/failure-analysis` API calls
- ✅ Frontend logs show stable render cycles

**Priority:** P0 (Blocker)

---

### TC-015: API Timeout Handling
**Steps:**
1. Stop backend server
2. Load the page
3. Wait 30 seconds

**Expected:**
- ✅ Shows loading spinner for up to 30 seconds
- ✅ After 30s, shows timeout error message
- ✅ Does not hang indefinitely

**Priority:** P1 (High)

---

### TC-016: Graph Performance with 30+ Nodes
**Steps:**
1. Load the page
2. Interact with graph (zoom, pan, click)
3. Measure responsiveness

**Expected:**
- ✅ Graph renders within 100ms after data loads
- ✅ Zoom/pan is smooth (no lag)
- ✅ Click interactions respond immediately (<100ms)
- ✅ No dropped frames during layout animation

**Priority:** P1 (High)

---

## Test Suite 6: Browser Compatibility

### TC-017: Chrome Compatibility
**Browser:** Chrome 120+
**Expected:** All TC-001 through TC-015 pass

**Priority:** P0 (Blocker)

---

### TC-018: Firefox Compatibility
**Browser:** Firefox 121+
**Expected:** All TC-001 through TC-015 pass
**Known Issue:** WebSocket HMR issues in dev mode (not production blocker)

**Priority:** P1 (High)

---

### TC-019: Safari Compatibility
**Browser:** Safari 17+
**Expected:** All TC-001 through TC-015 pass

**Priority:** P1 (High)

---

## Test Suite 7: View Switching

### TC-020: Switch to Network View
**Steps:**
1. Load the page (Failure Analysis active)
2. Click "Network View" button

**Expected:**
- ✅ Switches to dependency graph view
- ✅ Network View button highlighted (blue border)
- ✅ Subtitle changes to "Component Dependency Network"

**Priority:** P1 (High)

---

### TC-021: Switch to Table View
**Steps:**
1. Load the page
2. Click "Table View" button

**Expected:**
- ✅ Switches to table view
- ✅ Table View button highlighted (green border)
- ✅ Subtitle changes to "Component Relationship Table"

**Priority:** P1 (High)

---

### TC-022: Switch Back to Failure Analysis
**Steps:**
1. Load the page
2. Click "Network View"
3. Click "Failure Analysis" button

**Expected:**
- ✅ Returns to Failure Analysis view
- ✅ Graph re-renders correctly
- ✅ Failed sensors still highlighted
- ✅ No loss of data or state

**Priority:** P1 (High)

---

## Test Suite 8: Visual Regression

### TC-023: Nodes Not Cut Off at Bottom
**Steps:**
1. Load the page
2. Check if LOX_Tank, Temp_Sensor_C, and bottom nodes are visible

**Expected:**
- ✅ All nodes fully visible without scrolling
- ✅ Graph is zoomed out to fit all nodes (minZoom: 0.3)
- ✅ 15% padding around graph edges

**Priority:** P0 (Blocker)

---

### TC-024: Subtitle Alignment
**Steps:**
1. Load the page
2. Check subtitle position

**Expected:**
- ✅ Subtitle text aligns with "Rocket Engine Monitor" text
- ✅ Subtitle does NOT align below rocket emoji
- ✅ Left padding: 2.5em applied

**Priority:** P2 (Medium)

---

## Test Suite 9: Data Accuracy

### TC-025: Correct Failed Sensor Count
**Steps:**
1. Load the page
2. Verify API response

```bash
curl http://localhost:8000/failure-analysis | python3 -m json.tool
```

**Expected:**
- ✅ `stage1.failedSensors` contains exactly 3 items
- ✅ Items: ["Temp_Sensor_A", "Temp_Sensor_B", "Temp_Sensor_C"]
- ✅ No additional sensors incorrectly marked as failed

**Priority:** P0 (Blocker)

---

### TC-026: Failure Chain Accuracy
**Steps:**
1. Load the page
2. Verify propagation chains

**Expected:**
- ✅ Each failed sensor has parent chains
- ✅ Chains follow component dependency structure
- ✅ Recursive chains include all levels (parent, grandparent, great-grandparent)

**Priority:** P0 (Blocker)

---

### TC-027: Root Cause Selection Logic
**Steps:**
1. Load the page
2. Open browser DevTools Console
3. Run this command:

```javascript
// Get failure analysis data
fetch('http://localhost:8000/failure-analysis')
  .then(r => r.json())
  .then(data => {
    const hotspots = data.stage3.hotspots;
    const chains = data.stage2.failureChains;

    console.log('=== HOTSPOTS ===');
    hotspots.forEach(h => {
      const parentCount = chains.filter(c => c.child === h.component).length;
      console.log(`${h.component}: impact=${h.impactScore}, parents=${parentCount}`);
    });

    // Calculate expected root cause
    const maxImpact = Math.max(...hotspots.map(h => h.impactScore));
    const rootCause = hotspots
      .filter(h => h.impactScore === maxImpact)
      .reduce((best, h) => {
        const parentCount = chains.filter(c => c.child === h.component).length;
        const bestParentCount = chains.filter(c => c.child === best.component).length;
        return parentCount < bestParentCount ? h : best;
      });

    console.log('\n=== EXPECTED ROOT CAUSE ===');
    console.log(rootCause.component);
  });
```

**Expected:**
- ✅ Console shows LOX_Tank with 0 parents
- ✅ All other hotspots have 1+ parents (LPOTP: 1, HPOTP: 1, etc.)
- ✅ Expected root cause: LOX_Tank
- ✅ "Likely Root Cause" card in UI matches console output

**Priority:** P0 (Blocker)

---

### TC-028: Graph Layout - Horizontal Spread
**Steps:**
1. Load the page
2. Observe node distribution in graph

**Expected:**
- ✅ Nodes are spread horizontally (not clustered in single vertical line)
- ✅ LOX_Tank at TOP of graph
- ✅ Temp_Sensor_A/B/C at BOTTOM of graph
- ✅ Intermediate components distributed between top and bottom
- ✅ No excessive horizontal clustering
- ✅ Arrow length is short (rankSep: 15)
- ✅ All nodes visible without scrolling

**Priority:** P1 (High)

---

### TC-029: Browser Cache Verification
**Steps:**
1. Make code changes to FailureAnalysisView.tsx
2. Save file
3. Do SOFT refresh (F5 or Cmd+R)
4. Check if changes apply

**Expected:**
- ❌ Changes may NOT apply (JavaScript cached)

**Then:**
1. Do HARD refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Check if changes apply

**Expected:**
- ✅ Changes now apply
- ✅ Root cause shows LOX_Tank (not LPOTP)
- ✅ Layout matches new config
- ✅ "Affected by:" label appears

**Priority:** P2 (Medium) - Documentation/Process

**Note:** Always use hard refresh after code changes to avoid stale JavaScript cache.

---

## Regression Test Checklist

Run before each release:

- [ ] All P0 tests pass (Blockers)
- [ ] All P1 tests pass (High Priority)
- [ ] No console errors in browser
- [ ] Backend logs show no 500 errors
- [ ] Page loads within 5 seconds
- [ ] Graph renders within 30 seconds
- [ ] All nodes visible without scrolling
- [ ] Clicking sensors shows FULL chain (not just direct parent)
- [ ] No infinite re-rendering
- [ ] Alert notification shows team leader from database
- [ ] "Likely Root Cause" displays ALL sensors (not impact score)
- [ ] Hotspot panel shows 5 convergence points with ALL sensors
- [ ] No "+1" text or yellow badges
- [ ] Right sidebar has proper padding (pr-8) with scrollbar space
- [ ] **Root cause is LOX_Tank (0 parents), NOT LPOTP/HPOTP**
- [ ] "Affected by:" label appears in Root Cause card
- [ ] Graph nodes spread horizontally (not single vertical line)
- [ ] Layout: nodeSep=120, rankSep=15, rankDir='BT'
- [ ] Hard refresh (Cmd+Shift+R) loads latest JavaScript changes

---

## Known Issues (Non-Blocking)

1. **Next.js HMR WebSocket** - Firefox dev mode may show websocket errors. Restart dev server to fix. Not a production issue.
2. **Database Query Timeout** - First load may take 25-30s due to PostgreSQL/MariaDB/Neo4j queries. This is expected behavior.

---

## Automation Recommendations

**Tools:**
- Playwright or Cypress for E2E tests
- Jest + React Testing Library for component tests
- Percy or Chromatic for visual regression

**Priority Tests to Automate:**
1. TC-004: Only 3 failed sensors highlighted
2. TC-006/007/008: Full chain highlighting on click
3. TC-012: Alert notification displays with correct data
4. TC-013: Root cause shows all sensors (not impact score)
5. TC-014: No infinite re-rendering
6. TC-023: Nodes not cut off
7. TC-025: Correct failed sensor count

---

## Test Data

**Expected Failed Sensors:**
- Temp_Sensor_A
- Temp_Sensor_B
- Temp_Sensor_C

**Expected Hotspots (Convergence Points - All 5):**
1. LOX_Tank (Root Cause)
2. LOX_Supply_Line
3. LPOTP
4. LPOTP_Discharge
5. HPOTP

Note: These are components affected by ALL 3 failed sensors (convergence points)

**Total Components:** ~31 nodes
**Total Edges:** ~34 failure chains
