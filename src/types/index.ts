export interface User {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: 'USER' | 'ADMIN' | 'OWNER'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SystemState {
  id: string
  state: 'OWNER_SETUP' | 'ENFORCED'
  updatedAt: Date
  updatedBy?: string | null
}
