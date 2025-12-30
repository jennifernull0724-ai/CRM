import { revalidatePath } from 'next/cache'

export function revalidateContactSurfaces(contactId: string) {
	revalidatePath('/contacts')
	revalidatePath(`/contacts/${contactId}`)
	revalidatePath('/crm')
}
