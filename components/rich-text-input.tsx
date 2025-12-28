'use client'

import { useRef, useState } from 'react'

type RichTextInputProps = {
  name: string
  label?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  minRows?: number
}

export function RichTextInput({ name, label, defaultValue = '', placeholder, required, minRows = 4 }: RichTextInputProps) {
  const [value, setValue] = useState(defaultValue)
  const editorRef = useRef<HTMLDivElement>(null)

  const handleInput = () => {
    setValue(editorRef.current?.innerHTML ?? '')
  }

  const runCommand = (command: string) => {
    document.execCommand(command)
    editorRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      {label ? <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label> : null}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button type="button" onClick={() => runCommand('bold')} className="rounded border border-slate-200 px-2 py-1 font-semibold">
          Bold
        </button>
        <button type="button" onClick={() => runCommand('insertUnorderedList')} className="rounded border border-slate-200 px-2 py-1">
          Bullets
        </button>
        <span className="text-slate-400">Rich text</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline focus:outline-2 focus:outline-slate-500"
        style={{ minHeight: `${minRows * 24}px` }}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        onInput={handleInput}
      />
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  )
}
