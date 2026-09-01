# Countdown to January 16, 2027

A single-page civic countdown: a live timer to **16 January 2027**, the plan
(organise your polling unit → community → ward → LGA → state), and two paths
depending on whether the reader holds a PVC.

No build step and no dependencies — plain static HTML, CSS and JS. Visits are
counted with Google Analytics (see [Analytics](#analytics)).

It is also an installable PWA — it can be pinned to the home screen on both
Android and iOS, where it opens full screen and keeps working offline.

## Files

| File                    | Purpose                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `index.html`            | Markup, meta tags, manifest link, iOS install tags                  |
| `styles.css`            | All styling — glass panels, aurora background, odometer, responsive |
| `script.js`             | Countdown, odometer reels, reveals, share, install prompt, SW reg   |
| `sw.js`                 | Service worker — offline shell, Android installability              |
| `manifest.webmanifest`  | PWA manifest (name, icons, colours, screenshots)                    |
| `apple-touch-icon.png`  | iOS home-screen icon (180×180, at the path iOS probes by default)   |
| `icons/`                | Generated app icons, including maskable variants                    |
| `splash/`               | Generated iOS launch screens, one per device resolution             |
| `screenshots/`          | Generated shots for Chrome's install dialog                         |
| `og.png`                | Rendered 1200×630 share card                                        |
| `og.html`               | Source for the share card (not linked from the site)                |
| `icon.html`             | Source for the app icons (not linked from the site)                 |
| `splash.html`           | Source for the launch screens (not linked from the site)            |
| `tools/build-assets.sh` | Regenerates everything in the four rows above                       |

Every PNG in the repo is generated. Never hand-edit them — change the HTML
source and re-run `./tools/build-assets.sh`.

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

## Regenerating images

Every PNG — share card, icons, launch screens, install screenshots — is a
headless-Chrome render of an HTML source in this repo:

```bash
./tools/build-assets.sh
```

Headless Chrome refuses to render a viewport narrower than 500px, so the small
icons are rendered at 512 and downscaled with `sips`. That is why the script is
macOS-only.

## Home-screen install

**Android / Chrome.** Standard PWA: `manifest.webmanifest` plus a service
worker with a fetch handler. Chrome fires `beforeinstallprompt`, `script.js`
suppresses the default mini-infobar and reveals the "Add to home screen" card
instead, so the prompt appears on a deliberate tap.

**iOS / Safari.** Safari has no install API and ignores the manifest's icons,
so it is driven entirely by `<meta name="apple-*">` and `<link rel="apple-*">`
tags in the head. `script.js` detects iOS Safari and shows an instruction sheet
(Share → Add to Home Screen) since nothing can be automated. Chrome and Firefox
on iOS cannot add web apps at all — that is an iOS restriction, and the sheet
says so.

Launch screens need an exact `device-width` / `device-height` /
`-webkit-device-pixel-ratio` match or iOS shows a blank screen, hence the ten
`apple-touch-startup-image` tags. To support a new device, add its resolution
to the loop in `tools/build-assets.sh` and add a matching `<link>`.

Once installed, `body.is-installed` and the `display-mode: standalone` media
query pad the header and footer past the notch and home indicator, and hide the
install card.

### Cache behaviour

`sw.js` is network-first for navigations and stale-while-revalidate for
everything else, so a new deploy shows up on the next load rather than being
pinned by the cache. If you change the shell file list, bump `CACHE` in
`sw.js` — the old cache is deleted on activate.

Note that the countdown is computed from the device clock, so an offline launch
still shows the correct time.

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
- **Third-party requests.** Google Fonts and Google Analytics, both from
  `index.html`. Drop the fonts `<link>` and the stack falls back to system fonts
  cleanly; drop the gtag block and `track()` in `script.js` turns into a no-op.
  Nothing else on the page depends on either.

## Analytics

GA4 property `G-KQYBR3GKH0`, loaded from the gtag snippet in `index.html`.
Events are sent through the `track()` helper at the top of `script.js`, which
does nothing when `gtag` is missing — blocked by an extension, offline, or the
tag failed to load. **No feature of the page may depend on analytics loading.**

Beyond automatic pageviews, these are the events worth reading:

| Event                         | Fired when                                     |
| ----------------------------- | ---------------------------------------------- |
| `smartballot_click`           | The SmartBallot supergroup button is clicked   |
| `share`                       | A share chip is tapped (`method` = the network)|
| `copy_link`                   | Either copy button (`link_target` says which)  |
| `pledge_ready`                | "I'm ready" is tapped for the first time       |
| `install_available`           | Chrome reports the app is installable          |
| `install_prompt_accepted`     | The install prompt was accepted                |
| `install_prompt_dismissed`    | The install prompt was declined                |
| `install_instructions_opened` | An iOS visitor opened the how-to sheet         |
| `app_installed`               | The app was added to a home screen             |

`share` and its `method` parameter follow GA4's recommended-event naming, so
they populate the standard reports without extra setup. The rest are custom
events — to chart them you have to register them in GA under **Admin → Custom
definitions**.

The `config` call also sends a `display_mode` parameter (`standalone` or
`browser`) so pinned-app visitors can be separated from browser visitors.
That needs a custom dimension registering in the same place before it appears
in reports.

Note that GA sets cookies and is widely blocked, so treat the numbers as a
floor rather than a count. The footer discloses the tracking.
