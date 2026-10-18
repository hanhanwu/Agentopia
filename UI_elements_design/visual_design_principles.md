# Visual Design Principles

- Create and review designs in `UI_elements_design` before changing the UI.
- Do not integrate a design into the UI until the user approves it.
- Store visual design artifacts as `.svg` files only. Do not create PNG, JPG,
  PDF, or duplicate preview files.
- Save composed UI mockups in `UI_elements_design/draft/`. This includes full
  screens, panels, flows, and layouts intended to be implemented directly in
  the UI. The folder is gitignored, so these review drafts remain local and are
  not published.
- Save standalone reusable assets—such as logos, icons, and official marks—in
  the appropriate tracked subfolder outside `draft/`. These assets may be used
  directly by the production UI.
- After approval, implement a composed draft in the application. Do not copy
  the full mockup into a tracked design folder unless it becomes a production
  asset itself.
- Make visuals vivid and understandable with shapes first; avoid explanatory
  text unless a short label is required.
- Give different concepts distinct silhouettes. Do not reuse document-like
  imagery for multiple meanings.
- Use `discovery/discovery-mechanism-logos-v1.svg` as the style reference for
  discovery visuals: dark cards, restrained glow, monoline geometry, and its
  typography and spacing system.
- Keep simplified discovery paths faithful to the evidence. Show missing,
  failed, or conflicting branches instead of hiding them.
- Do not duplicate one artifact as two visual steps. For example, if a DNS SVCB
  card represents the returned hint, it is the DNS hint.

## Cross-step continuity is the default

- Treat a new numbered step as a state change inside the existing product, not
  as a new screen to redesign. Anything the request does not explicitly change
  must remain identical to the preceding step.
- Before designing or implementing a step, compare it with the immediately
  preceding live step and write a short `unchanged` / `new or changed` list.
  The `unchanged` list is binding. New CSS and markup may cover only the second
  list.
- Use this precedence when deciding appearance: the same live component in the
  preceding step, then the shared production component, then this document,
  then a new design. Do not invent a variant merely because the new step needs
  different content.
- Preserve these product-shell invariants across every desktop step:
  - Agentopia and Skynet remain equal-width columns. Keep `.studio` at two
    `minmax(0, 1fr)` tracks (50:50). Step-specific selectors must not change the
    panel ratio. Below the existing responsive breakpoint, preserve the shared
    stacking behavior rather than creating step-specific breakpoints.
  - Keep the Agentopia and Skynet panel headings, padding, borders, and internal
    content bounds unchanged.
  - Use the existing `.sync-phase` component for the Skynet top step label.
    Change only the step number, title, detail, and existing state modifier.
    Do not create a new badge, banner, or typography treatment for one step.
  - Use the existing `.timeline-card`, `.event-history__heading`, and
    `.event-history__item` markup and styles. Add the new event to that timeline;
    do not create a step-specific timeline layout or visual language unless the
    user explicitly approves one.
  - Render Mochi and other recurring agents with the existing `.world-agent`,
    `.avatar`, and `.world-agent__label` components. The bordered name-and-role
    tag is part of agent identity and must remain present and styled identically
    unless the user explicitly asks to change it.
- A step-specific selector may position or animate a shared component when the
  story requires it, but it must not silently restyle that component's label,
  typography, border, background, or internal structure.
- Keep a small visual-difference budget: the new step should introduce only the
  new evidence, state, and animation needed to explain that step. Reuse the
  surrounding layout and persistent controls without embellishment.

## Step state and replay behavior

- Entering or replaying a step must start at that step's own clean initial
  state. Clear transient visuals from earlier and later steps before its first
  frame is shown.
- A timeline click replays only the selected step. It must not briefly show the
  magnifier, domain, message flight, or other animation belonging to a previous
  step.
- Persistent controls and context—the two-panel shell, top step label, timeline,
  agent identity tags, and established card frames—remain visible unless the
  selected step's approved design explicitly removes them.
- When a step's animation completes, its final state remains visible until the
  user changes or replays the step. For example, opened doors stay open.
- Animate connected visuals from their semantic anchor. Speech begins at the
  character's mouth; connectors meet component centerlines; opening door leaves
  retain their frames. Check the first visible frame, motion path, and final
  frame for overlap or unintended occlusion.

## Reuse existing UI components

- Treat the live component already used in `apps/studio` as the source of truth
  for its shape, dimensions, spacing, typography, icon, and alignment. Do not
  redraw or approximate an existing component in a new path.
- Reuse the same renderer, markup, CSS class, and official asset whenever two
  paths share a component. Add a narrowly scoped modifier only when the shared
  component needs a genuine structural variation.
- Change only the inputs that are different in the evidence. For example:
  - An MCP endpoint keeps the existing endpoint-leaf layout, MCP logo, font,
    spacing, and arrow; only its endpoint URL changes.
  - A domain node keeps the existing domain-node layout, size, font, padding,
    and status treatment; only its domain text and mechanism color change.
  - A path connector keeps the existing connector geometry and alignment; only
    its mechanism color changes.
- Do not copy an existing component and then tune the copy independently.
  Shared components must continue to inherit later fixes from one source.
- Before creating a new visual, search `apps/studio/src/main.ts`,
  `apps/studio/src/styles.css`, and `UI_elements_design/discovery/official-marks`
  for an existing renderer, class, SVG geometry, or official asset to reuse.
- In design SVG source, add a comment naming the production renderer or CSS
  class being reused. This makes the intended implementation mapping explicit.

## Keep design SVGs identical to the real UI

- A review SVG is a specification for the production component, not a separate
  illustration. Use the same component proportions, font sizes, font weights,
  padding, gaps, colors, and rendered dimensions as the live UI.
- Use one source of SVG geometry. A new icon or card must have one canonical
  `viewBox` and one set of path coordinates shared by the review artifact and
  production. Scale it by changing only its rendered `width` and `height`; do
  not recreate the paths in a second coordinate system.
- If an existing logo or official mark is required, reference the same asset
  used by production. Do not trace, simplify, or substitute it in the review
  SVG.
- Match the production layout model. If the UI uses CSS Grid, reproduce its
  track ratios and fixed-space totals in the design. Matching `1fr` alone is
  insufficient when two layouts contain different fixed-width columns.
- Keep labels outside icon geometry unless the production component explicitly
  includes them. Labels must not change the icon's layout box or shift its
  center away from the connector centerline.
- Draw a connector as one continuous primitive whenever possible. Do not join
  independently scaled line and arrow fragments; this can create gaps, bends,
  or mismatched stroke weights.
- Align domain nodes, icons, connectors, and endpoint leaves to one explicit
  centerline. Verify the arrow enters and exits the visual center of each
  component.
- Design at the actual panel aspect ratio and minimum supported width. Check
  that long real values, such as `bookings.darknetian.com` and full endpoint
  URLs, stay inside their intended bounds without changing shared typography.

## Design-to-implementation parity check

Before requesting approval and again before handing off an implementation:

1. Record the preceding step's `unchanged` / `new or changed` list and confirm
   that no unrequested persistent component was redesigned.
2. Record which production renderer, CSS classes, and assets each visible
   component maps to.
3. Compare the review SVG and live UI values for `viewBox`, rendered size,
   typography, padding, gaps, border radius, stroke width, and color.
4. Confirm that shared components differ only in approved data or color inputs.
5. Confirm the desktop shell is still 50:50 and the existing responsive behavior
   is unchanged.
6. Compare the top step label, timeline, and every recurring agent identity tag
   directly against the preceding live step.
7. Confirm that every connector is straight or intentionally curved and meets
   both components without a gap or overlap.
8. Confirm that labels do not alter icon centering or connector alignment.
9. Replay the new step from its timeline item and confirm that no prior-step
   visual appears before the new step begins.
10. Test the real domain and endpoint strings at the panel's minimum width.
11. Run the production build and relevant tests after integration. XML
   validation of the review SVG alone is not visual-parity validation.
