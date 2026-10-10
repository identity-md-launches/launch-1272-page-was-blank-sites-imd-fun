# Revision validation — 2026-10-11

**Complete for the eight reported frontend findings.** These are worker observations, not independent certification or a contract audit. Each finding was reproduced against the unchanged accepted export before its fix; `.imd-responses.json` supplies all eight verdicts.

## Scope and method

Retained the existing static HTML/JavaScript implementation, runtime library bytes/SRI, deployment addresses, providers, fee arithmetic and wallet flows. Changes are limited to the reported trade order, token-render cancellation, RPC setup state, fee wording, chain badges, NFT dialog, idle World motion and terminal rows. Rebuilt `dist/` after the last runtime source change. No dependency, lockfile, package manifest, build configuration, ignore rule, contract or submodule was changed. No package installation, wallet injection, signing, deployment or publication occurred.

Applied the pinned Better Interface workflow and core principles for all six domains during the revision, then rechecked the actual production export. Source/license attribution already retained in `docs/NOTICE.md` and `docs/design-guidance.LICENSE` remains intact. `DESIGN.md` describes the final source, including responsive grid areas, dialog behavior and motion/target rules.

## Commands and results

| Actual command or check | Result |
| --- | --- |
| `node scripts/build.mjs` | Passed, exit 0. Uses the unchanged existing production build. |
| `node --test scripts/check-site.test.mjs` | Passed, 7/7. Source/export equality, vendor lock/SRI/license bytes, metadata/relative URLs, all inline-script syntax, PNG decoding and share-control use. |
| `node /tmp/swarm-check/node_modules/typescript/lib/tsc.js --noEmit --allowJs --checkJs --strict --target ES2022 --lib ES2022,DOM web/share-image.js` | Passed, exit 0, TypeScript 5.9.3. Scope is the existing PNG helper, not the legacy inline application. |
| `PEPES_CHROMIUM=/opt/imd-worker/local/imd-browser-tool/ms-playwright/chromium-1246/chrome-linux64/chrome node scripts/check-revision.mjs /tmp/swarm-check/node_modules/playwright-core/index.mjs --baseline` | Passed against the original export: 9 reproduction groups covering all 8 findings. |
| Same revision command without `--baseline`, after final build | Passed, 13/13 groups, Chromium 154.0.8037.0 / Playwright Core 1.64.0. |
| `node scripts/check-browser.mjs /tmp/pepes-playwright.mjs` | Passed, existing 15/15 browser groups. The temporary module wraps the installed Playwright Core and supplies the same installed Chromium executable; it changes no browser-test assertions. |
| Browser MCP walkthrough of `dist/` under `/preview/` with real read-only RPCs | Passed token/NFT first-screen measurements, live NFT keyboard focus/Tab/Escape/return, and console review (0 errors, 0 warnings on those pages). |

Both scripts manage their own bounded preview/browser lifecycle. The separate MCP walkthrough used `test/scratch/preview.mjs`, a foreground preview with a three-minute maximum; it was explicitly stopped after inspection. All previews used a host CSP allowing same-origin and existing inline scripts while denying CDN scripts. No `data:` connection permission was introduced.

The deterministic suites label all RPC values as fixtures. They validate frontend interactions, not prices, balances, contract execution or financial correctness. The live check used the existing public providers without a wallet and was not pinned to a block. `artifacts/live-review.json` records its measurements separately.

## Reproductions, fixes and rechecks

| Finding (ID prefix) | Final source | Evidence and outcome |
| --- | --- | --- |
| High: mobile trade order (`07730656`) | `web/index.html:144`, `:2187`, `:2820` | Original 390px fixture token/NFT actions ended at y=1509.77/2863.50. Explicit grid areas now place token identity → trading → information, and NFT title → trading → statistics/collection on phones, preserving desktop columns. Creator links/description move below trading on phones without an empty slot. Final token fixture action ends at 637.30px (390×844) and 646.50px (320×700); NFT at 505.70/534.09px. All remain above the 40px status bar. Token/NFT reflow checked at 320, 390, 768, 860 and 1440. Live token ends at 612.50/600.91px; live NFT ends at 505.70px at 390. |
| Medium: delayed token replaces Launch (`90c680ec`) | `web/index.html:950`, `:2788`, `:3070` | A 2000ms `getTokenInfo` delay reproduced loss of `KEEP MY FORM` while hash stayed `#/create`. A captured route generation, render sequence and hash now guard token writes and follow-up reads. Delayed success, not-found and trade-history tests all preserve the next form and its values; no page exceptions. Quote, split and holder-position updates also check ownership before writing. |
| Medium: outage implies missing contracts (`4bbbe29c`) | `web/index.html:608`, `:966` | JSON-RPC -32000 errors reproduced “Not deployed yet” with no recovery. Settled pad/router reads now distinguish failure from confirmed empty code. The outage message offers Reload; clicking it recovers after restoring reads. A successful `0x` response retains the actual undeployed state. |
| Medium: misleading holder-fee copy (`a2b94d1c`) | `web/index.html:1753`, `:1832`, `:2614` | Deflationary reproduced “3% burned” alongside a 3%-to-holders promise. Updated only the requested launch and Rewards sentences. Burn preset and Rewards introduction/empty-state browser checks pass; computed split wording and economics unchanged. |
| Medium: Ethereum badge contrast (`533e220b`) | `web/index.html:138` | Measured original 10px label `rgb(10,143,60)` on white: 4.194:1. Changed to `--text`; measured final black/white: 21:1. Preserved explicit Ethereum name and border. |
| Medium: NFT modal focus (`f8afc00a`) | `web/index.html:233`, `:2097` | Original overlay left focus on the tile and ignored Escape. Native named `dialog` now makes background inert, focuses Close, wraps Tab/Shift+Tab and restores the saved trigger after Close/Escape/backdrop dismissal. All paths pass; attempted background focus is rejected. Live keyboard walkthrough separately passes. |
| Medium: World reduced motion (`6c578e57`) | `web/world/index.html:575`, `:586` | Original world/cloud transforms changed under reduce. Current media-query state is read every frame. Final reduced-motion observations keep quaternion `[0,0,0,1]` and cloud rotation `0`; toggling preferences resumes/stops idle motion. Gameplay input code is retained. |
| Medium: feed link targets/clipping (`b58b0127`) | `web/index.html:254`, `:1222` | Original rows measured 19.796875px, with a partially visible row beginning 8.25px above the log. Nonshrinking rows now have a 24px minimum; `fitRows` hides older rows until only whole newest rows fit, and refits on resize. Final log retains its 156.125px height with six 24px rows at y=6.125–150.125. |

The reordered trade forms also passed buy/sell selection, payment currency, quick amount/count, quoted output and no-wallet feedback. The existing suite still passes home filters/sort, theme switching, keyboard Launch, form entry, invalid rewards address, PNG Download, actual Chromium clipboard Copy, recorded native Share handoff and its denial fallback, local ethers/three.js boot, and World navigation.

Early revision runs caught a remaining 320px token-identity height problem; moving the secondary token metadata below trading resolved it. Test harness corrections included handling zero-argument ABI calls, selecting visible feed rows after clipping was fixed, and expecting the trade flow's final “Connect a wallet first” toast. A motion-preference transition check led to reading the media-query state each frame instead of caching an event-updated value. Final results below describe only the final export.

## Better Interface coverage

| Domain | Coverage | Unperformed or out of scope |
| --- | --- | --- |
| Accessibility — Checked | NFT dialog semantics/name, native inert behavior, visible keyboard focus, Tab/Shift+Tab and three close paths; feed 24px targets; home and World reduced motion; existing labels/focus and error feedback. | Screen reader, physical device, forced colors, full automated accessibility audit, unchanged multi-wallet chooser and authenticated gameplay. |
| Layout — Checked | Token/NFT at 320×700, 390×844, 768×844, 860×844, 1440×900; existing home at seven widths from 320–1440; World gate at four widths. First-screen actions, document overflow, desktop columns and modal/terminal screenshots inspected. | Native 200% zoom, RTL and pseudo-localization. Narrow viewport testing establishes reflow only. |
| Writing — Checked | Exact launch/rewards split wording, unchanged computed split note, factual failed-read state, Reload recovery, NFT Close and trade labels. | No broad review of inherited marketing/audit claims or contract documentation. |
| Typography — Checked | Preserved scale/weights and 16px phone fields; actual phone/desktop wrapping and terminal row heights inspected. | Deterministic suites use system monospace fallback with optional font CSS offline. Exact remote-font and platform emoji rendering not certified; inherited scale/capital tracking unchanged. |
| Colors — Checked | Ethereum label/card measured before/after; existing main/secondary foregrounds measured on opaque light/dark backgrounds (21:1 text; 5.74:1/6.25:1 secondary). | Every other status/accent/alpha/image pair and every disabled/hover state not exhaustively measured. No global contrast-compliance claim. |
| UI — Checked | Existing square panels/columns retained; idle/loading/empty/error/retry states, quote updates, no-wallet feedback, dialog, same-size complete feed, preference changes and share controls. | Native OS share sheet, slow-motion Animations-panel replay, Safari/Firefox and connected gameplay/transaction states. |

## Evidence and limitations

- `artifacts/revision-before.json`: passing reproductions of all reports on the original accepted export; `revision-before/` holds those screenshots.
- `artifacts/revision-after.json`: 13 passing regression groups; `revision-after/` includes phone/desktop trading, focused NFT dialog, Deflationary, terminal, route race, outage/setup and World screenshots.
- `artifacts/browser-results.json`: 15 passing retained browser groups, with original home/Launch/share/World screenshots regenerated from the final export.
- `artifacts/live-review.json`, `live-token-390.png`, `live-token-320.png`, `live-nft-390.png`: separate real-provider browser observations. Fixture images remain explicitly identified by their test suite/path.

No page exceptions, failed asset requests or unexpected RPC fixture calls occurred in the final revision suite. The retained suite logs the existing optional HTTP upload capability probe blocked by CSP and the unchanged three.js UMD deprecation warning. Static hosting still depends on public read services for live state. World zoom/gesture behavior and the wallet chooser remain outside this revision. Wallet signing, approvals, launches, swaps, claims, pass purchases and game progression were not executed. The strict typecheck covers the PNG helper; all inline application scripts passed syntax and scoped interaction checks, not full static typing.

Packaging and protected-path verification results are recorded in `artifacts/packaging-results.json`. The final export keeps all runtime libraries, lockfile, licenses, icons/images and the World page. No dependency tree, cache, tarball or new submodule is delivered. The existing protected contract gitlinks are unchanged. `artifacts/validation.md` is an identical delivery copy of this report; artifacts are excluded from Git by the existing environment rule, which was not edited.

---

## Earlier accepted round (historical)

The following report records the previous CSP repair. Its browser version, measurements and limitations describe that earlier round; the revision coverage above supersedes the reported NFT, motion, setup, badge and mobile-trading limitations.

# CSP repair validation — 2026-10-10

**Complete for the stated CSP/static-export scope**, with the limits below. These are worker observations, not independent network certification or a contract audit.

## Scope and assumptions

The checkout did not contain the described `576577a` fix, so its behavior was implemented locally. The existing HTML/JavaScript stack, library versions, SRI, contract deployments and wallet transaction code were retained. ethers 6.13.4 and three.js 0.160.0 now load from same-origin relative URLs. The share card converts its canvas PNG data URL into a Blob directly. No `data:` connection permission was added.

The only additional changes are the assignment's static-hosting metadata/relative links and bounded presentation/accessibility repairs: primary action placement, header/filter wrapping, mobile input sizing, focus outlines and feedback semantics. No contract source, ownership, recipient, fee, approval, signing, wallet access or game economics was changed. All wallet/transaction checks were excluded; no key was read and no wallet was injected. No publication or on-chain transaction occurred.

Runtime dependencies are locked in `web/vendor/dependencies.lock.json`. The root package manifest, build command, protected configuration, existing dependencies and all ignore files remain unchanged. A root npm lockfile was not created. Existing protected contract gitlinks were not modified, and no submodule was introduced.

## Commands and results

| Command/check actually executed | Outcome |
| --- | --- |
| Python `urllib.request` download of the two URLs in the vendor lock; `hashlib.sha512` comparison against the original HTML SRI | Passed. ethers: 505,826 bytes; three.js: 669,884 bytes. Original hashes match exactly. Upstream MIT licenses retained. |
| `node scripts/build.mjs` | Passed, exit 0. Executes the original `package.json` production build; final `dist/` matches runtime source. |
| `node /tmp/pepesfamily-check-tools/package/lib/tsc.js --noEmit --allowJs --checkJs --strict --target ES2022 --lib ES2022,DOM web/share-image.js` | Passed, exit 0, TypeScript 5.9.3. Scope: new PNG helper. |
| `node --check scripts/build.mjs` and `node --check scripts/check-browser.mjs` | Passed, exit 0. |
| `node --test scripts/check-site.test.mjs` | Passed, exit 0: 7 tests. Covers vendor bytes/SRI/licenses, relative assets/metadata, source/export equality, all inline script syntax, exact Blob/File bytes and rejected malformed input. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/pepesfamily-browsers LD_LIBRARY_PATH=/tmp/pepesfamily-browser-libs/root/usr/lib/x86_64-linux-gnu FONTCONFIG_FILE=/tmp/pepesfamily-fontconfig.xml node scripts/check-browser.mjs /tmp/pepesfamily-playwright/package/index.mjs` | Passed, exit 0: 15 browser check groups, Chromium 141.0.7390.37 / Playwright Core 1.56.1. Results and images in `artifacts/`. |
| `command -v node npm tsc forge slither aderyn ...` | Node/forge/Slither present; npm/tsc/Aderyn absent from PATH. Compiler/browser tooling was unpacked in `/tmp`, outside the submission. |
| `forge build`, Solidity tests, Slither, Aderyn | Not run: no Solidity changes and no contract/security-analysis scope. Aderyn was also unavailable. |

The supplied browser MCP initially failed because `/opt/google/chrome/chrome` was missing. A foreground Playwright script provided an alternative browser. Chromium initially lacked shared libraries and fallback fonts; Debian packages were downloaded/extracted under `/tmp` without changing system configuration. An initial probe showed missing glyphs and crashed on World; installing the isolated prerequisites and disabling small shared-memory use resolved that environment failure. No browser/dependency archives or caches are included in the repository.

Early regression runs caught actual filter/header overflow and a mobile-font rule overridden by later CSS; these were repaired and rechecked. Test-harness failures were also repaired: focus testing now uses Tab rather than assuming programmatic mouse-mode focus activates `:focus-visible`; asynchronous wallet/share handlers are awaited; the visible World gate logo is selected instead of the hidden HUD logo; and RPC fixtures implement the renderer call. The final suite has no failed checks or unexpected fixture calls.

## Interaction evidence

The production export was served under `/preview/` with a response CSP of `script-src 'self' 'unsafe-inline'; object-src 'none'`, intersecting the HTML CSP. This blocks remote CDN scripts while preserving the application's existing inline-script architecture. This is not a claim that a literal self-only policy permits inline code.

The final run used explicitly labeled test RPC values at the site's existing deployment addresses; those values are not live balances or prices. All requests for chain state were fulfilled in the browser harness; no transactions were submitted. A separate initial read-only live probe reached the Robinhood/Ethereum providers and rendered the page, but public services produced a 429 in one run. It was not pinned to a block and does not validate current chain balances/availability.

The 15 check groups established:

1. Local ethers loaded and initialized the exported launchpad under the host CSP.
2. Homepage document width equaled viewport width at 320, 390, 601, 768, 860, 1024 and 1440px (height 844). At 390px the launch action ended at about 210px.
3. Home frog CSS animations were disabled under emulated reduced motion.
4. Chain filtering produced a relevant empty state; returning to All restored the token; sort preference persisted.
5. Light/dark switching worked.
6. Tab/Enter reached the visible launch action and opened the form; name/ticker entry and custom fee disclosure worked; mobile inputs computed to 16px. Submit/signature was not exercised.
7. Connect without a wallet showed installation guidance.
8. Invalid reward addresses showed correction text; a valid address opened read-only rewards without a claim control.
9. Download produced a valid 1200×675 PNG named `pepesfamily-rewards.png`.
10. Copy wrote an actual PNG to Chromium's clipboard, then read it back (PNG signature, MIME and nonempty size verified).
11. Share supplied the correct File and text for all-token and per-token cards to a **stubbed** native share API, including filenames and image bytes/size.
12. Denied clipboard permission showed the existing Download fallback.
13. Scripts and sharing caused no CSP violations. The pre-existing optional upload probe was the sole expected blocked connection in the HTTP preview.
14. Primary/secondary text contrast was measured from opaque computed page colors in light and dark themes.
15. Local three.js revision 160 rendered World WebGL; the gate fit at 320, 390, 768 and 1440px; no-wallet errors appeared; the relative home link returned to `/preview/`.

The final report records zero page exceptions, zero failed local assets and no unexpected RPC calls. Expected console entries are the HTTP-only `/api/upload` CSP rejection and the deprecation warning embedded in the byte-preserved three.js release. On static hosting, uploading remains unavailable and pasted image links remain the supported path.

## Better Interface review

The supplied workflow, the core principles of all six domains, their verification sections, and the documentation method were read before/during implementation. Review used the existing design and scoped fixes rather than a new design system. All six domains were **Checked** within the affected surfaces:

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility | Native navigation/share actions, labels, new navigation landmark name, 2px focus indicator, keyboard launch, status feedback, no-wallet/invalid-address/clipboard-error paths, reduced-motion home state. Visible focused action inspected in `home-focus-390.png`; the terminal uses a green focus ring on its permanently dark surface. | No screen reader, automated axe/WCAG audit, forced-colors session, physical touch device or full wallet/NFT modal keyboard walkthrough. |
| Layout | Home measurements at seven widths, World gate at four; mobile/desktop screenshots; header wrapping, filter wrapping, primary-action order and stacked share controls. | Narrow viewport is reflow, not native 200% browser zoom. No RTL/localization variant exists; pseudo-localization was not performed. |
| Writing | Short homepage heading/plain product description, verb-led share/download/copy controls, existing actionable clipboard/no-wallet errors, metadata descriptions. | Financial copy and claims inherited elsewhere were not audited; no economics/content rewrite. |
| Typography | Existing CSS roles/weights/fallbacks, mobile input cascade fix, heading sizing and screenshot wrapping. | Google font requests were deliberately replaced with empty CSS in the deterministic run, exercising fallback rendering. Exact IBM Plex appearance and all emoji glyphs were not verified. The inherited scale exceeds six sizes and includes tracked uppercase labels; preserved by the bounded no-redesign scope. |
| Colors | Both themes and observed opaque text/background pairs: black/white 21:1; `#666666`/white 5.74:1; `#8c8c8c`/black 6.25:1. Existing semantic tokens retained. | Status colors, illustrations, chart colors, every disabled state and alpha/image combinations were not exhaustively measured. No full contrast compliance claim. |
| UI | Share preview/selector, download, copy success/denial, native-share file handoff, theme changes, empty/loading states, square borders and WebGL gate. | No native OS share sheet or X posting, no Animations-panel 10% replay, no authenticated game session, no multi-wallet chooser. |

### Findings fixed

| Severity | Final source location | Evidence, impact and correction | Recheck |
| --- | --- | --- | --- |
| High | `web/index.html:6`, `web/index.html:22`, `web/world/index.html:6`, `web/world/index.html:19` | CDN-only scripts could be blocked by the host, preventing app/game initialization. Vendored exact bytes, retained SRI, added self and removed the obsolete CDN source. | Both applications initialized under a CSP denying CDN scripts. Hash/SRI tests passed. |
| High | `web/share-image.js:7`, `web/index.html:1876` | `fetch(data:...)` is a connection and was denied by `connect-src`. Direct base64-to-Blob decoding keeps bytes/MIME without network permissions. | Node byte checks, actual PNG download/clipboard and both Share variants passed. |
| Medium | `web/index.html:16`, `web/index.html:269`, `web/world/index.html:14`, `web/world/index.html:766` | Root-relative icons/images/World links escaped a gateway subpath. Made local URLs page-relative. | File resolution and `/preview/` browser navigation passed. |
| Medium | `web/index.html:1224` | Intro/main action followed the large scene and asynchronous token cards. Moved the existing action above them, shortened the headline and added a plain product line. | At 390px the product/action remain on the first screen, including a loaded token card below. |
| Medium | `web/index.html:70`, `web/index.html:197` | Mobile probe measured 488px document width at 390px; the intermediate header measured 726px at 601px. Wrapped filters and switched header rows at 860px. | No document overflow at all seven tested widths. |
| Medium | `web/index.html:104`, `web/index.html:278` | Fields suppressed the native outline; feedback lacked a live region. Retained border focus, added a strong focus-visible outline and a polite status region. | Tab/Enter and visible ring checked; the terminal ring was also inspected after scrolling it clear of the fixed status bar. DOM semantics checked, spoken output not tested. |
| Medium | `web/index.html:113` | Initial mobile input rule was overridden by the later `font: inherit`. Placed the 16px rule after controls; placed mobile H1 size after the desktop rule. | Browser computed 16px on the 390px launch input; screenshots show the final heading. |
| Low | `web/index.html:9`, `web/world/index.html:9` | Main page lacked a description and OG metadata. Added descriptions/OG title/image using the existing preview asset, with relative local URLs. | Static metadata/file checks passed; real social-crawler unfurl not tested. |

### Existing limitations outside this repair

- `web/world/index.html:5`, `:29`, `:687`: World disables zoom/selection globally and animates its game loop without a reduced-motion guard. Its gesture/accessibility redesign was not included in this script-loading repair.
- `web/index.html:809` and `:2050`: existing wallet/NFT overlays need a separate full focus-trap/Escape/restore audit. This run did not connect a wallet or open an NFT modal.
- The app still depends on public RPC/explorer availability, WebGL and optional font services. Live read errors are not cured by vendoring scripts. Existing setup/error wording and network retry behavior are unchanged.
- Native share-sheet integration, Safari/Firefox, physical devices, wallet signing, approvals, swaps, launches, claims, pass purchases and game progression remain unperformed. The new helper alone received strict typechecking; existing inline scripts received syntax checks and scoped browser coverage.

## Delivered evidence and packaging

`artifacts/browser-results.json` records the final automated result. Inspected screenshots: `home-390.png`, `home-1440.png`, `home-dark-390.png`, `home-focus-390.png`, `terminal-focus-390.png`, `launch-390.png`, `rewards-share-390.png`, `world-390.png`, `world-1440.png`. Figures/balances in these screenshots are fixtures. `artifacts/validation.md` is an identical delivery copy of this source-controlled report.

The environment already excludes `artifacts/` and `test/scratch/` through its Git exclude file. That file was not changed; the requested evidence remains under `artifacts/` for separate delivery. Source, vendor lock/licenses, scripts, README, design and this validation document are included in the Git submission, together with the full export. No node_modules, package cache, tarball, browser binary, system library or new submodule is included.

Final packaging checks: `git diff --check` passed; protected-file bytes and deployed address strings match HEAD; no root `package-lock.json` or dependency/cache archives are present. The complete candidate source/export plus separate evidence is approximately 4.7 MiB uncompressed, below the 8 MiB limit; `artifacts/packaging-results.json` records exact file-byte counts. Git metadata was not modified by the worker.
