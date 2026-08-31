# Countdown to January 16, 2027

A single-page civic countdown: a live timer to **16 January 2027**, the plan
(organise your polling unit → community → ward → LGA → state), and two paths
depending on whether the reader holds a PVC.

No build step, no dependencies, no tracking. Three files and a share image.

## Files

| File         | Purpose                                                             |
| ------------ | ------------------------------------------------------------------- |
| `index.html` | Markup and meta tags (Open Graph / Twitter card)                    |
| `styles.css` | All styling — glass panels, aurora background, odometer, responsive |
| `script.js`  | Countdown, odometer reels, reveal-on-scroll, share links, canvas    |
| `og.html`    | Source for the social share card (not linked from the site)         |
| `og.png`     | Rendered 1200×630 share card                                        |

## Local preview

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly via `file://` works too, but the clipboard API
and share links behave better over HTTP.

## Deploying to GitHub Pages

The page is designed for `https://kcemenike.github.io/countdown-to-tinubu-exit/`.
Note that GitHub Pages serves from `github.io`, not `github.com`.

```bash
git init
git add .
git commit -m "Countdown to January 16, 2027"
git branch -M main
git remote add origin git@github.com:kcemenike/countdown-to-tinubu-exit.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

Because assets are referenced relatively (`styles.css`, `script.js`, `og.png`),
the page works from any sub-path. The only absolute URLs are the Open Graph
image tags in `index.html` — update the host there if the site moves, otherwise
link previews will point at the wrong place.

## Things you will want to change

Everything tunable lives at the top of `script.js`:

```js
var TARGET = new Date('2027-01-16T00:00:00+01:00').getTime(); // election day, WAT
var TERM_START = new Date('2023-05-29T00:00:00+01:00').getTime(); // "road so far" bar
```

- **Election date.** INEC can move it. Change `TARGET` and the two hardcoded
  date strings in `index.html` (the masthead pill and the `term__head` labels).
- **SmartBallot link.** Appears twice in `index.html` — the button `href` and
  the `data-copy` attribute on "Copy the invite link" below it.
- **Share copy.** `SHARE_TEXT` in `script.js`.

## Re-rendering the share card

`og.png` is a screenshot of `og.html`. After editing `og.html`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --virtual-time-budget=4000 \
  --window-size=1200,630 --screenshot=og.png "file://$PWD/og.html"
```

## Implementation notes

- **Odometer digits.** Each digit is a vertical reel of 11 cells (`0-9` plus a
  trailing `0`) translated by a percentage of its own height. The extra cell
  lets `9 → 0` roll forward instead of snapping backwards; the reel silently
  resets to index 0 once the transition finishes.
- **Rings.** Each unit's SVG arc shows how much of that cycle is left
  (seconds/60, minutes/60, hours/24, days/365).
- **Ticking.** A 250 ms interval that early-returns unless the whole second
  changed, plus a `visibilitychange` catch-up so returning to the tab does not
  show a stale clock.
- **Accessibility.** The reels are `aria-hidden`; a visually hidden live region
  announces the remaining time every 30 seconds rather than every second.
  `prefers-reduced-motion` disables the canvas, the spotlight, the reveals and
  all transitions.
- **Canvas.** Particle count scales with viewport area and caps at 90, DPR caps
  at 2. Neighbour lines are O(n²) but bounded by that cap.
- **No analytics, no cookies, no fonts self-hosted.** The only third-party
  request is Google Fonts; drop the `<link>` in `index.html` and the stack falls
  back to system fonts cleanly.
