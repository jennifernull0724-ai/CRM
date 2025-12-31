import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLAN_TIERS, getTotalSeats, type PlanKey } from '@/lib/billing/planTiers'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: '2025-12-15.clover',
    })
  : null

const PRICE_LOOKUP: Record<Exclude<PlanKey, 'starter'>, string | undefined> = {
  growth: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  pro: process.env.STRIPE_PRICE_PRO_ANNUAL,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!session.user.companyId) {
    return NextResponse.json({ error: 'Company missing for user' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const requestedPlan = body.planKey as PlanKey
    const seatCountInput = Number(body.seatCount)

    if (!requestedPlan || requestedPlan === 'starter') {
      return NextResponse.json({ error: 'Starter plan does not use Stripe checkout' }, { status: 400 })
    }

    const plan = PLAN_TIERS[requestedPlan]

    if (!plan || !plan.stripeEligible) {
      return NextResponse.json({ error: 'Requested plan is not Stripe-eligible' }, { status: 400 })
    }

    const priceId = PRICE_LOOKUP[requestedPlan]
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price ID missing for plan' }, { status: 500 })
    }

    const defaultSeats = getTotalSeats(plan.seatLimits)
    const baseSeats = Number.isFinite(defaultSeats) ? defaultSeats : 1
    const seatCount = Number.isFinite(seatCountInput) && seatCountInput > 0 ? seatCountInput : baseSeats
    const quantity = requestedPlan === 'pro' ? seatCount : 1
    const metadataSeatCount = requestedPlan === 'pro' ? seatCount : baseSeats

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        planKey: true,
        stripeCustomerId: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (company.planKey === requestedPlan) {
      return NextResponse.json({ error: 'Workspace already on requested plan' }, { status: 400 })
    }

    let stripeCustomerId = company.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: company.email || session.user.email,
        name: company.name,
        metadata: {
          companyId: company.id,
        },
      })

      stripeCustomerId = customer.id

      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId: customer.id },
      })
    }

    const origin = req.nextUrl.origin
    const successUrl = `${origin}/upgrade/success?plan=${requestedPlan}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/upgrade?plan=${requestedPlan}&canceled=1`

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      customer: stripeCustomerId,
      billing_address_collection: 'required',
      subscription_data: {
        metadata: {
          companyId: company.id,
          planKey: requestedPlan,
          seatCount: metadataSeatCount,
          requestedBy: session.user.id,
          ownerUserId: session.user.id,
          companyName: company.name,
          billingEmail: company.email || session.user.email || '',
        },
      },
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        companyId: company.id,
        planKey: requestedPlan,
        requestedBy: session.user.id,
        ownerUserId: session.user.id,
        seatCount: metadataSeatCount,
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('POST /api/stripe/checkout error', error)
    return NextResponse.json({ error: 'Unable to start Stripe checkout' }, { status: 500 })
  }
}
