'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import type { ActionState } from '@/app/contacts/actions'

const INITIAL_STATE: ActionState = { success: false }
const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024
const SIGNATURE_SELECTOR = /<div data-signature-block="true">[\s\S]*?<\/div>/gi

type EmailAccountOption = {
  id: string
  provider: 'gmail' | 'outlook'
  emailAddress: string
  displayName: string | null
  label: string | null
  syncStatus: string
  isPrimary: boolean
}

type TemplateOption = {
  id: string
  name: string
  subject: string
  body: string
  scope: string
  isDefault: boolean
}

type SignatureOption = { id: string; name: string; content: string } | null

type ContactEmailComposerProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  initialTo: string
  contactName: string
  accountOptions: EmailAccountOption[]
  templateOptions: TemplateOption[]
  defaultTemplateId: string | null
  signature: SignatureOption
}

export function ContactEmailComposer({
  action,
  initialTo,
  contactName,
  accountOptions,
  templateOptions,
  defaultTemplateId,
  signature,
}: ContactEmailComposerProps) {
  const [state, formAction] = useFormState(action, INITIAL_STATE)
  const defaultAccountId = accountOptions[0]?.id ?? ''
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId)
  const defaultTemplate = useMemo(
    () => templateOptions.find((template) => template.id === defaultTemplateId) ?? null,
    [templateOptions, defaultTemplateId]
  )
  const initialSignatureEnabled = Boolean(signature)
  const [includeSignature, setIncludeSignature] = useState(initialSignatureEnabled)
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId)
  const [subject, setSubject] = useState(defaultTemplate?.subject ?? '')
  const [toValue, setToValue] = useState(initialTo)
  const baseBody = defaultTemplate?.body ?? ''
  const [bodyHtml, setBodyHtml] = useState(() => applySignature(baseBody, signature, initialSignatureEnabled))
  const editorRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  useEffect(() => {
    if (state.success) {
      const resetTemplate = selectedTemplateId ? templateOptions.find((tpl) => tpl.id === selectedTemplateId) ?? null : null
      setSubject(resetTemplate?.subject ?? '')
      const resetBody = applySignature(resetTemplate?.body ?? '', signature, includeSignature)
      setBodyHtml(resetBody)
      if (editorRef.current) {
        editorRef.current.innerHTML = resetBody
      }
      setAttachments([])
      setAttachmentError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [state.success, includeSignature, selectedTemplateId, signature, templateOptions])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml
    }
  }, [bodyHtml])

  const plainBody = useMemo(() => toPlainText(bodyHtml), [bodyHtml])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId || null)
    if (!templateId) {
      setSubject('')
      const nextBody = applySignature('', signature, includeSignature)
      setBodyHtml(nextBody)
      if (editorRef.current) {
        editorRef.current.innerHTML = nextBody
      }
      return
    }
    const tpl = templateOptions.find((template) => template.id === templateId)
    if (!tpl) {
      return
    }
    setSubject(tpl.subject)
    const nextBody = applySignature(tpl.body, signature, includeSignature)
    setBodyHtml(nextBody)
    if (editorRef.current) {
      editorRef.current.innerHTML = nextBody
    }
  }

  const handleEditorInput = () => {
    if (!editorRef.current) return
    setBodyHtml(editorRef.current.innerHTML)
  }

  const handleSignatureToggle = (checked: boolean) => {
    setIncludeSignature(checked)
    setBodyHtml((current) => {
      const updated = applySignature(current, signature, checked)
      if (editorRef.current) {
        editorRef.current.innerHTML = updated
      }
      return updated
    })
  }

  const handleAttachmentsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = event.target.files ? Array.from(event.target.files) : []
    if (incoming.length === 0) {
      setAttachments([])
      setAttachmentError(null)
      return
    }

    let total = 0
    const accepted: File[] = []
    let error: string | null = null

    for (const file of incoming) {
      if (accepted.length >= MAX_ATTACHMENT_COUNT) {
        break
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        error = `${file.name} exceeds ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit`
        break
      }
      total += file.size
      if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
        error = 'Attachments exceed 25MB total limit'
        break
      }
      accepted.push(file)
    }

    if (error) {
      setAttachmentError(error)
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    syncInputFiles(accepted, fileInputRef)
    setAttachments(accepted)
    setAttachmentError(null)
  }

  const handleAttachmentRemove = (index: number) => {
    const next = attachments.filter((_, idx) => idx !== index)
    setAttachments(next)
    syncInputFiles(next, fileInputRef)
    if (next.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const runEditorCommand = (command: string) => {
    editorRef.current?.focus()
    document.execCommand(command)
  }

  return (
    <form action={formAction} className="space-y-5" onSubmit={() => setAttachmentError(null)}>
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Composer</p>
          <h3 className="text-2xl font-semibold text-white">Write to {contactName}</h3>
          <p className="text-xs text-slate-500">Attachments upload to private object storage automatically.</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-slate-400">
            From
            <select
              name="accountId"
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              required
            >
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountLabel(account)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Template
            <select
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              value={selectedTemplateId ?? ''}
              onChange={(event) => handleTemplateChange(event.target.value)}
            >
              <option value="">Blank canvas</option>
              {templateOptions.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.scope}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-slate-400">
            To
            <input
              name="to"
              value={toValue}
              onChange={(event) => setToValue(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              placeholder="contact@email.com"
              required
            />
          </label>
          <label className="text-xs text-slate-400">
            Subject
            <input
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              placeholder="Subject line"
              required
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-slate-400">
            CC
            <input
              name="cc"
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              placeholder="Comma separated"
            />
          </label>
          <label className="text-xs text-slate-400">
            BCC
            <input
              name="bcc"
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
              placeholder="Comma separated"
            />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Body</span>
            <button
              type="button"
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-wide"
              onClick={() => runEditorCommand('bold')}
            >
              Bold
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-wide"
              onClick={() => runEditorCommand('insertUnorderedList')}
            >
              Bullet
            </button>
            {signature ? (
              <label className="ml-auto inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 text-emerald-400"
                  checked={includeSignature}
                  onChange={(event) => handleSignatureToggle(event.target.checked)}
                />
                Include signature
              </label>
            ) : null}
          </div>
          <div
            ref={editorRef}
            className="mt-3 min-h-[200px] rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm leading-relaxed text-slate-50 focus:outline-none"
            contentEditable
            spellCheck
            onInput={handleEditorInput}
          />
        </div>
        <input type="hidden" name="bodyHtml" value={bodyHtml} />
        <input type="hidden" name="bodyText" value={plainBody} />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Attachments</p>
          <span className="text-[11px] text-slate-500">{attachments.length}/{MAX_ATTACHMENT_COUNT} files</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-emerald-400/60 bg-emerald-400/5 px-4 py-2 text-sm text-emerald-200">
            <input
              ref={fileInputRef}
              type="file"
              name="attachments"
              className="hidden"
              multiple
              onChange={handleAttachmentsChange}
            />
            Upload
          </label>
          {attachments.map((file, index) => (
            <span key={file.name + index} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">
              {file.name} · {formatSize(file.size)}
              <button type="button" className="text-slate-400 hover:text-slate-100" onClick={() => handleAttachmentRemove(index)}>
                ×
              </button>
            </span>
          ))}
        </div>
        {attachmentError ? <p className="mt-2 text-xs text-rose-300">{attachmentError}</p> : null}
      </div>

      {state.message && (
        <p className={`text-sm ${state.success ? 'text-emerald-300' : 'text-rose-300'}`}>{state.message}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={state.success ? 'Sent' : 'Send email'} />
        <p className="text-xs text-slate-500">Emails log to the timeline instantly.</p>
      </div>
    </form>
  )
}

function applySignature(html: string, signature: SignatureOption, includeSignature: boolean): string {
  const trimmed = html.replace(SIGNATURE_SELECTOR, '').trim()
  if (!includeSignature || !signature?.content) {
    return trimmed
  }
  const spacer = trimmed ? '<br />' : ''
  return `${trimmed}${spacer}<div data-signature-block="true">${signature.content}</div>`
}

function toPlainText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function syncInputFiles(files: File[], inputRef: React.RefObject<HTMLInputElement>) {
  const dataTransfer = new DataTransfer()
  files.forEach((file) => dataTransfer.items.add(file))
  if (inputRef.current) {
    inputRef.current.files = dataTransfer.files
  }
}

function formatAccountLabel(account: EmailAccountOption) {
  const name = account.displayName ?? account.label ?? account.emailAddress
  return `${name} · ${account.provider}`
}

function formatSize(size: number) {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Sending…' : label}
    </button>
  )
}
