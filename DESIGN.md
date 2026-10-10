# PepesFamily implemented design

This is the design of the delivered static HTML/JavaScript site, not a proposed redesign. `web/index.html` contains the launchpad's styles, templates and hash routing; `web/world/index.html` contains the separate three.js game. The CSP repair retains the existing terminal, frog artwork, flat panels and wallet flows. The homepage now introduces the product and its launch action before the decorative scene and asynchronous token cards.

## Colors

The launchpad uses semantic CSS custom properties in `web/index.html:28`. Keep the existing hex notation. The system preference selects the initial theme; a saved `data-theme="light"` or `"dark"` selection overrides it.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#000000` | Page and fields |
| `--panel` | `#fafafa` | `#070707` | Subtle panels, fee presets |
| `--panel-2` | `#f1f1f1` | `#111111` | Hover surfaces, avatar fallback |
| `--line` | `#dcdcdc` | `#2a2a2a` | Structural separators |
| `--strong`, `--text` | `#000000` | `#ffffff` | Main text, selected actions, focus outline |
| `--muted` | `#666666` | `#8c8c8c` | Supporting text |
| `--dim` | `#9a9a9a` | `#555555` | Image placeholder details |
| `--inv` | `#ffffff` | `#000000` | Text on strong fills |
| `--accent` | `#0a8f3c` | `#3ddc84` | Positive/trading state |
| `--down` | `#d23c3c` | `#ff5a4f` | Sell/negative state |
| `--warn` | `#b8860b` | `#f5c542` | Expiry and caution |
| `--frame` | `#e8e8e5` | `#1c221c` | Terminal surround |

The terminal and exported reward cards deliberately retain a dark background in either theme. Their illustrations use local colors rather than the page palette. Measured normal text against the opaque page background is 21:1 in both themes; supporting text is 5.74:1 light and 6.25:1 dark. These measurements do not cover every status color, illustration or overlay.

World has a separate fixed palette at `web/world/index.html:22`: sky `#a8dcc9`, ink `#000000`, paper `#ffffff`, muted `#666666`, line `#dcdcdc`, accent `#0a8f3c`, gold `#c99a06`, down `#d23c3c`. It has no theme switch.

## Typography

Both pages request IBM Plex Mono at weights 400, 500 and 600 from Google Fonts, with `ui-monospace, SFMono-Regular, Menlo, monospace` fallbacks. The page works when the font service is unavailable. Browser regression screenshots deliberately use the environment's fallback fonts; they do not establish that IBM Plex loaded. Emoji appearance also depends on the device.

The inherited dense trading interface uses a 13px body and unitless 1.6 line height. The main heading is 30px/400 with `-.01em` tracking, reduced to 24px at 600px and below. H2 is 20px/500 and H3 14px/500. Supporting text, labels and most buttons use 12px; existing captions use 11px and badges 10px. Token names in the featured card use 18px and statistic values 20px. Mobile inputs, textareas and selects use 16px to avoid small-input zoom. The existing scale has more than six sizes; this bounded repair preserves its established density rather than introducing a new type system.

Buttons/navigation use uppercase presentation and `.06em` tracking. The logo uses `.18em`; numbered sections use `.08em`. The new homepage headline is three words with a plain description immediately below it. Descriptions and addresses wrap; compact token names truncate within the linked card. World uses 26px headings, 13px body, 12px controls and 11px notes.

## Layout and responsive behavior

The launchpad's `.wrap` caps content at 1120px with 16px horizontal padding. Reuse `.row` (8px gap, wrapping), `.card` (16px padding), `.grid` (auto-fill columns of at least 260px), and `.two` (flexible content plus 360px sidebar, 18px gap). Numbered sections separate groups with 26px above and 14px below; the hero uses a 16px gap and 26px bottom margin. `.wrap` wins the main element's horizontal padding in the cascade; do not infer a 30px top inset from the lower-specificity `main` rule.

At 860px and below, the header places navigation on its own row and hides the long NFT label. The `.two` and `.sharegrid` layouts become one column. At 600px and below, headings/fields adapt, featured token actions become full width, and the terminal hides its secondary columns. At 360px and below, the logo keeps only its mark and navigation gets denser. The sort/filter bar wraps instead of widening the document. Rewards tables have their own horizontal scroll container; the fixed status bar scrolls independently.

The homepage's launch action remains above the scene and loaded token cards. This was verified at widths 320, 390, 601, 768, 860, 1024 and 1440, all at 844px height. At 390px its bottom was about 210px from the viewport top in the fixture run. Share controls stack below the 1200:675 card preview on mobile.

World fills the viewport with WebGL. The access card is `min(460px, 100%)`, inset 16px, padded 22px, with internal scrolling beyond `100vh - 32px`. At 600px and below the HUD hides the expanded logo/help and moves the bag above the joystick. The gate was checked at 320, 390, 768 and 1440px; authenticated gameplay was not exercised.

## Elevation and depth

The launchpad is intentionally flat: 1px separators and 1.5px featured outlines carry structure. Selected fee presets add a 1px inset shadow. The sticky header sits at z-index 5, status bar at 6, toast at 20 and existing modal layer at 30 over a 60% black scrim. World places its gate at z-index 10 over labels/HUD at 4/5.

## Shapes

The launchpad forces square corners. Buttons, panels, avatars and the brand mark share that geometry. Canvas-exported token logos may have rounded corners independently of CSS. World uses square cards and buttons, with a circular 124px joystick and 52px knob for the game control.

## Components

| Pattern and source | Use and states |
| --- | --- |
| `button`, `.btn`, `.primary` — `web/index.html:92` | Bordered actions; strong fill for an emphasized action; hover surface and disabled opacity. Native links navigate and buttons perform actions. |
| `:focus-visible` — `web/index.html:105` | 2px strong outline with 3px offset; the always-dark terminal overrides it with `#3ddc84`. Keyboard launch activation and the visible light-theme ring were checked. |
| `nav.top`, `.seg`, `.tabs` | Hash navigation, chain/sort filters and trade selection. Existing `.on` classes invert foreground/background. |
| `input`, `textarea`, labels — `web/index.html:101` | Full-width fields with structural borders, visible focus, and 16px mobile input text. Native required fields remain intact. |
| `.card`, `.tcard`, `.stats`, `.pill` | Reusable dense token cards, linked rows, metrics and chain/asset labels. Loading and empty states are produced by the existing render functions. |
| `.sharegrid`, `.share-img`, `showCard` — `web/index.html:1799` | Rewards selector, PNG preview, Post on X, Download, Copy and capability-dependent Share. Download remains available if copying is denied. The image contains totals/token information, not the wallet address. |
| `shareImageBlob` — `web/share-image.js:7` | Typed local PNG decoding shared by Copy and Share. No network request or expanded `connect-src` permission. |
| `.toast`, `toast()` — `web/index.html:162` | Existing timed feedback, now a polite status region. Copy success and denial guidance were checked; actual screen-reader announcements were not. |
| `.scene`, `Scene`, `Feed` | Procedural home wall/frog crowd and read-only feed. Home motion has a reduced-motion guard; this is separate from World. |
| `.box`, `.btn`, `#gate` — `web/world/index.html:33` | Fixed light access card over the game, connect/error states and relative home navigation. |

These are shared CSS/template patterns, not framework exports. Existing wallet/NFT overlays and game gesture handling have wider accessibility limitations listed in the validation report.

## Reuse rules

- Start another launchpad view inside `#app` with `.hero`, then reuse `.row`, `.card` and `.two`; keep the main action before decorative media.
- Use existing semantic colors and button states. Preserve the square, border-based interface instead of adding an unrelated component system.
- Keep local asset paths relative to the page. World uses `../`; the launchpad uses `./` and hash routes.
- Preserve the vendored dependency bytes and their SRI. A library upgrade is separate work.
- Keep chain permissions, recipient addresses, approvals, fee arithmetic and wallet confirmations in their existing code paths.

Review method: pinned Better Interface (Jakub Krehel, MIT, `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and document-web-design adapted from Impeccable (Paul Bakaus, Apache-2.0, `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). See [notices](docs/NOTICE.md), [licenses](docs/design-guidance.LICENSE), and [validation](docs/validation.md).
