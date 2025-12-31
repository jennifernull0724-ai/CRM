import { redirect } from 'next/navigation'

export default async function CrmContactsPage() {
  // Redirect to canonical contacts route
  // CRM nav now points directly to /contacts
  redirect('/contacts')
}
