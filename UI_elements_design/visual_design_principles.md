# Visual Design Principles

- Create and review designs in `UI_elements_design` before changing the UI.
- Do not integrate a design into the UI until the user approves it.
- Store visual design artifacts as `.svg` files only. Do not create PNG, JPG,
  PDF, or duplicate preview files.
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

1. Record which production renderer, CSS classes, and assets each visible
   component maps to.
2. Compare the review SVG and live UI values for `viewBox`, rendered size,
   typography, padding, gaps, border radius, stroke width, and color.
3. Confirm that shared components differ only in approved data or color inputs.
4. Confirm that every connector is straight or intentionally curved and meets
   both components without a gap or overlap.
5. Confirm that labels do not alter icon centering or connector alignment.
6. Test the real domain and endpoint strings at the panel's minimum width.
7. Run the production build and relevant tests after integration. XML
   validation of the review SVG alone is not visual-parity validation.
