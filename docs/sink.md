# The sink

The Sink page in [examples/site](../examples/site) is a **1:1 port of
[ui-sdk.dev/sink](https://ui-sdk.dev/sink)**: the same **145 tiles**, the same ids, titles, blurbs,
sizes and tones, the same bento grid and the same floating filter. The tiles are rendered with
`foldkit-ui-sdk` bindings instead of `@ui-sdk/react`; the CSS is copied verbatim from
`apps/docs/app/sink`, so the look is the reference's look.

Open **Sink** in the top navigation, or deep-link straight to a tile or a group:

| URL | What it shows |
| --- | --- |
| `/sink` | The full 145-tile grid |
| `/sink?only=reference` | Only the reference group |
| `/sink?only=forms` | A group (`reference`, `forms`, `overlays`, `collections`, `motion`, `language`, `drag`, `studio`) |
| `/sink?only=forms-checkout` | One tile |
| `/sink?uses=Dialog` | Tiles that use any selected name |
| `/sink?uses=Dialog,Menu&mode=all` | Tiles that use every selected name |

The filter is the reference filter: every component/helper name on a tile is a `tile-use` button,
pressing one opens the dark floating bar at the bottom, and the bar lists the selected names with an
`Any / All` control and a clear button.

The filter is route state, not Model state: `src/route.ts` declares the `Sink` route with its
`?only=` / `?uses=` / `?mode=` query params through the same bidirectional router that parses them,
and a filter change returns a `ReplaceUrl` command that writes the sink's next URL (replacing the
history entry, so filtering never walls the back button up). The URL change re-parses into the
route, so a shared link and the page it opens can never disagree — and a `?only=` / `?uses=` link
cold-loads straight into the filtered sink.

## How it is wired

```
examples/site/src/sink/
├── bento.css              # copied from the reference
├── compat.css             # the few Web Component/React differences, documented below
├── class-bridge.ts        # copies classes onto display:contents inner controls
├── fonts.css              # Geist Sans/Mono/Serif/Pixel
├── meta.ts                # generated from the reference's 145 tile records
├── registry.ts            # the reference registry: interleave, featured, uses ordering
├── types.ts               # Tile, TileContext, TileSize, TileTone
├── uses.ts                # copied from bento/uses.generated.ts
├── view.ts                # the bento, tile frame, error boundary and filter
└── tiles/*.ts + *.css     # one port per reference file, CSS copied verbatim
```

Each tile is a `Tile` with its own initial state. The state lives in the Model at
`model.sinkTiles[tile.id]`; `set(next | current => next)` dispatches `SinkTileStateSet`, so a
component's interaction still travels update → view like the rest of the site. The registry applies
`meta.ts` to every tile, which is why the port cannot drift in copy, size or tone even if a tile
module's local metadata is edited.

The tile list itself is a contract: [tests/reference-sink-tiles.json](../tests/reference-sink-tiles.json)
is the reference page's 145 records, in order, and `tests/site.spec.ts` compares the rendered tiles
against it: ids, order, sizes, tones, titles and blurbs. A second test drives representative
interactions from every group (parent checkboxes, brand presets, meters, scroll pickers and the
scripted agent).

The type is the reference's Geist (Sans, Mono, Serif, Pixel Square) served from
`examples/site/public/fonts`; icons use the Phosphor web font, the same set the reference imports
from `@phosphor-icons/react`.

## Web Component / React differences

The reference demos were written against unstyled React parts. Our Web Components bring UI SDK's
default theme, and a few parts wrap their real control in a `display: contents` host. Two small
bridges keep the copied CSS honest:

- **`class-bridge.ts`** copies a host's classes onto its inner control for `ui-toggle`, `ui-button`,
  `ui-input`, `ui-textarea`, and any part that computes to `display: contents` (menu triggers,
  dialog closes, pagination links, …). Without it, `.ref-tool`, `.b-btn` and `.b-input` would sit on
  an element with no box.
- **`compat.css`** removes the few UI SDK defaults the reference CSS does not reset: the calendar
  card, the 28rem carousel max-width and its grid/centering, the listbox/scroll-area chrome, the
  meter's minimum width, and the timeline/wheel track backgrounds. It also pins the tile stage's
  grid track to the tile width so wide demos cannot push the layout outside the card.

These are presentation adapters only. They do not move state or change a binding's behavior.

## Port notes

The reference files use React hooks, `@ui-sdk/react` components and a few React-only helpers. The
port keeps the markup, class names, `data-*` hooks and CSS, and replaces the behavior:

- `Slider`, `Switch`, `Toggle`, `Toolbar`, `Meter`, `Dialog`, `Menu`, `Calendar`, `Tree`, … are the
  Web Component bindings from `foldkit-ui-sdk`.
- `useState` becomes the tile's Model slice.
- React-only helpers (`usePreference`, `useShortcutHint`, `useAsyncOptions`, `createParts`,
  `createVirtualizer`, `createStickToBottom`, `createLazy…`) are replaced by their observable
  behavior, a `@ui-sdk/core` helper, or a small imperative setup in `h.OnMount`.
- Pointer/gesture demos that used `bindDrag`, `scrubTo`, `solveSpring`, `projectDistance`,
  `bindScrollPicker`, `bindHold`, `bindRepeat`, etc. use the real core helpers, with the live state
  read from the Model rather than a render-stale closure.
- Async work (the cropped avatar, timers, toasts, the scripted agent) runs from an `OnMount`
  listener or a timer that dispatches a Message when it settles.
- Template-cloning components use real template content
  (`h.template([h.InnerHTML('<ui-…></ui-…>')])`), because `h.template` children do not reach
  `HTMLTemplateElement.content`.

Every approximation is marked `// PORT NOTE` in its tile file. The larger ones are:

| Area | Approximation |
| --- | --- |
| Canvas, week and slide editors | Pan/zoom and drag/move handled with native pointer listeners; a few keyboard-only affordances (the canvas `C` connector key) are reduced |
| Board / outline | Drop lands at the end of the hovered column; tree depth snaps instead of free nesting |
| Virtualized film / ten-thousand tracks | A windowed range replaces `createVirtualizer`; the overscan and centering match |
| History / activity | A Model-owned log replaces the React history controller; replayed entries are synthesized |
| Shortcut hints | `aria-keyshortcuts` and static keycaps replace `useShortcutHint` in a few tiles |
| Announcements | New log lines announce on mount; the reference's timed `announce()` clear is dropped |
| Command line | The recall cursor lives in a mount bridge because `OnKeyDown` has no native event for IME composition |

## Binding gaps the port surfaced

The reference's compositions exercise the same binding gaps the first sink found:

- **Template content.** Calendar, DatePicker, Rating, FileInput, Pagination and Toast clone
  `template.content`; typed parts inside `h.template` upgrade live with no props, and Toast crashes
  the region when it finds an empty template.
- **TokenInput.value** is a segment array behind `Schema.Unknown`; the docs' attribute string
  throws `Invalid value used as weak map key` when written as a property.
- **`items` is a second rendering path**, not additive: passing `items` and item markup duplicates
  rows in Listbox, Combobox and Command.
- **Command's `valuechange`** does not fire for an item click; `Item.select` is the event, and its
  detail is `Schema.Unknown`.
- **Button's `action`** is missing from the manifest, so `Button.Root` has no pending/`waitUntil`
  path.

## Verification

```bash
pnpm run dev        # Sink is in the top navigation
pnpm run test:e2e   # 145-tile contract, bento, filter, reference interactions, 5 group behaviors
pnpm --filter site run build
```
