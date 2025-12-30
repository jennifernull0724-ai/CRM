import { SignupPageClient } from './signup-page-client'

export const metadata = {
  title: 'Create Account | T-REX AI OS',
  robots: {
    index: false,
    follow: false,
  },
} satisfies import('next').Metadata

export default function SignupPage() {
  return <SignupPageClient />
}
