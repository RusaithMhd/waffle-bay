import { db } from '@/lib/db'
import { ProductService } from '@/services/inventory/products'
import { createClient } from '@/lib/supabase/client'
import { processCheckout } from '@/app/actions/checkout'

export const SyncService = {
  
  /**
   * Pulls the latest menu from Supabase and caches it in Dexie.
   */
  async pullMenu() {
    try {
      const supabase = createClient()
      
      const categories = await ProductService.getCategories(supabase)
      const rawProducts = await ProductService.getProducts(supabase)
      
      const productsPromises = rawProducts.map(p => ProductService.getProductWithModifiers(supabase, p.id))
      const products = (await Promise.all(productsPromises)).filter(Boolean) as any[]

      await db.transaction('rw', db.categories, db.products, async () => {
        await db.categories.clear()
        await db.products.clear()
        
        await db.categories.bulkAdd(categories)
        await db.products.bulkAdd(products)
      })

      console.log('✅ Menu synchronized to local Dexie cache')
    } catch (error) {
      console.error('❌ Failed to pull menu:', error)
    }
  },

  /**
   * Pushes any pending orders in the local outbox to Supabase.
   */
  async pushOutbox() {
    try {
      const pending = await db.syncOutbox.where('status').equals('PENDING').toArray()
      
      if (pending.length === 0) return

      console.log(`🔄 Attempting to sync ${pending.length} offline orders...`)

      for (const entry of pending) {
        try {
          const res = await processCheckout(entry.payload)
          
          if (res.success) {
            await db.syncOutbox.delete(entry.id!)
            console.log(`✅ Synced order from outbox (ID: ${entry.id})`)
          } else {
            await db.syncOutbox.update(entry.id!, { 
              status: 'FAILED', 
              error: res.error 
            })
            console.error(`❌ Failed to sync order from outbox (ID: ${entry.id}):`, res.error)
          }
        } catch (err: any) {
          console.error(`❌ Network error while syncing order (ID: ${entry.id}):`, err)
          // Keep as PENDING if it's a network error so it retries next time
        }
      }
    } catch (error) {
      console.error('❌ Error processing outbox:', error)
    }
  }
}
