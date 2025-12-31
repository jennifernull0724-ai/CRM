'use client'

import { useEffect, useRef } from 'react'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => onOpenChange(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onOpenChange])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      onOpenChange(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="rounded-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {children}
    </dialog>
  )
}

type DialogContentProps = {
  children: React.ReactNode
  className?: string
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return (
    <div className={`bg-white ${className}`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  )
}
