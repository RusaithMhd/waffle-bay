# WAFFLE BAY POS — MASTER ENGINEERING PROMPT

## ROLE

You are a **Senior Full-Stack Software Architect, Product Designer, POS Systems Engineer, Database Architect, Accounting Systems Engineer, and QA Engineer**.

You are responsible for designing and implementing a production-ready POS and business management system called:

# WAFFLE BAY POS

This is a real-world commercial POS system for a waffle/ice-cream/food business.

Do NOT treat this as a demo, landing page, mockup, toy project, or simple CRUD application.

Build it as a scalable business application with:

* POS
* Visual menu
* Product management
* Modifiers/add-ons
* Cart
* Payments
* KOT
* Kitchen workflow
* Thermal receipt printing
* Offline-first operation
* Online synchronization
* Inventory
* Ingredient recipes
* Purchasing
* Suppliers
* Expenses
* Cash register
* Accounting
* Financial reports
* User roles
* Audit logs
* Multi-device support
* Future multi-branch support

The most important UX principle is:

> **FAST ORDERING + SIMPLE UI + VISUAL MENU + EASY BILLING**

The cashier must be able to create and complete a normal order within seconds with minimal taps.

---

# 1. TECHNOLOGY STACK

Use the following technology stack unless there is a strong technical reason to change something.

### Frontend

* Next.js 16+
* App Router
* React 19+
* TypeScript
* Tailwind CSS
* shadcn/ui where appropriate
* Lucide React icons
* Zustand for client-side state
* React Hook Form
* Zod validation

### Backend

Use:

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Supabase Realtime
* Row Level Security

### Offline

Use:

* IndexedDB
* Dexie.js or an equivalent reliable IndexedDB abstraction

The POS must continue operating when the internet connection is unavailable.

### Android

The primary device is Android phone/tablet.

Structure the application so it can later be packaged as an Android application using:

* Capacitor

The Android wrapper must provide a clean path for:

* Bluetooth printer access
* Device permissions
* Local storage
* Offline operation
* Thermal printer communication

### Web

The same application must work through a browser on:

* Android
* Tablet
* Laptop
* Desktop PC

---

# 2. ARCHITECTURE PRINCIPLE

Use a clean modular architecture.

Do NOT place all business logic directly inside React components.

Use:

```text
UI
↓
Hooks / State
↓
Application Services
↓
Domain Logic
↓
Data Access
↓
Supabase / IndexedDB
```

Separate:

* UI
* business logic
* database access
* accounting logic
* inventory logic
* synchronization logic
* printing logic
* authentication
* authorization

Business rules must be reusable from multiple interfaces.

---

# 3. APPLICATION MODULES

Create the following major modules:

```text
Authentication
Dashboard
POS
KOT
Orders
Products
Categories
Modifiers
Combos
Inventory
Recipes
Purchasing
Suppliers
Expenses
Cash Register
Payments
Accounting
Reports
Users
Settings
Audit Logs
Data Management
```

---

# 4. USER ROLES

Implement role-based access control.

Roles:

## OWNER / SUPER ADMIN

Full access.

Can:

* Manage users
* Manage products
* Change prices
* Manage inventory
* Manage suppliers
* Manage purchases
* Manage expenses
* View accounting
* Modify settings
* Process refunds
* Void transactions
* View reports
* Export data
* Manage permissions
* View audit logs

## MANAGER

Can:

* POS
* KOT
* Products
* Inventory
* Reports
* Expenses
* Refunds with authorization
* Discounts
* Cash register
* End-of-day closing

Cannot:

* Delete accounting records
* Delete users
* Modify protected financial history
* Change critical system configuration

## CASHIER

Can:

* Open POS
* Create orders
* Add products
* Add modifiers
* Change quantity
* Take payment
* Print receipt
* View permitted order history
* Create KOT

Cannot:

* Change product prices
* Delete products
* Modify accounting
* Delete completed sales
* Process unauthorized refunds
* Modify inventory
* Access financial configuration

Sensitive actions must support manager/admin authorization.

Example:

```text
Cashier → Refund
        ↓
Manager Authorization
        ↓
PIN / Authentication
        ↓
Refund Approved
```

---

# 5. AUTHENTICATION

Use Supabase Auth.

Support:

* Google Sign-In
* Email/password
* Session persistence
* Secure logout
* Password reset

For staff operation, implement optional quick staff switching using:

* Staff profile
* PIN

Example:

```text
WAFFLE BAY

Select Staff

Cashier 01
Cashier 02
Manager

Enter PIN

● ● ● ●
```

Never store plain-text passwords or PINs.

---

# 6. POS DESIGN

The POS must be designed specifically for fast touch interaction.

DO NOT make it look like an accounting application.

Use a modern premium food-business interface.

Visual language:

* Clean
* Bright
* Modern
* Friendly
* Fast
* Minimal
* Large touch targets
* Product photography
* Clear hierarchy
* Strong contrast
* Very little unnecessary text

The POS must be optimized for:

* Android phone
* Android tablet

Desktop should receive a wider layout.

---

# 7. POS DESKTOP LAYOUT

Use a 3-column structure:

```text
┌───────────────────────────────────────────────────────────┐
│ WAFFLE BAY | Order #0048 | Online | Cashier              │
├───────────────┬───────────────────────────┬───────────────┤
│ CATEGORIES    │ PRODUCTS                  │ CART          │
│               │                           │               │
│ Waffles       │ Product cards             │ Item          │
│ Ice Cream     │ Product cards             │ Add-ons       │
│ Toppings      │ Product cards             │ Quantity      │
│ Drinks        │ Product cards             │               │
│ Combos        │                           │ Subtotal      │
│ Other         │                           │ Discount      │
│               │                           │ TOTAL         │
│               │                           │               │
│               │                           │ PAY           │
└───────────────┴───────────────────────────┴───────────────┘
```

On mobile:

```text
Header
↓
Category selector
↓
Product grid
↓
Cart bottom sheet
↓
Payment
```

Use responsive behavior instead of simply shrinking the desktop UI.

---

# 8. PRODUCT CATEGORIES

Initial categories:

* Waffles
* Ice Cream
* Toppings / Extras
* Drinks
* Combos / Special Items
* Other Products

Admin must be able to:

* Create category
* Edit category
* Delete/deactivate category
* Change display order
* Upload category image/icon
* Enable/disable category

Never hard-code categories.

---

# 9. PRODUCTS

Product fields:

```text
id
name
sku
category_id
description
image_url
selling_price
cost_price
tax_id
is_active
is_available
track_inventory
printer_station
sort_order
created_at
updated_at
```

Admin can:

* Create
* Edit
* Archive
* Enable
* Disable
* Mark unavailable
* Change price
* Change image
* Change category

Do not permanently delete products that have historical sales.

Use archive/deactivate instead.

---

# 10. PRODUCT PRICE HISTORY

Prices must be historically safe.

If:

```text
Nutella Banana Waffle
Today = LKR 1,500
```

and next month:

```text
LKR 1,700
```

previous orders must remain:

```text
LKR 1,500
```

Store the selling price snapshot inside each order item.

Never recalculate historical sales using current product prices.

---

# 11. MODIFIER / ADD-ON SYSTEM

This is a critical feature.

Create:

```text
Modifier Groups
Modifiers
Product Modifier Relationships
```

Example:

```text
ICE CREAM
Vanilla       +400
Chocolate     +400
Strawberry    +400

SAUCES
Nutella       +200
Chocolate     +150
Biscoff       +250

FRUITS
Banana        +150
Strawberry    +250
Pistachio     +300
```

Modifier group settings:

```text
required
minimum_selection
maximum_selection
allow_multiple
```

Products can have multiple modifier groups.

Do not hard-code toppings.

---

# 12. CART

Cart must support:

* Add product
* Increase quantity
* Decrease quantity
* Remove
* Add modifiers
* Add notes
* Discount
* Subtotal
* Tax
* Total

Example:

```text
Nutella Banana Waffle
LKR 1,500

+ Vanilla Ice Cream
LKR 400

+ Extra Nutella
LKR 200

Total
LKR 2,100
```

Every cart line must preserve:

* Product
* Quantity
* Base price
* Modifier prices
* Modifier selections
* Notes
* Discount
* Tax

---

# 13. ORDER NUMBER

Generate unique order numbers.

Preferred format:

```text
WB-20260811-0048
```

Do not rely only on sequential client-side numbers.

Order number generation must be safe across:

* Multiple devices
* Offline devices
* Concurrent orders

Use a database-safe ID/sequence strategy and separate public order number if necessary.

---

# 14. ORDER STATUS

Order statuses:

```text
DRAFT
CONFIRMED
KOT_SENT
PREPARING
READY
COMPLETED
CANCELLED
VOIDED
REFUNDED
PARTIALLY_REFUNDED
```

Do not mix payment status and kitchen status.

Use separate states.

---

# 15. KOT SYSTEM

KOT means Kitchen Order Ticket.

Creating an order should be able to automatically send a KOT.

KOT workflow:

```text
NEW
↓
PREPARING
↓
READY
↓
COMPLETED
```

Kitchen screen must be optimized for large touch interaction.

Show:

* KOT number
* Order number
* Time
* Items
* Quantities
* Modifiers
* Customer notes
* Special instructions
* Elapsed time

Example:

```text
KOT #0048

2 × Nutella Banana Waffle

+ Vanilla Ice Cream
+ Extra Nutella

NOTE:
Less chocolate

[ START ]

→ PREPARING

[ READY ]

→ READY
```

---

# 16. REALTIME KOT

Use Supabase Realtime.

When cashier creates an order:

```text
POS
↓
Order saved
↓
KOT created
↓
Kitchen receives instantly
```

When kitchen marks READY:

```text
Kitchen
↓
Realtime update
↓
Cashier sees:
ORDER #0048 READY
```

Do not require manual page refresh.

---

# 17. KITCHEN STATIONS

Design the database to support multiple kitchen stations.

Examples:

```text
Kitchen
Bar
Dessert
Drinks
```

Products can be assigned to a station.

Example:

```text
Waffles → Kitchen
Drinks → Bar
Ice Cream → Dessert
```

A future branch can have separate stations.

---

# 18. PAYMENT SYSTEM

Payment methods:

```text
Cash
Card
Bank Transfer
QR
Other
```

Payment record must include:

```text
id
order_id
amount
method
reference
received_by
created_at
```

Support split payments.

Example:

```text
Total = 3,000

Cash = 1,000
Card = 2,000
```

---

# 19. CASH PAYMENT

For cash:

```text
Total
Received
Change
```

Calculate change automatically.

Do not allow completion if received amount is insufficient unless the business explicitly allows unpaid orders.

---

# 20. RECEIPTS

Support 80mm thermal receipts.

Receipt must contain:

```text
WAFFLE BAY
Arugam Bay

Order Number
Date
Time
Cashier

Items
Quantities
Modifiers
Prices

Subtotal
Discount
Tax
Total

Payment Method

Thank-you message
```

Support:

* Print
* Reprint
* Duplicate receipt indicator

Reprinted receipt should clearly indicate:

```text
*** DUPLICATE RECEIPT ***
```

---

# 21. BLUETOOTH PRINTING

Architect printing separately from UI.

Create a printer service:

```text
PrinterService
```

Methods:

```text
discover()
connect()
disconnect()
printReceipt()
printKOT()
testPrint()
getStatus()
```

For Android, prepare the architecture for Capacitor/native Bluetooth integration.

Do not assume browser Bluetooth APIs are universally reliable.

Desktop web printing should support a separate print path.

---

# 22. OFFLINE-FIRST ARCHITECTURE

Offline operation is mandatory.

Use IndexedDB.

Cache locally:

```text
Products
Categories
Modifiers
Prices
Taxes
Settings
User permissions
Open orders
```

When offline:

```text
🟠 OFFLINE MODE

Orders are being saved locally.
They will synchronize automatically.
```

The cashier must still be able to:

* Browse products
* Add products
* Add modifiers
* Create orders
* Take payments
* Generate receipts
* Continue KOT workflow where device connectivity permits

---

# 23. SYNC ENGINE

Create a dedicated synchronization system.

Example:

```text
Online
↓
Supabase

Offline
↓
IndexedDB
↓
Sync Queue
↓
Internet returns
↓
Sync Engine
↓
Supabase
```

Every offline transaction needs:

```text
local_id
sync_status
created_at
device_id
retry_count
```

Use idempotency to prevent duplicate orders.

Never upload the same transaction twice.

---

# 24. SYNC CONFLICT RULES

Master data:

```text
Server is authoritative.
```

Transactions:

```text
Never overwrite completed transactions.
```

Historical order prices:

```text
Use stored snapshots.
```

If a conflict occurs:

```text
SYNC CONFLICT
Order preserved locally.
Manager review required.
```

Never silently destroy data.

---

# 25. INVENTORY

Implement ingredient-level inventory.

Inventory item fields:

```text
name
SKU
unit
cost
current_stock
minimum_stock
reorder_level
supplier
active
```

Supported units:

```text
g
kg
ml
L
pcs
pack
box
bottle
```

---

# 26. RECIPES / BOM

Products can consume ingredients.

Example:

```text
Nutella Banana Waffle

Waffle Base     1 pcs
Nutella         40 g
Banana          1 pcs
Chocolate Sauce 15 ml
```

When sale occurs:

```text
Stock decreases automatically.
```

Do not manually subtract stock from the product only.

---

# 27. INVENTORY TRANSACTIONS

Every stock change must create a transaction.

Types:

```text
OPENING_STOCK
PURCHASE
SALE
RETURN
WASTAGE
ADJUSTMENT
TRANSFER
```

Never simply overwrite inventory quantity without recording why.

---

# 28. LOW STOCK

Support:

```text
Current Stock
Minimum Stock
Reorder Level
```

When stock reaches the threshold:

```text
🔴 LOW STOCK

Nutella
1.9 kg remaining
```

---

# 29. PURCHASES

Implement:

```text
Suppliers
Purchase Orders
Purchases
Purchase Items
Supplier Payments
Supplier Balances
```

Purchase example:

```text
Nutella
10 kg × LKR 2,800

Total = LKR 28,000

Paid = LKR 20,000
Balance = LKR 8,000
```

Purchases must affect:

* Inventory
* Supplier payable
* Accounting

---

# 30. EXPENSES

Expense categories:

```text
Rent
Electricity
Water
Salary
Transport
Packaging
Marketing
Internet
Repairs
Equipment
Other
```

Every expense must create an accounting transaction.

---

# 31. CASH REGISTER

Implement opening and closing cash sessions.

Opening:

```text
Opening Cash = LKR 20,000
```

During shift:

```text
Cash Sales
Cash Refunds
Cash Expenses
Cash In/Out
```

At closing:

```text
Expected Cash
Actual Cash
Difference
```

Require manager authorization for discrepancies where configured.

---

# 32. ACCOUNTING

This is a serious accounting module.

Do NOT implement accounting as simple totals.

Use double-entry accounting.

Every financial transaction must create balanced journal entries.

Example sale:

```text
DR Cash
    CR Sales Revenue
```

COGS:

```text
DR Cost of Goods Sold
    CR Inventory
```

---

# 33. CHART OF ACCOUNTS

Create a configurable chart of accounts.

Initial accounts:

### Assets

```text
1000 Cash
1010 Bank
1020 Card Receivable
1030 Inventory
1040 Equipment
```

### Liabilities

```text
2000 Supplier Payables
2010 Tax Payable
```

### Equity

```text
3000 Owner Capital
3100 Retained Earnings
```

### Revenue

```text
4000 Waffle Sales
4010 Ice Cream Sales
4020 Drinks Sales
4030 Other Sales
```

### COGS

```text
5000 Waffle COGS
5010 Ice Cream COGS
5020 Drinks COGS
```

### Expenses

```text
6000 Rent
6010 Electricity
6020 Salaries
6030 Marketing
6040 Transport
6050 Repairs
6060 Other
```

Admin must be able to extend the chart of accounts.

---

# 34. JOURNAL ENTRIES

Create:

```text
journal_entries
journal_entry_lines
```

Every journal entry must satisfy:

```text
Total Debits = Total Credits
```

Add server-side validation.

Never allow an unbalanced accounting entry.

---

# 35. SALES ACCOUNTING

Example:

Product sold:

```text
LKR 1,500
```

Create:

```text
DR Cash              1,500
    CR Sales Revenue       1,500
```

If COGS = 650:

```text
DR COGS                 650
    CR Inventory             650
```

This allows accurate gross profit.

---

# 36. DISCOUNT ACCOUNTING

Example:

```text
Gross sale = 1,500
Discount = 200
Net sale = 1,300
```

Accounting:

```text
DR Cash                 1,300
DR Sales Discount         200
    CR Sales Revenue          1,500
```

Never hide discounts inside sales totals.

---

# 37. REFUNDS

Never delete the original sale.

Create a refund transaction that reverses the appropriate accounting and inventory movements.

Store:

```text
original_order_id
refund_reason
refund_amount
authorized_by
refunded_at
```

---

# 38. VOIDED ORDERS

Never physically delete completed orders.

Use:

```text
VOIDED
```

and store:

```text
voided_by
voided_at
void_reason
authorization
```

---

# 39. TAX

Implement configurable taxes.

Support:

```text
Tax name
Rate
Inclusive / Exclusive
Active
```

Do not hard-code tax rates.

---

# 40. REPORTING

Create reports for:

### Sales

* Daily sales
* Weekly sales
* Monthly sales
* Custom date range
* Number of orders
* Average order value
* Discounts
* Refunds
* Taxes

### Payment

* Cash
* Card
* QR
* Bank
* Other

### Product

* Units sold
* Revenue
* COGS
* Gross profit
* Margin

### Add-ons

* Quantity sold
* Revenue

### Inventory

* Current stock
* Low stock
* Stock movements
* Wastage
* Purchase value

### Financial

* Profit & Loss
* Balance Sheet
* Cash Flow
* Trial Balance
* General Ledger
* Accounts Receivable if used
* Accounts Payable

---

# 41. PROFIT & LOSS

Generate:

```text
Revenue
- Discounts
= Net Revenue

- Cost of Goods Sold
= Gross Profit

- Operating Expenses
= Net Profit
```

All figures must be calculated from the accounting ledger, not manually duplicated totals.

---

# 42. BALANCE SHEET

Generate:

```text
Assets
Liabilities
Equity
```

Validate:

```text
Assets = Liabilities + Equity
```

---

# 43. CASH FLOW

Support:

```text
Operating Activities
Investing Activities
Financing Activities
```

---

# 44. BEST SELLERS

Dashboard should show:

```text
#1 Nutella Banana
45 sold
LKR 67,500 revenue

#2 Strawberry Delight
31 sold
LKR 46,500 revenue
```

Also show:

```text
Gross Profit
Margin %
```

---

# 45. ADD-ON ANALYTICS

Show:

```text
Extra Nutella
143 sold
LKR 28,600 revenue

Vanilla Ice Cream
122 sold
LKR 48,800 revenue
```

This is important to Waffle Bay.

---

# 46. ORDER HISTORY

Search/filter by:

```text
Order Number
Date
Product
Payment Method
Cashier
Status
Amount
```

Actions:

```text
View
Reprint
Refund
Void
```

Permission-check every sensitive action.

---

# 47. PROMOTIONS

Create configurable promotion rules.

Support:

```text
Percentage Discount
Fixed Discount
Product Discount
Category Discount
Buy X Get Y
Combo Pricing
Free Add-on
```

Promotions should have:

```text
start_date
end_date
conditions
rules
active
```

---

# 48. COMBOS

Example:

```text
Waffle
+
Ice Cream
+
Drink

Normal = LKR 2,250

Combo = LKR 1,999
```

Combo components must still be traceable for inventory and accounting.

---

# 49. CUSTOMER MODULE

Create an optional basic customer module.

Fields:

```text
name
phone
email
notes
```

Track:

```text
order_count
total_spent
last_visit
```

Keep loyalty functionality modular for future development.

---

# 50. MULTI-DEVICE

The system must support:

```text
Android Phone
Android Tablet
Laptop
Desktop PC
```

All devices should use the same business database.

Realtime updates should keep:

* Orders
* KOT
* Product availability
* Inventory where appropriate

synchronized.

---

# 51. MULTI-BRANCH READY

Even if only one branch exists today, create a `branches` table.

Every business transaction should be capable of being associated with:

```text
branch_id
terminal_id
user_id
```

This allows future expansion.

---

# 52. AUDIT LOGS

Track sensitive actions.

Example:

```text
User:
Cashier 02

Action:
Changed Order

Old Discount:
LKR 0

New Discount:
LKR 500

Authorized By:
Manager 01

Timestamp:
2026-08-11 20:42
```

Audit:

* Login
* Logout
* Price changes
* Product changes
* Discounts
* Refunds
* Voids
* Inventory adjustments
* Accounting changes
* User changes
* Settings changes

---

# 53. ACCOUNTING PERIOD LOCK

Allow admin to lock accounting periods.

Example:

```text
July 2026
LOCKED
```

Locked periods cannot be casually modified.

Any correction must create a new adjustment entry.

---

# 54. DATABASE RULES

Use PostgreSQL constraints wherever possible.

Implement:

* Foreign keys
* Unique constraints
* Check constraints
* Not-null constraints
* Indexes
* Timestamps
* Soft deletion where appropriate

Use UUIDs for internal IDs.

Do not expose sequential database IDs unnecessarily.

---

# 55. SECURITY

Use Supabase Row Level Security.

Never rely only on frontend role checks.

Every sensitive backend operation must be authorization-protected.

Never expose service-role keys in the browser.

Use environment variables.

Validate all user input.

Use Zod validation.

Protect against:

* Unauthorized access
* SQL injection
* Invalid transactions
* Duplicate payments
* Duplicate offline synchronization
* Privilege escalation

---

# 56. DATA INTEGRITY

Critical operations must be transactional.

For a completed sale:

```text
Create Order
↓
Create Order Items
↓
Create Payment
↓
Create KOT
↓
Create Inventory Transactions
↓
Create Accounting Journal
```

Do not leave the database in a partially completed financial state.

Use database transactions/RPC where appropriate.

---

# 57. UI COMPONENT SYSTEM

Build reusable components.

Examples:

```text
ProductCard
CategoryTabs
CartPanel
ModifierSelector
PaymentModal
OrderSummary
KOTCard
StatusBadge
DataTable
ReportCard
InventoryCard
StockBadge
ConfirmDialog
AuthorizationDialog
ReceiptPreview
```

Do not duplicate similar UI logic across pages.

---

# 58. DESIGN SYSTEM

Use a consistent design system.

Requirements:

* Large touch targets
* Clear typography
* Strong visual hierarchy
* Rounded cards where appropriate
* Subtle shadows
* Smooth transitions
* Clear success/error states
* Accessible contrast
* Loading skeletons
* Empty states
* Confirmation dialogs

Avoid excessive animations.

POS interaction must remain fast.

---

# 59. LOADING / ERROR STATES

Every asynchronous action must have:

```text
Loading
Success
Error
Retry
```

Example:

```text
Printing receipt...

✓ Receipt printed
```

or:

```text
Printer unavailable

[ Retry ]
[ Continue Without Printing ]
```

Never leave the user wondering whether an operation succeeded.

---

# 60. OFFLINE UI

Always show connection status.

Examples:

```text
🟢 ONLINE
🟠 OFFLINE
🔄 SYNCING
✓ SYNCED
⚠ SYNC ERROR
```

Do not hide offline status.

---

# 61. DASHBOARD

Owner dashboard should show:

```text
Today's Sales
Today's Orders
Average Order Value
Gross Profit
Net Profit
Cash
Card
QR
Bank
Low Stock Items
Pending KOTs
```

Charts:

* Sales trend
* Payment breakdown
* Best sellers
* Gross profit
* Expenses

---

# 62. SEARCH

Search should be fast.

POS search:

```text
Search waffles, ice cream, drinks...
```

Admin search:

```text
Products
Orders
Inventory
Customers
Suppliers
```

Use debouncing where necessary.

---

# 63. ACCESSIBILITY

Support:

* Keyboard navigation on desktop
* Large touch targets
* Accessible labels
* Screen-reader friendly controls where practical
* Focus states
* High contrast
* Reduced motion preference

---

# 64. PERFORMANCE

The POS must feel instant.

Optimize:

* Product image loading
* Database queries
* Realtime subscriptions
* IndexedDB reads
* Bundle size
* React rendering
* Search

Use:

* Pagination
* Lazy loading
* Image optimization
* Memoization where appropriate
* Server components where appropriate

Do not over-fetch data.

---

# 65. IMAGE MANAGEMENT

Product images should:

* Use Supabase Storage
* Support upload
* Preview
* Replace
* Delete/archive
* Compress/optimize
* Use thumbnails where appropriate

Use modern formats such as WebP where practical.

---

# 66. SETTINGS

Admin settings:

```text
Business Information
Logo
Branch
Currency
Tax
Receipt
Printer
Kitchen
Payment Methods
Order Numbering
Discount Permissions
Inventory
Accounting
Users
Security
Backup
```

Currency default:

```text
LKR
```

Do not hard-code currency throughout the application.

---

# 67. RECEIPT CUSTOMIZATION

Admin should be able to configure:

```text
Business Name
Address
Phone
Logo
Footer Message
Tax Display
Cashier Display
Order Number
```

Do not hard-code Waffle Bay text into receipt components.

---

# 68. EXPORT

Support:

```text
CSV
Excel
PDF
```

Reports should allow:

```text
Date range
Branch
Cashier
Payment method
Category
Product
```

---

# 69. DATA IMPORT

Admin should be able to import products from CSV/Excel where practical.

Example:

```text
Product Name
Category
Price
Cost
SKU
Available
```

Validate imported data before committing.

Show:

```text
42 valid rows
3 invalid rows
```

Allow correction before import.

---

# 70. ERROR LOGGING

Create application error logging.

Track:

```text
timestamp
user
device
route
error
stack
context
```

Do not expose sensitive information.

---

# 71. TESTING

Do not consider the application complete without testing.

Implement:

### Unit tests

For:

* Pricing
* Modifiers
* Discounts
* Taxes
* Inventory calculations
* Accounting calculations

### Integration tests

For:

* Order creation
* Payment
* KOT
* Inventory deduction
* Accounting posting
* Refunds
* Offline sync

### End-to-end tests

Test:

```text
Login
→ POS
→ Product
→ Modifier
→ Cart
→ Payment
→ KOT
→ Receipt
```

Also test:

```text
Offline
→ Create order
→ Reconnect
→ Synchronize
```

---

# 72. ACCOUNTING VALIDATION TEST

Create automated validation that verifies:

```text
Total Debits = Total Credits
```

for every journal entry.

Also validate:

```text
Assets = Liabilities + Equity
```

for balance sheet reports.

---

# 73. OFFLINE VALIDATION TEST

Simulate:

```text
Internet ON
Create Order A

Internet OFF
Create Order B
Create Order C

Internet ON

Sync

Expected:
A
B
C

No duplicates.
No lost transactions.
```

---

# 74. CONCURRENCY TEST

Simulate multiple devices:

```text
Tablet A → Order
Tablet B → Order
PC → Product update
Kitchen → KOT update
```

Verify that no transactions overwrite each other.

---

# 75. DO NOT DO THESE THINGS

Do NOT:

* Hard-code products
* Hard-code prices
* Hard-code categories
* Hard-code add-ons
* Delete historical orders
* Store passwords in plain text
* Trust frontend-only authorization
* Store service keys in frontend
* Treat accounting as simple totals
* Assume browser Bluetooth works everywhere
* Assume online connectivity
* Duplicate business logic across pages
* Build only desktop UI and shrink it for mobile
* Create fake data as the final implementation
* Leave TODO placeholders for critical business logic
* Fake KOT functionality
* Fake offline synchronization
* Fake accounting calculations

---

# 76. DEVELOPMENT METHODOLOGY

Do not attempt to generate the entire application in one uncontrolled step.

Work in controlled phases.

Before implementing a module:

1. Inspect existing project structure.
2. Identify dependencies.
3. Review database schema.
4. Identify related modules.
5. Plan the implementation.
6. Implement.
7. Run type checking.
8. Run linting.
9. Run tests.
10. Fix errors.
11. Verify UI.
12. Only then move to the next module.

Never unnecessarily rewrite working code.

Preserve existing functionality.

---

# 77. IMPLEMENTATION ORDER

Build in exactly this general order:

```text
PHASE 1
Project foundation
Authentication
Database
Roles
RLS
Design system

↓

PHASE 2
Products
Categories
Modifiers
Product images

↓

PHASE 3
POS
Cart
Pricing
Discounts
Orders

↓

PHASE 4
Payments
Receipts
Order history

↓

PHASE 5
KOT
Realtime
Kitchen stations

↓

PHASE 6
Offline
IndexedDB
Sync engine

↓

PHASE 7
Bluetooth / Android printing

↓

PHASE 8
Inventory
Recipes
Stock movements

↓

PHASE 9
Purchasing
Suppliers
Expenses
Cash register

↓

PHASE 10
Accounting
Chart of accounts
Journal
COGS
P&L
Balance Sheet
Cash Flow

↓

PHASE 11
Reports
Exports
Audit logs

↓

PHASE 12
Testing
Security
Performance
Production hardening
```

---

# 78. FIRST TASK

Before writing large amounts of code, inspect the current repository.

Determine:

* Existing framework
* Existing dependencies
* Existing components
* Existing routes
* Existing database configuration
* Existing environment variables
* Existing styling system
* Existing authentication
* Existing Supabase setup

Do not destroy or replace existing work unnecessarily.

After inspection, create:

```text
/docs/ARCHITECTURE.md
/docs/DATABASE.md
/docs/SECURITY.md
/docs/OFFLINE_SYNC.md
/docs/ACCOUNTING.md
/docs/POS_WORKFLOW.md
/docs/DEVELOPMENT_PLAN.md
```

These documents should describe the implementation before major coding begins.

---

# 79. DATABASE MIGRATION STRATEGY

Create proper Supabase SQL migrations.

Do not manually create random tables through disconnected scripts.

Maintain versioned migrations.

Example:

```text
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_auth_roles.sql
    ├── 003_products.sql
    ├── 004_orders.sql
    ├── 005_kot.sql
    ├── 006_inventory.sql
    ├── 007_accounting.sql
    └── ...
```

---

# 80. SEED DATA

Create development seed data for:

Categories:

```text
Waffles
Ice Cream
Toppings
Drinks
Combos
```

Products:

```text
Nutella Banana Waffle
Strawberry Delight
Arugam Bay Signature
Vanilla Ice Cream
Chocolate Ice Cream
Biscoff
Extra Nutella
Banana
Strawberry
```

Use clearly identifiable development/demo data.

---

# 81. ENVIRONMENT VARIABLES

Never commit secrets.

Use:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Keep service credentials server-side only.

Create:

```text
.env.example
```

with descriptions.

---

# 82. FINAL ACCEPTANCE CRITERIA

The system is only considered complete when a cashier can perform:

```text
LOGIN
↓
SELECT WAFFLE
↓
SELECT ADD-ONS
↓
ADD TO CART
↓
APPLY DISCOUNT
↓
PAY CASH/CARD/QR
↓
CREATE KOT
↓
KITCHEN PREPARES
↓
MARK READY
↓
PRINT 80mm RECEIPT
↓
COMPLETE ORDER
```

And the system automatically records:

```text
Order
Order Items
Modifiers
Payment
KOT
Inventory Consumption
COGS
Revenue
Accounting Journal
Audit Trail
```

The owner must then be able to see:

```text
Sales
Orders
Payment Breakdown
Best Sellers
Inventory
Expenses
COGS
Gross Profit
Net Profit
Cash Position
Accounting Reports
```

---

# 83. FINAL QUALITY STANDARD

The finished product must feel like a professional commercial POS product, not an AI-generated prototype.

Prioritize:

1. Reliability
2. Data integrity
3. Speed
4. Simplicity
5. Offline resilience
6. Accounting correctness
7. Security
8. Maintainability
9. Responsive design
10. Scalability

When choosing between a visually impressive feature and a reliable business feature:

> **Choose reliability.**

When choosing between complexity and simplicity for the cashier:

> **Choose simplicity.**

When modifying financial data:

> **Never destroy historical records.**

When implementing offline synchronization:

> **Never lose or duplicate a transaction.**

When implementing accounting:

> **Every financial transaction must balance.**

Build Waffle Bay POS as a real production system that can eventually support multiple branches, multiple terminals, multiple kitchen stations, and a complete food-business management workflow.
