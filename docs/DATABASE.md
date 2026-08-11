# WAFFLE BAY POS - Database Schema

This document outlines the entire database schema for Waffle Bay POS. This aligns with Phase 03 through 14 execution.

## 1. Authentication & Users (`auth.users`, `public.profiles`, `public.roles`)
- **`roles`**: Contains roles `OWNER`, `MANAGER`, `CASHIER`.
- **`profiles`**: Linked to `auth.users`, stores user names and metadata.
- **`user_roles`**: Many-to-many relationship mapping users to roles.

## 2. Products & Modifiers (Menu)
- **`categories`**: Menu categories (e.g., Waffles, Shakes, Coffees).
- **`products`**:
  - `id` (UUID)
  - `name` (TEXT)
  - `description` (TEXT)
  - `base_price` (NUMERIC)
  - `category_id` (FK to categories)
  - `image_url` (TEXT)
  - `is_active` (BOOLEAN)
  - `sku` (TEXT) - Unique SKU for inventory.
- **`modifier_groups`**: Group of modifiers (e.g., "Ice Cream Flavors", "Extra Toppings").
  - `min_selections` (INT)
  - `max_selections` (INT)
- **`modifiers`**: The actual add-on options.
  - `name` (TEXT)
  - `price` (NUMERIC)
  - `group_id` (FK to modifier_groups)
- **`product_modifiers`**: Mapping products to modifier groups.

## 3. POS Orders & KOT
- **`orders`**:
  - `id` (UUID)
  - `order_number` (SERIAL / TEXT)
  - `cashier_id` (FK to profiles)
  - `status` (TEXT) - PENDING, PAID, REFUNDED, VOID
  - `subtotal` (NUMERIC)
  - `tax` (NUMERIC)
  - `discount` (NUMERIC)
  - `total` (NUMERIC)
- **`order_items`**:
  - `order_id` (FK to orders)
  - `product_id` (FK to products)
  - `quantity` (INT)
  - `unit_price_snapshot` (NUMERIC) - **Critical**: Price at time of sale.
  - `product_name_snapshot` (TEXT)
- **`order_item_modifiers`**:
  - `order_item_id` (FK to order_items)
  - `modifier_id` (FK to modifiers)
  - `modifier_name_snapshot` (TEXT)
  - `modifier_price_snapshot` (NUMERIC)
- **`kot_orders`**: Kitchen Order Tickets.
  - `order_id` (FK to orders)
  - `status` (TEXT) - NEW, PREPARING, READY, COMPLETED
- **`payments`**:
  - `order_id` (FK to orders)
  - `method` (TEXT) - CASH, CARD, QR
  - `amount` (NUMERIC)
  - `status` (TEXT) - SUCCESS, FAILED

## 4. Inventory System
- **`inventory_items`**: Raw ingredients (e.g., Nutella, Banana).
  - `stock_quantity` (NUMERIC)
  - `unit` (TEXT) - e.g., 'g', 'ml', 'pcs'
- **`recipes`**: Links a Product to its ingredients.
- **`recipe_items`**:
  - `recipe_id` (FK to recipes)
  - `inventory_item_id` (FK to inventory_items)
  - `quantity_required` (NUMERIC)
- **`inventory_transactions`**: Audit trail for stock changes (SALE, PURCHASE, WASTAGE).

## 5. Accounting Engine
- **`accounts`**: Chart of accounts (Cash, Sales Revenue, COGS, Inventory).
- **`journal_entries`**: Header for accounting entry.
- **`journal_entry_lines`**:
  - `journal_entry_id` (FK)
  - `account_id` (FK)
  - `debit` (NUMERIC)
  - `credit` (NUMERIC)
  - **Rule**: Sum of debits must equal sum of credits.

## 6. Audit & Security
- **`audit_logs`**: Tracks sensitive operations (Refunds, voids, inventory adjustments).

## Row Level Security (RLS) Rules
- Cashiers can create orders and read products/inventory.
- Managers can adjust inventory and issue refunds.
- Owners have full access to accounting and financial reporting.
