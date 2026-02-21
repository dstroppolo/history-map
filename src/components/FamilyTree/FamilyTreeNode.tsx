import { motion } from 'framer-motion'
import type { FamilyTreeNodeData } from '@/types/familyTreeNode'

interface FamilyTreeNodeProps extends FamilyTreeNodeData {
  loading?: boolean
  onAddParent?: () => void
  onAddChild?: () => void
}

export default function FamilyTreeNode({
  name,
  avatarUrl,
  birthYear,
  deathYear,
  loading,
  onAddParent,
  onAddChild,
}: FamilyTreeNodeProps) {
  const showAddParent = !!onAddParent
  const showAddChild = !!onAddChild
  const years =
    birthYear || deathYear
      ? `${birthYear ?? '?'} – ${deathYear ?? ''}`
      : null

  return (
    <motion.div
      style={{
        width: 220,
        height: 200,
        minHeight: 200,
        padding: '20px 16px',
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        opacity: loading ? 0.6 : 1,
      }}
      whileHover={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
    >
      {/* Add parent button */}
      {showAddParent && (
        <button
          type="button"
          onClick={onAddParent}
          aria-label="Add parent"
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'var(--color-card)',
            color: 'var(--color-secondary)',
            fontSize: 18,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-muted)'
            e.currentTarget.style.color = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-card)'
            e.currentTarget.style.color = 'var(--color-secondary)'
          }}
        >
          +
        </button>
      )}

      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            objectFit: 'cover',
            marginBottom: 8,
            flexShrink: 0,
            background: 'var(--color-muted)',
          }}
        />
      ) : (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--color-muted)',
            marginBottom: 8,
            flexShrink: 0,
          }}
        />
      )}

      {/* Name */}
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-primary)',
          textAlign: 'center',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          maxHeight: '2.6em',
          width: '100%',
          minHeight: 0,
        }}
      >
        {name}
      </h3>

      {years && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-secondary)',
            marginTop: 2,
          }}
        >
          {years}
        </span>
      )}

      {/* Add child button */}
      {showAddChild && (
        <button
          type="button"
          onClick={onAddChild}
          aria-label="Add child"
          style={{
            position: 'absolute',
            bottom: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid var(--color-border)',
            background: 'var(--color-card)',
            color: 'var(--color-secondary)',
            fontSize: 18,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-muted)'
            e.currentTarget.style.color = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-card)'
            e.currentTarget.style.color = 'var(--color-secondary)'
          }}
        >
          +
        </button>
      )}
    </motion.div>
  )
}
