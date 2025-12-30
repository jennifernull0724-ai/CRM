import { LoginPageClient } from './login-page-client'

export const metadata = {
  title: 'Login | T-REX AI OS',
  robots: {
    index: false,
    follow: false,
  },
} satisfies import('next').Metadata

export default function LoginPage() {
  return <LoginPageClient />
}
