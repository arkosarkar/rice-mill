# 🌾 RiceMill Pro — Complete System Documentation
> **Version 1.0** | Last Updated: April 2026 | Maintained by: Lead Engineering Team

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Product Flow — How Grain Moves](#4-product-flow--how-grain-moves)
5. [Money Flow — How Finance Works](#5-money-flow--how-finance-works)
6. [All Modules Explained](#6-all-modules-explained)
7. [Database Schema (ERD)](#7-database-schema-erd)
8. [API Reference](#8-api-reference)
9. [The Centralized Stock Engine](#9-the-centralized-stock-engine)
10. [Dynamic Godown Sync](#10-dynamic-godown-sync)
11. [User Roles & Access](#11-user-roles--access)
12. [Golden Rules for Developers](#12-golden-rules-for-developers)

---

## 1. Project Overview

**RiceMill Pro** is a full-stack Enterprise Resource Planning (ERP) system built specifically for a Rice Mill business. It digitalizes every physical and financial operation of the mill — from a farmer delivering raw paddy to a customer receiving an invoice for finished rice.

### 🎯 What Problems Does It Solve?
| Old Way (Manual) | New Way (ERP) |
|:---|:---|
| Paper-based stock registers | Real-time digital inventory |
| Manual cash-book / ledgers | Automated double-entry accounting |
| No production yield tracking | Per-batch milling efficiency analysis |
| Godown management by memory | Visual, searchable warehouse grid |
| GST calculations on paper | Auto-computed GST invoices |

---

## 2. Tech Stack

```mermaid
graph LR
    A[React 18<br/>+ Vite] -->|REST API| B[Node.js<br/>+ Express]
    B -->|SQL| C[(Neon<br/>PostgreSQL)]
    
    style A fill:#61DAFB,stroke:#333,color:#000
    style B fill:#68A063,stroke:#333,color:#000
    style C fill:#336791,stroke:#333,color:#fff
```

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 18 + Vite | All UI screens and user interactions |
| **Styling** | Tailwind CSS v4 | Premium dark/light hybrid design |
| **Icons** | Lucide React + HeroIcons | Visual component library |
| **HTTP Client** | `authFetch` utility | Secure, token-authenticated API calls |
| **Backend** | Node.js + Express | REST API server (Port: 5011) |
| **Database** | Neon PostgreSQL | Cloud-hosted, persistent data storage |
| **Auth** | JWT Tokens | Session management |

---

## 3. System Architecture

This diagram shows how the three layers communicate with each other.

```mermaid
graph TD
    subgraph "🖥️ CLIENT (Browser)"
        UI[React Pages]
        AUTH_CTX[Auth Context]
        FETCH[authFetch Utility]
        UI --> AUTH_CTX
        UI --> FETCH
    end

    subgraph "🚀 SERVER (Node.js:5011)"
        MIDDLEWARE[Auth Middleware<br/>JWT Verify]
        ROUTES[Express Routers<br/>14 Route Files]
        CONTROLLERS[Controllers<br/>Business Logic]
        SERVICES[Services<br/>moveStock / syncBalance]
        MIDDLEWARE --> ROUTES
        ROUTES --> CONTROLLERS
        CONTROLLERS --> SERVICES
    end

    subgraph "🗄️ DATABASE (Neon PostgreSQL)"
        TABLES[11 Core Tables]
    end

    FETCH -->|HTTP Request + Token| MIDDLEWARE
    SERVICES -->|SQL Queries| TABLES
    TABLES -->|JSON Response| FETCH
```

### The Request Lifecycle (Developer View):
1. User clicks "Save" on any form.
2. `authFetch` sends a `POST` request to the backend with a **JWT token**.
3. **Auth Middleware** verifies the token. Rejects if invalid.
4. The correct **Controller** handles business validation.
5. The **Service** layer executes the atomic stock/finance update.
6. The **Database** persists the change and returns confirmation.
7. The **UI** re-fetches and shows the updated state.

---

## 4. Product Flow — How Grain Moves

This is the **physical journey** of the product through the mill.

```mermaid
graph TD
    FARMER([👨‍🌾 Farmer]) -->|Delivers Paddy| PI

    subgraph "🟩 PROCUREMENT"
        PI[Paddy Inward<br/>Log arrival, weight, bags, vehicle]
        PI -->|Weigh & Record| GD
    end

    subgraph "🟧 WAREHOUSING — Godown A/B/C..."
        GD[(Raw Paddy Stock<br/>e.g. 15,000 Kg)]
    end

    GD -->|Move to Cleaning Unit| CL

    subgraph "🟪 FACTORY FLOOR"
        CL[Cleaning Process<br/>Remove stones, dust, husk]
        CL -->|Waste| WASTE[🗑️ Waste Disposed<br/>Stones, Dust, Straw]
        CL -->|Clean Paddy| ML
        ML[Milling / Production<br/>Husk removal, whitening, grading]
    end

    ML -->|By-Product| BP

    subgraph "🟧 WAREHOUSING — Finished Goods"
        FR[(Finished Rice Stock<br/>Premium / Grade A / Grade B)]
        BP[(By-Products Stock<br/>Bran + Husk)]
    end

    ML -->|Premium/Grade| FR
    FR -->|Dispatch| CUSTOMER
    BP -->|Dispatch| CUSTOMER

    CUSTOMER([🏪 Customer / Trader])
```

### Key Transformations at Each Stage:

| Stage | Input | Output | Loss/Waste |
|:---|:---|:---|:---|
| **Cleaning** | Raw Paddy (100 Kg) | Clean Paddy (~90 Kg) | Stones, Dust (~10 Kg) |
| **Production** | Clean Paddy (90 Kg) | Rice + By-Products (~85 Kg) | Absolute Loss (~5 Kg) |

> [!IMPORTANT]
> **Efficiency Tracking**: The system auto-calculates `Efficiency %` at every stage. If Cleaning efficiency falls below 85%, it means either the paddy quality is bad OR something is being miscounted.

---

## 5. Money Flow — How Finance Works

This is the **financial journey** — every Rupee that moves in or out of the mill.

```mermaid
graph TD
    subgraph "💸 MONEY OUT — Payables"
        FARMER_LEDGER[Farmer Ledger<br/>Amount Owed to Farmer]
        EXPENSE_LEDGER[Expense Ledger<br/>Labour, Power, Transport]
        PAY_OUT[💳 Payment Made<br/>Cash / Bank]
    end

    subgraph "💰 MONEY IN — Receivables"
        CUST_LEDGER[Customer Ledger<br/>Amount Owed By Customer]
        RECEIPT_IN[💵 Payment Received<br/>Cash / Bank]
    end

    subgraph "📒 ACCOUNTS CORE"
        LEDGERS[(Party Ledgers DB)]
        TRANSACTIONS[(Transactions Log)]
        GST[GST Computation<br/>CGST + SGST / IGST]
    end

    %% Paddy Inward creates payable
    PADDY_INWARD[Paddy Inward Saved] -->|Create Debit Entry| FARMER_LEDGER
    FARMER_LEDGER --> LEDGERS

    %% Sales creates receivable
    SALES_INVOICE[Sales Invoice Created] -->|Create Credit Entry| CUST_LEDGER
    SALES_INVOICE -->|Compute Tax| GST
    CUST_LEDGER --> LEDGERS

    %% Payments settle ledgers
    PAY_OUT -->|Settle Farmer Debt| FARMER_LEDGER
    RECEIPT_IN -->|Settle Customer Credit| CUST_LEDGER

    %% All movements logged
    LEDGERS --> TRANSACTIONS
    TRANSACTIONS -->|Reports View| REPORTS[📊 Reports & P&L]
```

### Double-Entry Accounting in Action:

| Business Event | Debit (DR) | Credit (CR) |
|:---|:---|:---|
| Buy Paddy from Farmer | Paddy Stock | Farmer Ledger (Payable) |
| Pay Farmer | Farmer Ledger | Cash / Bank |
| Sell Rice to Customer | Customer Ledger (Receivable) | Sales Revenue |
| Receive Payment | Cash / Bank | Customer Ledger |
| Log Expense | Expense Account | Cash |

---

## 6. All Modules Explained

### Module Map

```mermaid
graph LR
    DASH[📊 Dashboard<br/>Summary KPIs]
    PI[🌾 Paddy Inward]
    CL[🧹 Cleaning]
    PR[⚙️ Production]
    GD[🏭 Godown Stock]
    SL[🛒 Sales]
    EX[💸 Expenses]
    AC[📒 Accounts]
    PT[👥 Parties]
    RC[💵 Receipts]
    RP[📈 Reports]
    UM[👤 Users]

    DASH --- PI & CL & PR & GD & SL & EX & AC & PT & RC & RP & UM
```

---

### 6.1 📊 Dashboard
- Shows top-level KPIs: Total Paddy, Total Rice, Revenue, Expenses.
- Pulls data from aggregated views across all modules.
- **Key Component**: `DashboardPage.jsx`

### 6.2 🌾 Paddy Inward
| Feature | Detail |
|:---|:---|
| Purpose | Log every arrival of raw paddy from a farmer |
| Key Fields | Supplier Name, Date, Variety, Gross/Net Weight, Vehicle No., Godown |
| Side Effect | Automatically adds weight to `rice_stocks` table |
| Financial | Creates a Debit entry in Farmer's ledger |
| File | `PaddyInwardPage.jsx` + `paddyController.js` |

### 6.3 🧹 Cleaning Process
| Feature | Detail |
|:---|:---|
| Purpose | Log the cleaning of a paddy batch + measure waste |
| Key Fields | Input Weight In, Waste Breakdown (Stones/Dust/Straw), Clean Output |
| Side Effect | Deducts from Raw Paddy stock, adds to Clean Paddy stock |
| Auto-Calc | `Efficiency % = (Clean Output / Input) × 100` |
| File | `CleaningPage.jsx` + `cleaningController.js` |

### 6.4 ⚙️ Production (Milling)
| Feature | Detail |
|:---|:---|
| Purpose | Convert clean paddy into graded rice + by-products |
| Key Fields | Rice Output (Premium/A/B/Broken), Bran + Husk Kg, Yield %, Storage Godown |
| Side Effect | Deducts Clean Paddy stock, adds Finished Rice and By-Product stocks |
| Financial | No financial entry; only stock transformation |
| File | `ProductionPage.jsx` + `productionController.js` |

### 6.5 🏭 Godown Stock (Inventory Control Center)
| Feature | Detail |
|:---|:---|
| Purpose | Real-time view of all inventory across all warehouses |
| Key Features | Summary Cards (Paddy/Rice/Bran/Husk buckets), View Details modal, Add Godown, Alerts |
| Dynamic Sync | Adding a godown here propagates to ALL module dropdowns |
| File | `GodownStockPage.jsx` + `stockRoutes.js` |

### 6.6 🛒 Sales & Invoicing
| Feature | Detail |
|:---|:---|
| Purpose | Create and manage customer invoices with GST |
| Key Fields | Customer, Product, Qty (Bags), Rate, GST %, Payment Status |
| Side Effect | Deducts from Finished Rice / By-Product stock |
| Financial | Creates Receivable in Customer Ledger |
| File | `SalesPage.jsx` + `salesController.js` |

### 6.7 💸 Expenses
- Log operational mill expenses (Labour, Power, Maintenance, Transport).
- Each expense deducts from Cash/Bank ledger.

### 6.8 📒 Accounts & Ledgers
- Full ledger view per party (Farmer / Customer).
- Balance tracking: Total Transactions → Current Balance.
- GST computation for business reporting.

### 6.9 💵 Payment Receipts
- Record incoming payments from customers.
- Settles the outstanding balance in their ledger.

### 6.10 📈 Reports
- Business-level reports: P&L, Stock Summary, By-Product statements.

### 6.11 👥 Parties Master
- Manage all Farmers (Suppliers) and Customers in one place.
- Each party has a dedicated Ledger Account auto-created.

---

## 7. Database Schema (ERD)

```mermaid
erDiagram
    GODOWNS ||--o{ RICE_STOCKS : "host"
    PARTIES ||--o{ PADDY_INWARDS : "supply"
    PARTIES ||--o{ SALES : "purchase"
    PARTIES }|--|| LEDGERS : "owns"

    PADDY_INWARDS ||--o{ CLEANING_BATCHES : "input to"
    CLEANING_BATCHES ||--o{ PRODUCTIONS : "input to"

    PRODUCTIONS ||--o{ RICE_STOCKS : "populates"
    SALES ||--o{ RICE_STOCKS : "depletes"

    LEDGERS ||--o{ TRANSACTIONS : "recorded in"
    TRANSACTIONS }o--|| LEDGERS : "debit"
    TRANSACTIONS }o--|| LEDGERS : "credit"

    GODOWNS {
        int id PK
        string name
        decimal capacity_kg
    }
    PARTIES {
        int id PK
        string name
        string type
        string mobile_number
        decimal opening_balance
        int ledger_id FK
    }
    PADDY_INWARDS {
        int id PK
        date date
        string supplier_name
        string paddy_variety
        decimal net_weight_kg
        string godown
        decimal amount_payable
    }
    CLEANING_BATCHES {
        int id PK
        string inward_ref
        decimal input_weight_kg
        decimal total_waste_kg
        decimal clean_output_kg
        decimal efficiency_percent
        string destination_godown
        string ready_for_milling
    }
    PRODUCTIONS {
        int id PK
        string production_no
        decimal paddy_input_kg
        decimal total_rice_output_kg
        decimal bran_kg
        decimal husk_kg
        decimal yield_percent
        string rice_storage_godown
    }
    RICE_STOCKS {
        string godown
        string item_type
        string variety
        decimal available_weight_kg
        int bags
    }
    LEDGERS {
        int id PK
        string name
        string group_name
        decimal current_balance
    }
    TRANSACTIONS {
        int id PK
        date transaction_date
        string voucher_type
        int debit_ledger_id FK
        int credit_ledger_id FK
        decimal amount
    }
```

---

## 8. API Reference

| Method | Endpoint | Module | Description |
|:---|:---|:---|:---|
| `GET` | `/api/paddy-inwards` | Paddy | Get all paddy arrival records |
| `POST` | `/api/paddy-inwards` | Paddy | Log a new paddy arrival |
| `GET` | `/api/cleaning` | Cleaning | Get all cleaning batches |
| `POST` | `/api/cleaning` | Cleaning | Save a cleaning record |
| `GET` | `/api/production` | Production | Get all production entries |
| `POST` | `/api/production` | Production | Save a production run |
| `GET` | `/api/stock` | Stock | Get all line-item stock rows |
| `GET` | `/api/stock/summary` | Stock | Get aggregated per-godown summary |
| `GET` | `/api/stock/godowns` | Stock | Get master godown list |
| `POST` | `/api/stock/godowns` | Stock | Create a new godown |
| `GET` | `/api/sales` | Sales | Get all sales invoices |
| `POST` | `/api/sales` | Sales | Create a new sales invoice |
| `GET` | `/api/parties` | Parties | Get all parties |
| `POST` | `/api/parties` | Parties | Create a party + auto-create ledger |
| `GET` | `/api/expenses` | Expenses | Get all expenses |
| `POST` | `/api/expenses` | Expenses | Log a new expense |

---

## 9. The Centralized Stock Engine

This is the **most critical architectural decision** in the project.

```mermaid
graph TD
    subgraph "Any Module Saving Data"
        A1[Paddy Inward Save]
        A2[Cleaning Save]
        A3[Production Save]
        A4[Sales Save]
    end

    A1 & A2 & A3 & A4 --> ENGINE

    subgraph "Stock Engine — moveStock"
        ENGINE{moveStock Utility}
        ENGINE -->|1. Find existing row| RICE_STOCKS
        ENGINE -->|2. ADD or SUBTRACT weight| RICE_STOCKS
        ENGINE -->|3. Log the movement| MOVEMENTS
    end

    subgraph "Database"
        RICE_STOCKS[(rice_stocks<br/>Single Aggregate Table)]
        MOVEMENTS[(stock_movements<br/>Audit Trail)]
    end

    RICE_STOCKS -->|Aggregated by godown| DASHBOARD[Godown Dashboard Cards]
    MOVEMENTS -->|Vertical Timeline| MOVEMENT_LOG[Movement Log UI]
```

> [!IMPORTANT]
> **The Golden Rule**: Every single change to physical stock — no matter which module — MUST go through the `moveStock` function. This is what ensures the dashboard always shows the right numbers.

### How `moveStock` Works:
```javascript
// Pseudocode for the Stock Engine
async function moveStock(godown, itemType, variety, weightKg, action) {
  // 1. Try to find an existing row
  const existing = await db.find({ godown, itemType, variety });

  if (existing) {
    // 2. Update: ADD (inward) or SUBTRACT (sale/use)
    await db.update({ id: existing.id, weight: existing.weight + weightKg });
  } else {
    // 3. Create a new row if it's a brand-new combination
    await db.insert({ godown, itemType, variety, weight: weightKg });
  }

  // 4. Always log the movement
  await db.insert({ stock_movements: { action, godown, weightKg } });
}
```

---

## 10. Dynamic Godown Sync

This is the **scalability feature** — how you expand the mill without touching any code.

```mermaid
sequenceDiagram
    actor Manager
    participant GodownPage as Godown Dashboard
    participant Backend as Express API
    participant DB as PostgreSQL
    participant OtherModules as Paddy/Cleaning/Production

    Manager->>GodownPage: Clicks "Add Godown"
    GodownPage->>GodownPage: Opens Registration Modal
    Manager->>GodownPage: Enters "Godown E - Cold Store" + Capacity
    GodownPage->>Backend: POST /api/stock/godowns
    Backend->>DB: INSERT INTO godowns (name, capacity_kg)
    DB-->>Backend: ✅ Success
    Backend-->>GodownPage: 201 Created
    GodownPage->>GodownPage: Shows "New Godown Added Successfully!" Toast
    GodownPage->>Backend: GET /api/stock/summary (Refetch)
    Backend->>DB: LEFT JOIN godowns with rice_stocks
    DB-->>Backend: Includes "Godown E" with 0 Kg
    Backend-->>GodownPage: New card rendered on Dashboard

    Note over OtherModules: Any time user opens a form...
    OtherModules->>Backend: GET /api/stock/godowns
    DB-->>Backend: [A, B, C, D, "Godown E"]
    Backend-->>OtherModules: Dropdown now includes Godown E ✅
```

---

## 11. User Roles & Access

```mermaid
graph TD
    ADMIN[👑 Admin / Owner] -->|Full Access| ALL
    MANAGER[👔 Mill Manager] -->|Production + Godown| OPS
    ACCOUNTANT[📒 Accountant] -->|Finance Only| FIN

    ALL[All Modules]
    OPS[Paddy / Cleaning / Production / Godown]
    FIN[Accounts / Sales / Expenses / Reports]
```

| Role | Permissions |
|:---|:---|
| **Admin** | Full CRUD on all modules, User Management |
| **Manager** | Can add/view Paddy Inward, Cleaning, Production, Godown |
| **Accountant** | Can manage Sales, Expenses, Accounts, Receipts |

---

## 12. Golden Rules for Developers

> [!IMPORTANT]
> Read these before writing even one line of code.

### Rule 1 — Never Bypass the Stock Engine
❌ `UPDATE rice_stocks SET weight = weight - 100 WHERE ...` (Direct SQL)
✅ Always call the `moveStock` service function.

### Rule 2 — Godowns are Master Data
❌ Never hardcode godown names as `<option>Godown A</option>` in JSX.
✅ Always `fetch('/api/stock/godowns')` in a `useEffect` and `.map()` the result.

### Rule 3 — Always Work in Kilograms
❌ `weight: 2.5` (assuming tonnes)
✅ `weight_kg: 2500` (always store in Kg)

### Rule 4 — Double-Entry for Every Rupee
❌ Logging a sale without updating the customer ledger.
✅ Every financial event must have one DEBIT and one CREDIT entry.

### Rule 5 — Validate Before Deducting
❌ Allowing a sale of 200 Kg when only 150 Kg is in stock.
✅ Always check `available_weight_kg >= requested_weight` before committing.

---

*End of Documentation — RiceMill Pro v1.0*
