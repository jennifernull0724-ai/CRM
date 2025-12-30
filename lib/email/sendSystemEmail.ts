import { Resend } from 'resend'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const RECIPIENT_ENVIRONMENT_MAP = {
  contact: 'CONTACT_FORM_TO',
  requestDemo: 'REQUEST_DEMO_TO',
  security: 'SECURITY_FORM_TO',
  support: 'SUPPORT_FORM_TO',
  admin: 'ADMIN_NOTIFICATION_EMAIL',
} as const

export type SystemRecipient = keyof typeof RECIPIENT_ENVIRONMENT_MAP
export type SystemFormType = 'contact' | 'request-demo' | 'security' | 'support' | 'system'

export interface SendSystemEmailParams {
  recipient: SystemRecipient
  subject: string
  html: string
  text?: string
  eventType: string
  formType: SystemFormType
  metadata?: Prisma.JsonObject
  tags?: Array<{ name: string; value: string }>
}

class MissingEnvError extends Error {
  constructor(public readonly envKey: string) {
    super(`${envKey} is not configured`)
  }
}

const getResendClient = (() => {
  let client: Resend | null = null

  return () => {
    if (client) return client

    const apiKey = process.env.RESEND_API_KEY?.trim()
    if (!apiKey) {
      throw new MissingEnvError('RESEND_API_KEY')
    }

    client = new Resend(apiKey)
    return client
  }
})()

const resolveEnv = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new MissingEnvError(key)
  }

  return value
}

const logSystemEmailAttempt = async (args: {
  eventType: string
  formType: SystemFormType
  recipient: string
  sender: string
  payload?: Prisma.JsonObject
  success: boolean
  errorMessage?: string
  attemptedAt: Date
}) => {
  try {
    await prisma.systemEmailLog.create({
      data: {
        eventType: args.eventType,
        formType: args.formType,
        recipient: args.recipient,
        sender: args.sender,
        payload: args.payload ?? Prisma.JsonNull,
        success: args.success,
        errorMessage: args.errorMessage,
        attemptedAt: args.attemptedAt,
      },
    })
  } catch (error) {
    console.error('Failed to persist system email log', error)
  }
}

export async function sendSystemEmail(params: SendSystemEmailParams) {
  const attemptedAt = new Date()
  const resend = getResendClient()
  const senderEnvKey = 'EMAIL_FROM'
  const recipientEnvKey = RECIPIENT_ENVIRONMENT_MAP[params.recipient]

  let senderAddress: string | null = null
  let recipientAddress: string | null = null

  try {
    senderAddress = resolveEnv(senderEnvKey)
    recipientAddress = resolveEnv(recipientEnvKey)
    const replyTo = process.env.EMAIL_REPLY_TO?.trim()

    const result = await resend.emails.send({
      from: senderAddress,
      to: [recipientAddress],
      subject: params.subject,
      html: params.html,
      ...(params.text && { text: params.text }),
      ...(replyTo && { reply_to: replyTo }),
      ...(params.tags && { tags: params.tags }),
    })

    await logSystemEmailAttempt({
      eventType: params.eventType,
      formType: params.formType,
      recipient: recipientAddress,
      sender: senderAddress,
      payload: params.metadata,
      success: true,
      attemptedAt,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email failure'

    await logSystemEmailAttempt({
      eventType: params.eventType,
      formType: params.formType,
      recipient: recipientAddress ?? `env:${recipientEnvKey}`,
      sender: senderAddress ?? `env:${senderEnvKey}`,
      payload: params.metadata,
      success: false,
      errorMessage,
      attemptedAt,
    })

    throw error
  }
}
