# Agentopia Visual Design Rules

Follow this file for every Agentopia UI design or implementation task.

## Mandatory workflow

1. **Inspect before editing**
   - Read the request and every named reference file.
   - Inspect both the reference source and its rendered result.
   - Search `apps/studio/src/main.ts`, `apps/studio/src/styles.css`, and
     `UI_elements_design/discovery/official-marks` for reusable components and
     assets.
2. **Record constraints**
   - Write a short `unchanged` and `changed` list. Treat `unchanged` as binding.
   - Record exact measurements for referenced geometry, including node sizes,
     padding, gaps, connector lengths, centerlines, type, colors, and markers.
   - Freeze every property the user did not ask to change.
3. **Design first**
   - Create or update the review SVG in `UI_elements_design/draft/`.
   - Render and inspect it at the target size and minimum supported width.
   - Do not implement it until the user approves the design.
4. **Implement from the approved measurements**
   - Reuse existing renderers, classes, and official assets.
   - Apply the same measurements to the SVG and production UI. Do not tune
     them independently.
5. **Verify before handoff**
   - Render the live UI and compare it with the approved SVG side by side.
   - Run the relevant build and tests.
   - Report any visual verification that could not be completed.

Builds, tests, and valid SVG syntax do not prove visual correctness. Never
claim a visual is correct without inspecting a rendered result.

## Source of truth

Use this order when deciding how something should look:

1. The user's latest explicit instruction
2. The named reference file
3. The same component in the preceding live step
4. The shared production component
5. These rules

Treat a reference as a geometry contract, not general inspiration. “Use the
same design” means reuse its construction, proportions, spacing, typography,
stroke, and arrow marker. If references conflict, identify the conflict before
designing instead of combining them into a new variant.

## Files and assets

- Store visual designs as SVG only. Do not create PNG, JPG, PDF, or duplicate
  preview files.
- Store composed review mockups in `UI_elements_design/draft/`. This folder is
  local and gitignored.
- Store reusable logos, icons, and official marks in the appropriate tracked
  folder outside `draft/`.
- Use the same official asset in the review SVG and production. Never redraw,
  simplify, or substitute an existing logo.
- Add an SVG comment naming the production renderer or CSS class represented
  by each reused component.

## Preserve product continuity

A new step is a state change, not a new product screen. Keep everything in the
`unchanged` list identical to the preceding step.

- Keep desktop Agentopia and Skynet panels at 50:50 with two
  `minmax(0, 1fr)` tracks. Preserve the existing responsive breakpoint.
- Keep shared panel headings, padding, borders, and content bounds unchanged.
- Reuse `.sync-phase`, `.timeline-card`, `.event-history__heading`, and
  `.event-history__item` unless the approved design explicitly removes them.
- Render recurring agents with `.world-agent`, `.avatar`, and
  `.world-agent__label`. Preserve their identity labels unless explicitly
  changed.
- Step-specific CSS may position or animate a shared component. It must not
  silently restyle its typography, border, background, label, or structure.
- Introduce only the visual evidence and state required for the new step.

## Reuse and parity

- The live shared component is the source of truth for its shape, size,
  spacing, type, icon, and alignment.
- Reuse the same renderer, markup, class, SVG geometry, and asset. Do not copy a
  component and tune the copy separately.
- Change only data or properties named by the user. For example, an MCP endpoint
  keeps its layout and logo when only its URL changes.
- A review SVG is a production specification, not a separate illustration.
  Match production dimensions, padding, gaps, radius, type, stroke, and color.
- Use one canonical `viewBox` and path geometry for each reusable SVG asset.
  Scale it through rendered width and height only.
- If production uses CSS Grid, reproduce its fixed tracks and gaps in the SVG.
  Matching only flexible proportions is insufficient.

## Visual language and text

- Use `discovery/discovery-mechanism-logos-v1.svg` as the discovery style
  reference: dark cards, restrained glow, monoline geometry, and its spacing
  and typography system.
- Prefer shapes, position, color, motion, and distinct silhouettes over
  explanatory text.
- Do not add helper copy, captions, route narration, or text that repeats what
  the visual already shows.
- Visible text is limited to names, concrete values, user content, domains,
  endpoints, necessary status values, and interactive labels unless the user
  explicitly requests explanatory copy.
- Provide accessibility text through semantic HTML, `aria-label`, or visually
  hidden content instead of visible redundant microcopy.
- Keep discovery visuals faithful to the evidence. Show failures, missing
  branches, and conflicts rather than hiding them.
- Do not show one artifact as two different steps. A DNS SVCB card representing
  a returned hint is the DNS hint.

## Discovery-path geometry

Before drawing or changing a path, record each node's `x`, width, right edge,
following connector length, and centerline `y`.

Use these constraints:

- `right edge = x + width`
- `next x = right edge + connector length`
- `path width = all node widths + all connector lengths`
- A connector starts at the preceding node's right edge and ends at the next
  node's left edge. Its arrowhead is part of the connector.
- Connectors requested as equal must share one length token.
- Linear nodes and connectors share one centerline. Branch centerlines must be
  explicit.
- A connector should be one continuous primitive, not separately scaled line
  and arrow fragments.
- Lengthening connectors increases the total path width unless the user also
  permits another dimension to change.
- When any node or connector width changes, recalculate every downstream
  position. Do not patch coordinates independently.

Fit a path in this order:

1. Preserve required node sizes and content padding.
2. Preserve requested connector lengths and equality.
3. Increase the path or card width if needed.
4. Use overflow only when already supported or explicitly approved.

Never solve crowding with overlaps, clipped content, disconnected arrows, or
unrequested resizing.

## Content fit

- Size nodes using the final text, type, icon size, and padding.
- A node must fully contain every label, logo, and status without collision.
- Domains and endpoints required on one line must use `nowrap` and have enough
  width for the complete real value.
- Do not make content fit through clipping, text stretching, or compressed
  letter spacing.
- `Wider` and `longer` change horizontal width. `Taller` changes height.
  `Shorter arrow` changes connector length. Do not reinterpret these terms.
- If the user freezes element sizes, preserve node width, height, type, icon
  size, and padding. Change only the named geometry.
- After three revisions to the same relationship, stop making local patches.
  Rebuild and verify the full path geometry.

## State and animation

- Entering or replaying a step starts from that step's clean initial state.
- A timeline click replays only the selected step. Do not flash visuals from
  another step.
- Keep persistent context visible unless the approved design removes it.
- Hold the completed state until the user changes or replays the step.
- Animate from semantic anchors. Speech starts at the mouth, connectors meet
  centerlines, and opening elements retain their frames.
- Inspect the first frame, motion path, and final frame for overlap or occlusion.

## Required visual QA

Before showing a design or handing off an implementation, every applicable item
must pass:

- The result was rendered and inspected at the target and minimum widths.
- The review SVG and live UI match in geometry, type, spacing, assets, and data.
- The latest request changed only authorized properties.
- Every box fully contains its real content.
- Required one-line values do not wrap, clip, truncate, or overlap.
- Every connector touches both adjacent nodes and uses the correct centerline.
- Connectors that should be equal have equal visible lengths.
- Arrow stroke, arrowhead, and color match the named reference.
- Official marks are present, undistorted, and centered.
- Paths do not collide with headings, agents, badges, or card edges.
- The full path uses the intended card width without unintended empty space.
- The desktop shell, responsive behavior, and unchanged components remain
  intact.
- Step replay begins cleanly and ends in the correct persistent state.
- The production build and relevant tests pass.

If rendering or browser inspection is unavailable, complete static checks but
state that visual QA is pending. Do not present the result as approved or
visually complete.
