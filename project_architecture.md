# 🏗️ Rice Mill ERP: Technical Architecture & Product Flow

This document provides a 360-degree view of the system architecture, specifically designed for Product Management (process clarity) and Intermediate Developers (schema and logic flow).

## 1. High-Level System Architecture
The project follows a standard **MERN-style** architecture (using PostgreSQL instead of Mongo) with a centralized stock engine.

```mermaid
graph TD
    User((User/Staff)) -->|React + Tailwind| Frontend[Vite Frontend]
    Frontend -->|REST API + Auth| Backend[Node.js / Express Server]
    Backend -->|SQL Queries| DB[(Neon PostgreSQL)]
    
    subgraph "Internal Processing"
        Backend --> Logic[Stock Engine / moveStock Service]
        Logic --> DB
    end
```

---

## 2. Product Lifecycle Flow (The "Grain" Journey)
This is the core business logic. It tracks how raw material transforms into finished goods.

```mermaid
graph LR
    A[Paddy Inward] -->|Store in Godown| B(Godown Stock - Raw)
    B -->|Cleaning Process| C[Cleaning Batch]
    C -->|Waste Deduction| D(Godown Stock - Clean)
    D -->|Milling/Production| E[Production Entry]
    E -->|Grading| F{Finished Goods}
    F -->|Bucket 1| G[Premium Rice]
    F -->|Bucket 2| H[By-Products: Bran/Husk]
    G -->|Sales| I[Customer/Dispatch]
```

---

## 3. Data Relationship Diagram (ERD)
How the tables in your database are connected.

```mermaid
erDiagram
    GODOWNS ||--o{ RICE_STOCKS : "stores"
    PADDY_INWARDS ||--o{ CLEANING_BATCHES : "input for"
    CLEANING_BATCHES ||--o{ PRODUCTION : "input for"
    
    RICE_STOCKS {
        string godown "PK"
        string item_type "Paddy/Rice/By-Product"
        string variety "Basmati/IR64 etc"
        decimal weight_kg
    }
    
    GODOWNS {
        int id "PK"
        string name "Unique"
        decimal capacity_kg
    }

    PARTIES ||--o{ PADDY_INWARDS : "supplies"
    PARTIES ||--o{ SALES : "buys"
    PARTIES ||--o{ LEDGERS : "has balance"
```

---

## 4. The Centralized Stock Engine (Developer Deep-Dive)
Instead of updating inventory in 5 different ways, the project uses a **Centralized Aggregate Pattern**.

> [!IMPORTANT]
> **Single Source of Truth**: Every transaction (Inward, Cleaning, Sale) updates the `rice_stocks` table via an atomic calculation. This prevents "Ghost Stock" (stock that doesn't exist but shows up in reports).

### How a "Move Stock" Works:
1.  **Deduct**: Subtracts weight from the source (e.g., `Godown A`).
2.  **Add**: Adds weight to the destination (e.g., `Production Unit`).
3.  **Log**: Creates a row in `stock_movements` for audit trails.
4.  **Aggregate**: The Dashboard runs a `SUM()` on this table to show you real-time cards.

---

## 5. Module Responsibilities
| Module | Product Goal | Developer Goal |
| :--- | :--- | :--- |
| **Dashboard** | Business Health Snapshot | Complex SQL Aggregations (LEFT JOINs) |
| **Paddy Inward** | Inventory on-boarding | Multi-table insert (Inward + Stock + Ledger) |
| **Cleaning** | Quality & Waste Audit | Transactional deduction (Input -> Output) |
| **Production** | Yield & Efficiency Analysis | Grading logic & By-product distribution |
| **Godown** | Logistics & Space Mgmt | Live Master Data Synchronization |

---

> [!TIP]
> **For the PM**: Focus on the **Product Lifecycle Flow**. If the "Waste Score" is high in Cleaning, it means the Paddy quality is low.
> 
> **For the Developer**: Focus on the **Centralized Stock Engine**. Never update inventory without checking the `available_weight_kg` first.
