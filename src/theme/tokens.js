/**
 * SteuerPilot Design Tokens — "The Financial Architect"
 *
 * Quelle: Design/stitch_einstellungen_ios/steuerpilot_midnight/DESIGN.md
 *
 * Regeln:
 * - Keine 1px Divider — Trennung nur durch Hintergrundfarb-Wechsel
 * - Kein #000000 — immer surface_container_lowest
 * - Glassmorphism für floating Elemente (backdrop-blur)
 * - Amber (secondary) ist ein Leuchtturm, keine Flutlicht — sparsam einsetzen
 */

export const colors = {
  // ── Primärfarben ────────────────────────────────────────────────────────────
  primary: '#adc8f5',
  on_primary: '#0d2d4f',
  primary_container: '#1e3a5f',
  on_primary_container: '#d3e4ff',
  primary_fixed: '#d3e4ff',
  primary_fixed_dim: '#adc8f5',

  // ── Sekundärfarbe (Amber — sparsam!) ────────────────────────────────────────
  secondary: '#ffb955',
  on_secondary: '#432b00',
  secondary_container: '#5f3f00',
  on_secondary_container: '#ffddb3',

  // ── Tertiärfarbe ─────────────────────────────────────────────────────────────
  tertiary: '#a8c7a0',
  on_tertiary: '#0f3b12',
  tertiary_container: '#1c4e22',
  on_tertiary_container: '#c4e3bb',

  // ── Fehler ───────────────────────────────────────────────────────────────────
  error: '#ff8a80',
  on_error: '#5f0000',
  error_container: '#7f1d1d',
  on_error_container: '#ffdad6',

  // ── Hintergrund ──────────────────────────────────────────────────────────────
  background: '#111125',
  on_background: '#e3e2f4',

  // ── Surface-Hierarchie (Tonal Layering — kein shadow, kein border) ───────────
  surface: '#111125',
  surface_dim: '#0e0e1c',
  surface_bright: '#1e1e38',
  surface_container_lowest: '#0b0b18',
  surface_container_low: '#171728',
  surface_container: '#1c1c30',
  surface_container_high: '#222238',
  surface_container_highest: '#2a2a42',
  on_surface: '#e3e2f4',
  on_surface_variant: '#9b99b5',

  // ── Outline ───────────────────────────────────────────────────────────────────
  outline: '#4f4d6a',
  outline_variant: '#2e2c45',

  // ── Status-Farben ─────────────────────────────────────────────────────────────
  success: '#a8c7a0',
  warning: '#ffb955',
  info: '#adc8f5'
}

export const typography = {
  // Einzige Schrift: Manrope
  fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",

  // Display
  displayLg: { fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
  displayMd: { fontSize: '2.75rem', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.015em' },
  displaySm: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },

  // Headlines
  headlineLg: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25 },
  headlineMd: { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.3 },
  headlineSm: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },

  // Body
  bodyLg: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
  bodyMd: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.55 },
  bodySm: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.5 },

  // Labels
  labelLg: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.01em' },
  labelMd: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.01em' },
  labelSm: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.35, letterSpacing: '0.01em' }
}

export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem'
}

export const radius = {
  sm: '0.25rem',
  md: '0.375rem',   // Standard für Chips, Tags
  lg: '0.75rem',    // Standard für Cards
  xl: '1.25rem',    // Größere Karten, Panels
  pill: '9999px'    // Buttons (Primary)
}

export const shadow = {
  // Kein #000000 — immer primary_fixed_dim getönt
  sm: '0 2px 8px rgba(13, 45, 79, 0.12)',
  md: '0 4px 16px rgba(13, 45, 79, 0.14)',
  lg: '0 8px 24px rgba(13, 45, 79, 0.16)',
  float: '0 4px 24px rgba(13, 45, 79, 0.06)'  // für floating Elemente (6% opacity)
}

export const animation = {
  // Alle Animationen sind spring-basiert (framer-motion)
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30
  },
  springGentle: {
    type: 'spring',
    stiffness: 200,
    damping: 25
  },
  springBouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 25,
    mass: 0.8
  }
}

// Direkte Exports für bequemen Import in Komponenten
export const spring = animation.spring
export const springGentle = animation.springGentle
export const springBouncy = animation.springBouncy

// CSS Custom Properties — werden in index.css eingesetzt
export const cssVariables = Object.entries(colors)
  .map(([key, value]) => `  --color-${key.replace(/_/g, '-')}: ${value};`)
  .join('\n')
