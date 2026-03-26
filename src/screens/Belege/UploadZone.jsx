import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { spring, springGentle } from '../../theme/tokens.js'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.pdf']

function IconUpload() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 8 12 3 7 8"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export default function UploadZone({ onFilesAdded, disabled }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function validateAndProcess(files) {
    setError('')
    const valid = []
    const invalid = []

    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type) ||
          ACCEPTED_EXT.some(ext => file.name.toLowerCase().endsWith(ext))) {
        valid.push(file)
      } else {
        invalid.push(file.name)
      }
    }

    if (invalid.length > 0) {
      setError(`Nicht unterstützt: ${invalid.join(', ')} — nur JPG, PNG, PDF erlaubt.`)
    }

    if (valid.length > 0) onFilesAdded(valid)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    validateAndProcess(files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
  }

  function handleInputChange(e) {
    const files = Array.from(e.target.files)
    validateAndProcess(files)
    e.target.value = ''
  }

  return (
    <div>
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        animate={{
          borderColor: dragOver
            ? 'var(--color-secondary)'
            : 'var(--color-outline-variant)',
          background: dragOver
            ? 'rgba(255,185,85,0.05)'
            : 'transparent',
          scale: dragOver ? 1.01 : 1
        }}
        transition={spring}
        style={{
          border: '2px dashed var(--color-outline-variant)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.875rem',
          userSelect: 'none',
          opacity: disabled ? 0.5 : 1
        }}
      >
        <motion.div
          animate={{ color: dragOver ? 'var(--color-secondary)' : 'var(--color-on-surface-variant)' }}
          transition={springGentle}
        >
          <IconUpload />
        </motion.div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            color: 'var(--color-on-surface)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '0.25rem'
          }}>
            {dragOver ? 'Loslassen zum Hochladen' : 'Belege hier ablegen'}
          </p>
          <p style={{
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.75rem'
          }}>
            oder klicken zum Auswählen · JPG, PNG, PDF
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {['JPG', 'PNG', 'PDF'].map(fmt => (
            <span key={fmt} style={{
              fontSize: '0.5625rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--color-on-surface-variant)',
              background: 'var(--color-surface-container)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-outline-variant)'
            }}>{fmt}</span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springGentle}
            style={{
              color: 'var(--color-error)',
              fontSize: '0.75rem',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            <IconFile />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
