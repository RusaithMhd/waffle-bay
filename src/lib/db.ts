import Dexie, { type EntityTable } from 'dexie'
import { Category, Product } from '@/types'
import { CheckoutPayload } from '@/app/actions/checkout'

export interface SyncOutboxEntry {
  id?: number
  payload: CheckoutPayload
  status: 'PENDING' | 'FAILED'
  error?: string
  created_at: number
}

const db = new Dexie('WaffleBayDB') as Dexie & {
  categories: EntityTable<Category, 'id'>
  products: EntityTable<Product, 'id'>
  syncOutbox: EntityTable<SyncOutboxEntry, 'id'>
}

// Schema declaration
db.version(1).stores({
  categories: 'id, sort_order',
  products: 'id, category_id, sort_order',
  syncOutbox: '++id, status, created_at'
})

export { db }
