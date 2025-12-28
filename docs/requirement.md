This Product Requirement Specification (PRS) documents the features found in the ZORT manual but modernizes the workflow to be "simpler and better" using standard logic and algorithmic programming (no AI/GPU required).

You can hand this document directly to a software development team.

---

# Product Requirement Specification: Modern Inventory Management System (MIMS)

## 1. Executive Summary

**Goal:** Build a web-based inventory and order management system (SaaS) that outperforms legacy competitors by focusing on **Speed (Clicks-to-Action)**, **Inline Editing**, and **Automated Logic**.
**Constraint:** The system must run on standard CPU-based server architecture (No AI/GPU components).

---

## 2. User Roles & Permissions

* 
**Super Admin:** Full access to all modules and system settings.


* **Sales Staff:** Access to Orders, Products, and CRM. Restricted from Cost Price and Profit Reports.
* **Warehouse Staff:** Access to Inventory, Shipping, and Packing. Restricted from Financials.
* 
**Dropship Agent:** Limited access via a dedicated portal to view available stock and place orders.



---

## 3. Functional Modules

### Module A: Product Management (PIM)

**Core Features:**

1. 
**Product Data:** Support for SKU, Name, Barcode, Buy Price, Sell Price, Weight/Dimensions .


2. 
**Variant Management:** Support for Product Attributes (Size, Color) generating unique SKUs (e.g., Shirt-Red-L) .


3. 
**Bundling/Kitting:** Ability to create a "Virtual Product" (e.g., "Gift Set") that deducts inventory from multiple single SKUs when sold.


4. 
**Tracking Types:** Support for Standard stock, Serial Numbers (electronics), and Lot/Expiry (FMCG) .



**🚀 The "Better & Simpler" Enhancement:**

* **Inline Spreadsheet View:** Instead of clicking "Edit"  loading a new page  saving, build the main product list as an **editable grid**. Users can click a price or stock cell and type a new number instantly.
* **Auto-SKU Generator:** If the user types "Red T-Shirt," the system auto-generates SKU "RED-TSHIRT-001" using string logic (no AI needed) to save typing time.

### Module B: Inventory & Warehousing

**Core Features:**

1. 
**Multi-Warehouse:** Manage stock across Headquarters, Branches, and Consignment locations.


2. **Stock Movement:**
* **In:** Purchase Orders or Manual Adjustment.
* **Out:** Sales Orders or Damage/Loss.
* 
**Transfer:** Moving stock between Warehouse A and B.




3. 
**Stock Valuation:** Calculate value using **FIFO (First-In-First-Out)** and **Moving Average** logic .



**🚀 The "Better & Simpler" Enhancement:**

* **Visual Transfer:** Instead of a dropdown form, use a "Drag and Drop" UI where users drag stock from "Warehouse A" to "Warehouse B" to initiate a transfer.
* **Barcode Audit Mode:** A simple mobile-web view where warehouse staff scan items blindly, and the system flags discrepancies against the database (Cycle Counting).

### Module C: Order Management System (OMS)

**Core Features:**

1. **Order Entry:**
* 
**Detailed:** Capture Customer Info (Name, Tax ID), Address, VAT logic .


* 
**Quick Sale (POS Mode):** A simplified screen for walk-in customers requiring only product scan and payment method.




2. 
**Status Workflow:** Separate tracks for **Payment** (Unpaid  Partial  Paid) and **Fulfillment** (Pending  Packed  Shipped) .


3. 
**Document Gen:** Auto-generate PDF Invoices, Receipts, and Packing Slips.



**🚀 The "Better & Simpler" Enhancement:**

* **One-Click Fulfillment:** On the Order List, add a "Quick Ship" button. If an order is paid and in stock, clicking this single button will:
1. Deduct Stock.
2. Change Status to Shipped.
3. Print the Shipping Label (via API).


* **Chat-to-Order Parser:** (Regex Logic) Allow users to paste a text block from a chat (e.g., "Name: John, Address: 123 Main St, Tel: 0812345678"). The system uses Regular Expressions to auto-fill the form fields.

### Module D: Purchasing & Supply Chain

**Core Features:**

1. **Purchase Orders (PO):** Issue POs to suppliers.
2. **Receiving:** Support **Partial Receiving**. (Example: Ordered 100, Supplier sent 50. System keeps PO "Open" for the remaining 50) .


3. **Low Stock Alerts:** Set a "Minimum Stock" number. When stock dips below, trigger an alert .



**🚀 The "Better & Simpler" Enhancement:**

* **One-Click Reorder:** On the "Low Stock Dashboard," add a button called "Create PO." It groups all low-stock items by Supplier and generates the PO documents instantly.
* **Supplier Price History:** When adding an item to a PO, show a small sparkline (graph) of the last 5 prices paid to alert the user if the cost is rising.

### Module E: Dropship Agent Portal

**Core Features:**

1. 
**Agent Management:** Database of agents with contact info and commission rates.


2. 
**Purchase Links:** Generate specific URLs for agents to see stock availability (hiding the warehouse's true total if needed) .


3. 
**Commission Logic:** Auto-calculate earnings based on pre-set tiers (e.g., Tier 1 = 5%, Tier 2 = 10%) .



**🚀 The "Better & Simpler" Enhancement:**

* **Credit Wallet System:** Instead of paying commissions manually, give Agents a "Wallet." They can use their commission balance to pay for their next stock purchase instantly.

### Module F: Shipping & Logistics Integration

**Core Features:**

1. 
**Carrier API:** Integration with local couriers (Flash, Kerry, J&T, ThaiPost) to fetch tracking numbers.


2. 
**Label Printing:** Print labels in standard sizes (A4, A5, 4x6 Sticker).


3. 
**COD Management:** Track "Cash on Delivery" status separate from standard shipping .



**🚀 The "Better & Simpler" Enhancement:**

* **Bulk Print & Pack:** Allow selecting 50 orders at once. The system generates a single PDF with all 50 labels sorted by warehouse location to optimize the picker's walking path (Sorting Logic).

---

## 4. Technical Specifications (Non-GPU)

### Architecture

* **Backend:** Node.js or Python (Django/FastAPI) or Go. (Good for logic/calculations).
* **Database:** PostgreSQL (Relational DB is strictly required for inventory transactions to ensure data integrity).
* **Frontend:** React.js or Vue.js (For the "App-like" fast feel).
* **Deployment:** Docker containers (Runs easily on standard AWS EC2, DigitalOcean Droplets, or local Linux servers).

### Performance Requirements

* **Search Speed:** Product/Order search results must load in < 200ms.
* **Concurrency:** System must handle multiple users editing stock simultaneously without over-selling (Use Database Row Locking or Optimistic Locking).

### Offline Capability (Frontend)

* **Progressive Web App (PWA):** The "Quick Sale" and "Barcode Scan" modules should cache data. If the internet cuts out, the packer can still scan items, and the system syncs when the connection returns.

---

## 5. Development Roadmap (Phases)

1. **Phase 1 (MVP):** Product DB, Simple Inventory (+/-), Manual Order Creation, PDF Generation.
2. **Phase 2 (Logic):** Multi-warehouse, FIFO Costing, Partial Receiving, Excel Import/Export.
3. **Phase 3 (Connectivity):** Courier API Integrations (Shipping labels), Agent Portal.
4. **Phase 4 (Automation):** Low stock auto-PO generation, Bulk actions, Mobile PWA view.