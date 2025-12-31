'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type SearchResult = {
  id: string
  type: 'contact' | 'deal' | 'task'
  title: string
  subtitle: string
  url: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  // Cmd/Ctrl + K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false)
      router.push(url)
    },
    [router]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex].url)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [results, selectedIndex, handleSelect]
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return '👤'
      case 'deal':
        return '💼'
      case 'task':
        return '✓'
      default:
        return '📄'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact':
        return 'Contact'
      case 'deal':
        return 'Deal'
      case 'task':
        return 'Task'
      default:
        return 'Item'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="border-b border-slate-200 px-4 py-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search contacts, deals, tasks..."
              className="w-full border-0 bg-transparent text-base outline-none placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Searching...
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No results found
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result.url)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{getTypeIcon(result.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.title}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-slate-500 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && query.length < 2 && (
            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
              Type to search across contacts, deals, and tasks
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
