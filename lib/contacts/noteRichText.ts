import sanitizeHtml from 'sanitize-html'

export const NOTE_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'code'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
}

export function sanitizeNoteBody(body: string) {
  return sanitizeHtml(body, NOTE_SANITIZE_OPTIONS)
}
