# ATC Shell vs Screens v2: gap ledger

One row per design element. Status values:
- **todo**: not started
- **css**: styled
- **injected**: built by the shell
- **verified-live**: confirmed on the real portal from screenshots
- **won't-do** (with the reason)

Fixture caveat: a re-parsed capture moves invalid nesting (e.g. the profile's <p> inside <tr>), so such rows can differ from live.

A row reaches `verified-live` only after `compare.js` (design | ours on the real-DOM fixtures) and a live screenshot agree. Design references are in `compare-out/design-*.png`.

## Shell-wide
| Element | Design | Status |
|---|---|---|
| Theme tokens (colour, shape, type, springs) | `x-tokens.css` | verified-live |
| Navbar time chip + popover | XChip | verified-live |
| Nav: brand badge shape, tonal icon tiles, Assign Practice pill, shaped avatar | Timeline v2 nav | css (compare ✓): badge, Assign Practice tile-3 pill |
| Sub-header: glass toolbar pill with icons, "active on eGP" chip | Timeline v2 | css (compare ✓): menu button + links as one pill, users chip |
| Sidebar rail: tonal, selected pill | XRail | css |
| Web Theme toggle (Plus): Settings › Theme, page skin on or off | widget setting | done (stand-in ✓): `webTheme` pref, row shown to Plus only; off removes every page mark live (`unskin`) |
| Loader: EGP's blockUI `images/loading.gif` (and the request widgets' inline copies) → M3 loading indicator, every route | `xLoader` in `x-tokens.css`; m3 loading indicator | css (compare `--loader` ✓, stand-in ✓): contained 72px over a surface veil, uncontained 38px inline; Material/Aurora morph the M3 seven, Cyberpunk its angular set, Business without overshoot |

## Timeline
| Element | Design | Status |
|---|---|---|
| Profile: hero background, 76px avatar with gradient ring, 24px display name | XProfile | css (compare ✓ my-light, aurora-dark, cyber) |
| Profile: status chips (Good Performer, Since, JD) | XProfile | injected (status chip); host Joining/JD restyled as chips |
| Profile: Missing I/O on a badge shape | XProfile | css (compare ✓) |
| Profile footer: Bonus with visibility + info icons, Vault and More info text buttons | XProfile | css (compare ✓ my-light, aurora-dark, cyber, biz): EGP's svgs keep the events and paint Material icons by mask; the bonus popover hangs under the row (EGP pinned it at top:288px over the icon, so hover flashed), takes no pointer, and hides while ngx parks it at -10000px |
| Profile: 4-column details grid | XProfile | rendered (compare ✓), masked values only |
| Time card | XTime | verified-live |
| Co-workers: 52px shaped tonal avatars, one shape each | Timeline v2 | css (compare ✓): photos stay (host hover popovers), online dot outside the shape |
| Team members: empty state with icon tile | Timeline v2 | injected (compare ✓); the design's "ask your lead" hint left out: EGP has no such data |
| Leadership rows in tiles; supervisor in a tile-2 panel | Timeline v2 | rendered (compare ✓); online dot from the host's `.fig-pod.active`, as on co-workers |
| Awards: tiles with star badge | Timeline v2 | css (compare ✓), host carousel kept |
| Connected tab groups (filled selection) | Timeline v2 | css |
| Stock: 44px price, delta chip, 52w chip | Timeline v2 | rendered (compare ✓); no delta chip: EGP has no change data |
| HR & Compliance: icon tiles | Timeline v2 | verified-live; the list fills the card (EGP caps it at 80px) |
| Approval: icon tile + "All caught up" | Timeline v2 | rendered when empty (compare ✓) |
| Performance rings + connected toggles | Timeline v2 | verified-live (rings) |
| Spotlight tiles, Birthday icon tile | Timeline v2 | rendered (compare ✓): spotlight pick; peeks are the next two days' photos; ‹ newer · › older pager, › dropped on the last day (EGP throws there), birthday when empty |
| Happening: rows in tiles with icon tiles | Timeline v2 | css (compare ✓) |
| Health: icon tiles, values in the number font | Timeline v2 | css + injected icon tiles (compare ✓) |
| Careers: hero card, 64px number | Timeline v2 | rendered (compare ✓) |
| eGP Knowledge: icon tile | Timeline v2 | rendered (compare ✓); "1 of 20" is the item, not a chapter |
| Promotion: people in tiles | Timeline v2 | rendered (compare ✓): tabs, pager, wishes button |
| USA: zone chips, map in primary-container | Timeline v2 | todo |
| Documents: count in an ok-container shape | Timeline v2 | rendered (compare ✓) |
| Recognition: big numbers | Timeline v2 | css (compare ✓) |
| Special offers: colour tiles with blobs | Timeline v2 | rendered (compare ✓): all offers as tiles (the design's third is a blank peek; ours keeps its text), two-line labels, history button |
| Market place: icon tiles with counts | Timeline v2 | rendered (compare ✓) on Market place; Ride share keeps the host card |
| Events: colour tiles | Timeline v2 | rendered (compare ✓): views · rating, pager tiles |
| Weather: connected city buttons, hourly | Timeline v2 | css (footer cards, city pills, no table rule under the hours) |
| Food menu: day chip | Timeline v2 | todo |
| Prayer: next prayer chip | Timeline v2 | css |

## Attendance
| Element | Design | Status |
|---|---|---|
| Side drawer with an active pill | XRail drawer | css + icons (compare ✓) |
| "Attendance" in 30px display type | Attendance v2 | css (compare ✓) |
| Filled M3 fields with indicator line | Attendance v2 | css (compare ✓); host labels kept ("Select Member") |
| Submit: 48px with icon; Open in Excel split button | Attendance v2 | css (compare ✓): Excel moves to the top right as a tonal button; no split chevron, EGP has no export menu |
| Bento: 4 titled group cards (first is hero) | XBento | injected (compare ✓); tiles size to content, so Aurora's wider digits never overflow (the design does) |
| Bento tiles: 36px icon shape, 34px number + unit, label | XBento | injected (compare ✓); deltas against the shift: total hours, MTD avg, absents ✓ |
| Bento: Hours % wave bar | XBento | injected (compare ✓) |
| Search: 48px filled pill | Attendance v2 | css (compare ✓), design placeholder (the host search matches every field) |
| Legend as filter chips with counts | Attendance v2 | injected (compare ✓): chips filter the rows; "N records · date range" |
| Two-column layout (panel 560px left, table right) | Attendance v2 | css (compare ✓) while game mode is off and the viewport ≥ 1560px; game mode keeps its full-width workspace until P3 |
| Table: card container, tile-2 header in display type | XTable | css (compare ✓) |
| Table: shape marker column | XTable | css + row tags (compare ✓, stand-in ✓) |
| Table: In/Out icons, WFH / short / extra chips | XTable | css + row tags (compare ✓ extra; WFH/short on the stand-in: the fixture month has none) |
| Table: leave and absent as merged chips | XTable | injected chip + host note (compare ✓, stand-in ✓) |
| Pager: connected group, current page filled | Attendance v2 | css (compare ✓) |

## Later phase
| Element | Design | Status |
|---|---|---|
| Widget panel per theme | XPanel | todo (P3) |
| Settings side sheet | XSettings | todo (P3) |
