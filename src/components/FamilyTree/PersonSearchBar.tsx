import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchWikidataEntities, type WikidataSearchResult } from '@/services/wikidata'

const DEBOUNCE_MS = 350

export default function PersonSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WikidataSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setOpen(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const items = await searchWikidataEntities(query.trim(), 8, true)
      setResults(items)
      setLoading(false)
      setOpen(true)
      setHighlightIndex(-1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback(
    (item: WikidataSearchResult) => {
      navigate(`/family-tree?root=${item.id}`)
      setQuery('')
      setResults([])
      setOpen(false)
    },
    [navigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        setOpen(false)
        setHighlightIndex(-1)
        return
      }
      if (results.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((i) => (i < results.length - 1 ? i + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((i) => (i > 0 ? i - 1 : results.length - 1))
      } else if (e.key === 'Enter' && highlightIndex >= 0) {
        e.preventDefault()
        handleSelect(results[highlightIndex])
      }
    },
    [open, results, highlightIndex, handleSelect]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search any historical figure…"
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: 999,
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          backdropFilter: 'blur(12px)',
          color: 'var(--color-primary)',
          fontSize: 13,
          outline: 'none',
        }}
      />
      {open && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            marginTop: 8,
            padding: 6,
            listStyle: 'none',
            background: 'var(--color-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          {loading ? (
            <li style={{ padding: '8px 10px', color: 'var(--color-secondary)', fontSize: 13 }}>
              Searching...
            </li>
          ) : results.length === 0 ? (
            <li style={{ padding: '8px 10px', color: 'var(--color-secondary)', fontSize: 13 }}>
              No results
            </li>
          ) : (
            results.map((item, i) => (
              <li
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  background: i === highlightIndex ? 'var(--color-muted)' : 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 500 }}>{item.label}</div>
                {item.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
