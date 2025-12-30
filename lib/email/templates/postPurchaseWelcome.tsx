import * as React from 'react'
import type { SeatLimits } from '@/lib/billing/planTiers'

export interface PostPurchaseWelcomeTemplateProps {
  companyName: string
  planName: string
  planPriceLabel: string
  dashboardUrl: string
  supportEmail: string
  seatLimits: SeatLimits
  checklist: Array<{ title: string; detail: string; href?: string }>
  highlights: string[]
}

function formatSeatCount(value: number) {
  return Number.isFinite(value) ? value.toString() : 'Unlimited'
}

export function PostPurchaseWelcomeEmailTemplate(props: PostPurchaseWelcomeTemplateProps) {
  const { companyName, planName, planPriceLabel, dashboardUrl, supportEmail, seatLimits, checklist, highlights } = props

  const seatRows = [
    { label: 'Owners', value: formatSeatCount(seatLimits.owner) },
    { label: 'Admins', value: formatSeatCount(seatLimits.admin) },
    { label: 'Estimators', value: formatSeatCount(seatLimits.estimator) },
    { label: 'Users', value: formatSeatCount(seatLimits.user) },
    { label: 'Field', value: formatSeatCount(seatLimits.field) },
  ]

  return (
    <html>
      <body style={{ backgroundColor: '#0f172a', margin: 0, padding: 0, fontFamily: 'Inter, Arial, sans-serif', color: '#0f172a' }}>
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
          <tbody>
            <tr>
              <td align="center" style={{ padding: '32px 12px' }}>
                <table width="560" cellPadding={0} cellSpacing={0} role="presentation" style={{ backgroundColor: '#ffffff', borderRadius: '24px', overflow: 'hidden' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '32px 32px 12px 32px', backgroundColor: '#020617' }}>
                        <p style={{ color: '#38bdf8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>T-REX AI OS</p>
                        <h1 style={{ color: '#ffffff', margin: '12px 0 0', fontSize: '28px', lineHeight: '34px' }}>Welcome to the {planName} plan, {companyName}</h1>
                        <p style={{ color: '#94a3b8', fontSize: '15px', margin: '12px 0 0' }}>Your subscription ({planPriceLabel}) is active. The workspace is now unlocked for paid-only workflows.</p>
                        <a
                          href={dashboardUrl}
                          style={{
                            display: 'inline-block',
                            marginTop: '16px',
                            padding: '12px 20px',
                            backgroundColor: '#38bdf8',
                            color: '#020617',
                            textDecoration: 'none',
                            borderRadius: '999px',
                            fontWeight: 600,
                          }}
                        >
                          Open your dashboard
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '28px 32px 16px 32px' }}>
                        {highlights.map((line) => (
                          <p key={line} style={{ fontSize: '15px', color: '#0f172a', margin: '0 0 12px 0', lineHeight: '22px' }}>
                            {line}
                          </p>
                        ))}
                        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderCollapse: 'collapse', marginTop: '16px' }}>
                          <tbody>
                            <tr>
                              <td colSpan={2} style={{ fontWeight: 600, fontSize: '15px', paddingBottom: '8px', color: '#0f172a' }}>
                                Seat allocation overview
                              </td>
                            </tr>
                            {seatRows.map((row) => (
                              <tr key={row.label}>
                                <td style={{ padding: '6px 0', color: '#475569', fontSize: '14px' }}>{row.label}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#0f172a', fontSize: '14px', fontWeight: 600 }}>{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#0f172a' }}>Next steps</p>
                          <ol style={{ paddingLeft: '18px', margin: 0, color: '#1e293b' }}>
                            {checklist.map((item) => (
                              <li key={item.title} style={{ marginBottom: '10px' }}>
                                <strong>{item.title}.</strong> {item.detail}
                                {item.href ? (
                                  <>
                                    {' '}
                                    <a href={item.href} style={{ color: '#0ea5e9', textDecoration: 'none' }}>
                                      View
                                    </a>
                                  </>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '24px' }}>
                          Need help? Reply to this email or contact {supportEmail}. A human on the T-REX team is on call.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ color: '#475569', fontSize: '12px', marginTop: '24px' }}>
                  Sent securely via Resend · T-REX AI OS
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

export function renderPostPurchaseWelcomeText(props: PostPurchaseWelcomeTemplateProps) {
  const seatRows = [
    `Owners: ${formatSeatCount(props.seatLimits.owner)}`,
    `Admins: ${formatSeatCount(props.seatLimits.admin)}`,
    `Estimators: ${formatSeatCount(props.seatLimits.estimator)}`,
    `Users: ${formatSeatCount(props.seatLimits.user)}`,
    `Field: ${formatSeatCount(props.seatLimits.field)}`,
  ]

  const checklist = props.checklist.map((item, index) => `${index + 1}. ${item.title} - ${item.detail}${item.href ? ` (${item.href})` : ''}`)

  return [
    `Welcome to the ${props.planName} plan, ${props.companyName}!`,
    '',
    ...props.highlights,
    '',
    `Plan price: ${props.planPriceLabel}`,
    'Seats:',
    ...seatRows,
    '',
    'Next steps:',
    ...checklist,
    '',
    `Dashboard: ${props.dashboardUrl}`,
    `Help: ${props.supportEmail}`,
  ].join('\n')
}
