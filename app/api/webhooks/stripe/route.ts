import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { PLAN_TIERS, type PlanKey } from '@/lib/billing/planTiers'
import { sendPostPurchaseWelcomeEmail } from '@/lib/email'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    })
  : null

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const signature = headers().get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const payload = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, process.env.RESEND_WELCOME_TEMPLATE_ID)
        break
      default:
        break
    }
  } catch (error) {
    console.error('Stripe webhook handler error', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, templateVersion?: string) {
  if (invoice.billing_reason !== 'subscription_create') {
    return
  }

  if (!invoice.paid || (invoice.amount_paid ?? 0) === 0) {
    return
  }

  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

  if (!subscriptionId) {
    console.warn('Stripe webhook invoice missing subscription reference', invoice.id)
    return
  }

  const subscription = await stripe!.subscriptions.retrieve(subscriptionId)
  const metadata = subscription.metadata || {}
  const companyId = metadata.companyId
  const planKey = metadata.planKey as PlanKey | undefined

  if (!companyId || !planKey || !PLAN_TIERS[planKey]) {
    console.warn('Stripe webhook missing companyId or planKey metadata', { invoiceId: invoice.id, metadata })
    return
  }

  const [company, requestedByUser] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, email: true },
    }),
    metadata.requestedBy
      ? prisma.user.findUnique({ where: { id: metadata.requestedBy }, select: { id: true, email: true, name: true } })
      : null,
  ])

  if (!company) {
    console.warn('Stripe webhook could not find company for invoice', invoice.id)
    return
  }

  const invoiceLogged = await prisma.accessAuditLog.findFirst({
    where: {
      companyId,
      action: 'WELCOME_EMAIL_SENT',
      metadata: {
        path: ['invoiceId'],
        equals: invoice.id,
      },
    },
  })

  if (invoiceLogged) {
    return
  }

  const companyAlreadyWelcomed = await prisma.accessAuditLog.findFirst({
    where: {
      companyId,
      action: 'WELCOME_EMAIL_SENT',
    },
  })

  if (companyAlreadyWelcomed) {
    return
  }

  const plan = PLAN_TIERS[planKey]
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.trexaios.com'
  const supportEmail = process.env.SUPPORT_EMAIL
  if (!supportEmail) {
    console.error('SUPPORT_EMAIL is not configured. Skipping onboarding email send.')
    return
  }
  const recipientEmail = metadata.billingEmail || company.email || invoice.customer_email || requestedByUser?.email

  if (!recipientEmail) {
    console.warn('Stripe webhook unable to resolve recipient email for company', companyId)
    return
  }

  const checklist = [
    {
      title: 'Invite your teammates',
      detail: 'Assign owner/admin seats so estimating, compliance, and dispatch stay auditable.',
    },
    {
      title: 'Lock in branding + templates',
      detail: 'Upload estimating logos and review documents before the first customer PDF is sent.',
    },
    {
      title: 'Walk the dashboard checkpoints',
      detail: 'Review the user dashboard for open tasks, mentions, and compliance follow-ups.',
    },
  ]

  const highlights = [
    `${plan.name} plan billing confirmed for ${company.name}.`,
    `${plan.name} includes ${plan.features.length} production modules and ${plan.restrictions.length} enforced guardrails.`,
    `Seat allocation: owner ${formatSeatValue(plan.seatLimits.owner)}, admin ${formatSeatValue(plan.seatLimits.admin)}, estimator ${formatSeatValue(plan.seatLimits.estimator)}, user ${formatSeatValue(plan.seatLimits.user)}, field ${formatSeatValue(plan.seatLimits.field)}.`,
  ]

  if (!templateVersion) {
    console.error('RESEND_WELCOME_TEMPLATE_ID is not configured. Skipping onboarding email send.')
    return
  }

  await sendPostPurchaseWelcomeEmail({
    to: recipientEmail,
    companyName: company.name,
    planName: plan.name,
    planPriceLabel: plan.priceLabel,
    seatLimits: plan.seatLimits,
    dashboardUrl: `${appUrl}/app`,
    supportEmail,
    checklist,
    highlights,
    templateVersion,
  })

  await prisma.accessAuditLog.create({
    data: {
      companyId,
      actorId: requestedByUser?.id,
      action: 'WELCOME_EMAIL_SENT',
      metadata: {
        invoiceId: invoice.id,
        subscriptionId,
        stripeCustomerId: invoice.customer,
        planKey,
        planName: plan.name,
        planPriceLabel: plan.priceLabel,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        recipient: recipientEmail,
        templateVersion,
      },
    },
  })
}

function formatSeatValue(value: number) {
  return Number.isFinite(value) ? value : 'Unlimited'
}
