# Waffle Bay POS - Comprehensive User Guide

Welcome to the Waffle Bay Point of Sale (POS) system. This guide will walk you through all the features of the application and explain how to use them effectively.

---

## 1. User Roles & Access
The application uses Role-Based Access Control (RBAC) to ensure security and proper workflow management. When you log in, your access is determined by your assigned role:

- **Admin & Manager**: Full access to the POS, Kitchen, Products, Settings, Sales History, and Accounting.
- **Cashier**: Access to the POS, Kitchen Display, and specific Cashier Settings (like connecting a receipt printer).
- **Waiter**: Access to the POS for placing orders and the Kitchen Display to monitor order readiness.
- **Chef**: Dedicated access to the Kitchen Display System (KDS) to manage and prepare orders.

---

## 2. Point of Sale (POS)
The POS interface is designed for speed and accuracy.

### Taking an Order
1. **Select Order Type**: Choose between **Dine In** or **Takeaway** at the top of the order panel.
2. **Table Number**: If it's a Dine In order, you must enter a table number.
3. **Add Items**: Browse the catalog by category or use the search bar. Tap a product to add it to the cart.
4. **Modifiers & Notes**: 
   - If an item has required choices or extra toppings, a modal will prompt you to select them.
   - Click the "Edit" button on any item in the cart to add special notes (e.g., "Less sugar").
5. **Half & Half Waffles**: Click the **Create Half & Half Waffle** button to combine two different waffle flavors into a single order.

### Discounts
If you have the proper permission, you can apply discounts to the order before sending it to the kitchen:
- Select either **Percentage (%)** or **Amount**.
- Enter the value in the discount field.

### Processing the Order
1. **Send to Kitchen**: Once the order is complete, click **Send to Kitchen**. This generates a Kitchen Order Ticket (KOT) and alerts the chefs.
2. **Open KOTs**: You can monitor unpaid/active orders by clicking the **Open KOTs** button in the top header.
3. **Take Payment**: When the customer is ready to pay, open the order and click **Take Payment**. Select the payment method (Cash, Card, etc.) and complete the transaction.
4. **Print Bill**: After payment is confirmed, the button changes to **Print Bill**, allowing you to generate a receipt.

---

## 3. Kitchen Display System (KDS)
The Kitchen interface replaces traditional paper tickets with a digital workflow.

### Managing Orders
Orders appear as cards detailing the KOT number, items, modifiers, and special notes.
- **NEW (Blue)**: The order has just arrived. Click **Start Cooking** to move it to preparing.
- **PREPARING (Amber)**: The food is currently being made. Click **Mark Ready** when the food is done.
- **READY (Green)**: The food is waiting to be served. Waiters and Cashiers can see this and deliver the food to the customer. Once delivered, click **Complete Order**.

### Additional Kitchen Features
- **Individual Item Tracking**: You can tap individual items inside a KOT to cross them out as they are prepared.
- **Print KOT**: If a physical copy is needed for the chef's line, click the **Print** button on the KOT card.
- **Urgency Timers**: Timers show how long an order has been open. Orders will pulse red if they exceed acceptable wait times.

---

## 4. Products & Inventory
*(Managers & Admins only)*

- **Products**: Add, edit, or disable menu items. You can set base prices, assign categories, and upload images.
- **Categories**: Manage the tabs that appear at the top of the POS screen to organize your menu.
- **Toppings/Modifiers**: Create modifier groups (like "Extra Toppings") and attach them to specific products. 

---

## 5. Sales & Accounting
*(Managers & Admins only)*

### Sales History
View a log of all transactions. You can filter by date range and view the specifics of any past order.

### Accounting & Z-Reports
- **Ledger**: Tracks every financial movement, including sales, cash in, and cash out.
- **Z-Reports**: Use this to manage your shift financials. It calculates expected cash vs. actual cash and flags any variances.

### Exporting Reports
You can export comprehensive Excel reports from the Sales or Accounting pages. 
- Click the **Export** button and select your desired report (Sales, Products, Ledger, or Z-Reports).
- The system will generate an Excel file formatted specifically for your store. 
- **Time Zones**: All exported data automatically respects your store's exact configured time zone down to the minute.

---

## 6. Settings
- **Store Config**: Set the store name, currency symbol, and the specific Time Zone used for operations and exports.
- **Staff Management**: Create new user accounts and assign roles (e.g., hiring a new Chef or Cashier).
- **Cashier Settings**: Connect thermal receipt printers directly through the browser.

> [!TIP]
> **Keyboard Shortcuts:** The POS is optimized for touch, but can also be driven quickly by mouse and keyboard on a standard computer. Ensure your cashiers familiarize themselves with the Quick Actions.
