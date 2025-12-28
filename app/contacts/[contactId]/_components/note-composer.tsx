'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFormState } from 'react-dom'
import type { ActionState } from '@/app/contacts/actions'

const INITIAL_STATE: ActionState = { success: false }

type MentionableUser = {
  id: string
  name: string
  role: string
  email?: string | null
}

type NoteComposerProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  mentionableUsers: MentionableUser[]
}

export function NoteComposer({ action, mentionableUsers }: NoteComposerProps) {
  const [state, formAction] = useFormState(action, INITIAL_STATE)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<MentionableUser[]>([])
  const editorRef = useRef<HTMLDivElement | null>(null)
  const hiddenInputRef = useRef<HTMLInputElement | null>(null)

  const filteredUsers = useMemo(() => {
    if (!query) {
      return mentionableUsers.slice(0, 5)
    }
    const normalized = query.toLowerCase()
    return mentionableUsers
      .filter((user) =>
        `${user.name} ${user.role} ${user.email ?? ''}`.toLowerCase().includes(normalized)
      )
      .slice(0, 5)
  }, [mentionableUsers, query])

  const handleFormat = useCallback((command: string) => {
    document.execCommand(command, false)
  }, [])

  const handleSubmit = useCallback(() => {
    if (hiddenInputRef.current && editorRef.current) {
      hiddenInputRef.current.value = editorRef.current.innerHTML
    }
  }, [])

  const addMention = useCallback(
    (user: MentionableUser) => {
      if (selected.find((item) => item.id === user.id)) {
        return
      }
      setSelected((prev) => [...prev, user])
      setQuery('')
    },
    [selected]
  )

  const removeMention = useCallback((id: string) => {
    setSelected((prev) => prev.filter((user) => user.id !== id))
  }, [])

  useEffect(() => {
    if (state.success) {
      if (editorRef.current) {
        editorRef.current.innerHTML = ''
      }
      setSelected([])
      setQuery('')
    }
  }, [state.success])

  return (
    <form action={formAction} className="space-y-4" onSubmit={handleSubmit}>
      <input ref={hiddenInputRef} type="hidden" name="body" />
      {selected.map((user) => (
        <input key={user.id} type="hidden" name="mentionIds" value={user.id} />
      ))}
      <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
            onClick={() => handleFormat('bold')}
          >
            Bold
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
            onClick={() => handleFormat('italic')}
          >
            Italic
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-600 px-3 py-1 text-xs uppercase tracking-wide text-slate-200"
            onClick={() => handleFormat('insertUnorderedList')}
          >
            Bullet
          </button>
        </div>
        <div
          ref={editorRef}
          className="mt-3 min-h-[140px] rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm leading-relaxed text-slate-50 focus:outline-none"
          contentEditable
          data-placeholder="Type a note..."
          suppressContentEditableWarning
        />
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">@ Mentions</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.length === 0 && (
            <p className="text-xs text-slate-500">Nobody mentioned yet.</p>
          )}
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
            >
              @{user.name}
              <button
                type="button"
                className="text-emerald-200/80 hover:text-emerald-50"
                onClick={() => removeMention(user.id)}
                aria-label={`Remove ${user.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search teammates to mention"
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
          {filteredUsers.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left text-sm last:border-none hover:bg-slate-900"
                  onClick={() => addMention(user)}
                >
                  <span>
                    {user.name}
                    <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{user.role}</span>
                  </span>
                  <span className="text-xs text-slate-500">Add</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {state.message && (
        <p className={`text-sm ${state.success ? 'text-emerald-300' : 'text-rose-300'}`}>{state.message}</p>
      )}

      <button
        type="submit"
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 hover:bg-emerald-300"
      >
        Save note
      </button>
    </form>
  )
}
