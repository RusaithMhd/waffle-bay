# WAFFLE BAY POS - Architecture

## Application Layers

1. **UI Layer (Next.js App Router & React Components)**
   - Responsible strictly for rendering and user interaction.
   - Resides in `src/app/` and `src/components/`.
   - Uses Tailwind CSS and shadcn/ui for styling.

2. **State Management (Zustand)**
   - Client-side application state (Cart, offline status, current user).
   - Resides in `src/stores/`.

3. **Hooks Layer (React Hooks)**
   - Connects UI to application services.
   - Resides in `src/hooks/`.

4. **Application Services**
   - Contains core business logic (Order processing, Payments, Accounting).
   - Fully decoupled from React components.
   - Resides in `src/services/`.

5. **Data Access Layer**
   - Handles communication with Supabase (online) and Dexie/IndexedDB (offline).
   - Synchronizes data between local storage and remote database via Sync Queue.

## Offline First Approach
The POS is designed to function seamlessly without an internet connection.
- Master data (products, categories, prices) is cached locally.
- Transactions are stored in a local Sync Queue.
- The `SyncService` attempts to synchronize transactions when the connection is restored using idempotent operations.

## Security
- Row Level Security (RLS) policies govern data access on the Supabase backend.
- No `service-role` keys are exposed to the client.
- Sensitive operations (Refunds, Voids, Price adjustments) require specific role permissions.
