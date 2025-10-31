export interface Vehicle {
  id: string
  vehicleNumber: string
  modelType: string
}

export type CreditType = 'online' | 'cash'

export interface Credit {
  id: string
  amount: number
  date: string
  type?: CreditType // Optional for backward compatibility
}

export type BillingCycle = 'one-time' | 'monthly' | 'daily'

export interface Job {
  id: string
  title: string
  description: string
  budget: number
  billingCycle: BillingCycle
  startDate?: string
  endDate?: string
  durationMonths?: number
  credits: Credit[]
}

export interface Expense {
  id: string
  title: string
  amount: number
  date: string
  description?: string
}

