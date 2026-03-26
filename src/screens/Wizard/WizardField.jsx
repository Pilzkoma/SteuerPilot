import { useState } from 'react'
import { colors, radius, spacing, typography } from '../../theme/tokens.js'

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix,
  min,
  max,
  step,
  disabled
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        style={{
          width: '100%',
          padding: `${spacing[3]} ${spacing[4]}`,
          paddingRight: suffix ? '3.5rem' : spacing[4],
          background: 'var(--color-surface-container-high)',
          border: `1.5px solid ${focused ? colors.primary : colors.outline_variant}`,
          borderRadius: radius.lg,
          color: 'var(--color-on-surface)',
          fontFamily: "'Manrope', -apple-system, sans-serif",
          fontSize: '0.9375rem',
          fontWeight: 500,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute',
          right: spacing[4],
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-on-surface-variant)',
          fontSize: '0.875rem',
          fontWeight: 600,
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {suffix}
        </span>
      )}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: "'Manrope', sans-serif",
        color: 'var(--color-on-surface)',
        fontSize: '0.875rem',
        fontWeight: 500,
        textAlign: 'left'
      }}
    >
      <div style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? colors.primary : colors.outline_variant,
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s ease'
      }}>
        <div style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: value ? colors.on_primary : colors.surface_container_high,
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          transition: 'left 0.2s ease'
        }} />
      </div>
      {label && <span>{label}</span>}
    </button>
  )
}

// ── WizardField ───────────────────────────────────────────────────────────────

export default function WizardField({ label, erklarung, elster, hinweis, children }) {
  return (
    <div style={{ marginBottom: spacing[5] }}>
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--color-on-surface)',
        marginBottom: spacing[2],
        letterSpacing: '0.01em'
      }}>
        {label}
      </label>

      {children}

      {erklarung && (
        <p style={{
          fontSize: '0.8125rem',
          fontWeight: 400,
          color: 'var(--color-on-surface-variant)',
          marginTop: spacing[2],
          marginBottom: 0,
          lineHeight: 1.55
        }}>
          {erklarung}
        </p>
      )}

      {elster && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginTop: spacing[2],
          padding: '2px 8px',
          background: 'rgba(173, 200, 245, 0.08)',
          border: '1px solid rgba(173, 200, 245, 0.18)',
          borderRadius: radius.md
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ color: colors.primary, flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: colors.primary,
            letterSpacing: '0.02em'
          }}>
            ELSTER: {elster}
          </span>
        </div>
      )}

      {hinweis && (
        <div style={{
          marginTop: spacing[2],
          padding: `${spacing[2]} ${spacing[3]}`,
          background: 'rgba(255, 185, 85, 0.07)',
          border: '1px solid rgba(255, 185, 85, 0.18)',
          borderRadius: radius.md
        }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: colors.secondary,
            margin: 0,
            lineHeight: 1.5
          }}>
            {hinweis}
          </p>
        </div>
      )}
    </div>
  )
}
