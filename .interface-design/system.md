# Design system — "Screening room"

Dark UI themed around film capture / a screening room at night. The accent
color is a projector tally light; surfaces read like equipment lit by the
projector beam.

## Direction & feel

- Dark, warm-cream text on near-black surfaces — calm, equipment-like, not flashy.
- One accent color (tally red) reserved for the active/recording state — primary
  action button, focus rings, progress fill, header indicator dot.
- Sharp-ish corners (3-6px radius), no heavy shadows or gradients beyond a
  subtle radial vignette behind the page.

## Depth strategy

Depth comes from **surface color shifts + thin borders**, not shadows:

- `--surface-inset` (`#07070a`) — recessed wells: text inputs, progress trough
- `--surface-0` (`#0c0c0f`) — page background
- `--surface-1` (`#18181c`) — the card, "lit by the projector beam"
- Borders progress by importance: `--border-subtle` → `--border-default` →
  `--border-emphasis` (all warm-gray at low opacity)

## Color tokens

```css
--text-primary: #f3ede2;          /* warm projector-beam cream */
--text-secondary: rgba(243, 237, 226, 0.64);
--text-tertiary: rgba(243, 237, 226, 0.42);
--text-muted: rgba(243, 237, 226, 0.26);

--tally: #e2483a;                 /* brand accent — active/recording state only */
--tally-bright: #ff5c4a;
--tally-glow: rgba(226, 72, 58, 0.45);
--focus-ring: rgba(226, 72, 58, 0.25);

--ready: #6cbf84;                 /* success */
--fault: #e0a458;                 /* error/warning */
--fault-bg: rgba(224, 164, 88, 0.1);
--fault-border: rgba(224, 164, 88, 0.3);
```

## Type & spacing

- Display font: system UI stack (`-apple-system, "Segoe UI", ...`)
- Mono font for labels, metadata, status text, file paths — gives an
  "equipment readout" feel
- Spacing base unit: **4px** (`--space-1` through `--space-6` = 4/8/12/16/24/32px)
- Field labels: uppercase, mono, letter-spacing `0.12em`, tertiary color

## Key component patterns

- **Tally light** — small glowing red dot (`--tally` + glow shadow) next to
  the page title, signals "the system is live"
- **Film-strip progress bar** — sprocket holes along top and bottom edges via
  `repeating-linear-gradient`, with a glowing tally-red fill and a soft
  blurred "light leak" at the fill's leading edge
- **Perforated preview frame** — video thumbnail flanked by vertical
  sprocket-hole strips (`::before`/`::after` with repeating gradients),
  evoking a film frame
- **Saved panel** — completion state shown as a panel with a checkmark icon,
  "SAVED TO" mono label, and the file path — the primary feedback, not a
  generic success toast
- **Rec-dot** — pulsing dot inside the primary button while idle/recording

## Notes for future changes

- Keep the accent color (`--tally`) reserved for the single primary action
  and active states — don't spread it across multiple UI elements, or it
  loses its "recording light" meaning.
- New surfaces should pick from the existing 3-step elevation scale rather
  than introducing new background colors.
