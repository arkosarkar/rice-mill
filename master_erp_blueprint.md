# 🗺️ Rice Mill ERP: The Ultimate Master Blueprint

This is the **Whole Project Map**. It connects every single module and database entity into one unified flow—from a Farmer bringing Paddy to a Customer receiving an Invoice.

```mermaid
graph TD
    %% ZONE DEFINITIONS
    subgraph "🟦 Zone 1: Master & Meta Data"
        PARTIES[Parties Master<br/>Farmers & Customers]
        GODOWNS_MASTER[Godown Registry<br/>Storage Assets]
    end

    subgraph "🟩 Zone 2: Procurement (Input)"
        PADDY_INWARD[Paddy Inward<br/>Arrival & Bagging]
        PADDY_INWARD -->|Log Debt| LEDGERS
    end

    subgraph "🟧 Zone 3: Live Warehousing (Real-time)"
        STOCK_LOGS[Stock Movement Logs<br/>Audit Trail]
        INV_PADDY[Raw Paddy Buckets]
        INV_CLEAN[Cleaned Grain]
        INV_FINISHED[Finished Rice]
        INV_BYPROD[By-Products Stock]
    end

    subgraph "🟪 Zone 4: Factory Processing"
        CLEANING[Grain Cleaning<br/>Waste Analysis]
        PRODUCTION[Milling & Grading<br/>Yield Analysis]
    end

    subgraph "🟨 Zone 5: Commercial & dispatch"
        SALES[Sales & Billing<br/>GST Invoicing]
        SALES -->|Log Credit| LEDGERS
    end

    subgraph "🟥 Zone 6: Financial Controls"
        LEDGERS[Party Ledgers]
        GST[Tax Hub / GST]
        PAYMENTS[Payment Receipts]
        PAYMENTS -->|Update| LEDGERS
    end

    %% PRODUCT FLOW (Physical Grain)
    PARTIES -->|Supplies| PADDY_INWARD
    PADDY_INWARD -->|Stock In| INV_PADDY
    INV_PADDY -->|Input| CLEANING
    CLEANING -->|Output| INV_CLEAN
    INV_CLEAN -->|Milling Input| PRODUCTION
    PRODUCTION -->|Finished Rice| INV_FINISHED
    PRODUCTION -->|By-Products| INV_BYPROD
    
    INV_FINISHED -->|Dispatch| SALES
    INV_BYPROD -->|Dispatch| SALES
    SALES -->|Customer| PARTIES

    %% LOGIC & SYNC FLOW
    GODOWNS_MASTER -.->|Sync Dropdowns| PADDY_INWARD
    GODOWNS_MASTER -.->|Sync Dropdowns| CLEANING
    GODOWNS_MASTER -.->|Sync Dropdowns| PRODUCTION
    
    INV_PADDY & INV_CLEAN & INV_FINISHED & INV_BYPROD --- STOCK_LOGS
    STOCK_LOGS -.->|Visual Alerts| DASHBOARD[DASHBOARD UI]

    %% STYLING
    classDef blue fill:#e3f2fd,stroke:#2196f3,stroke-width:2px;
    classDef green fill:#e8f5e9,stroke:#4caf50,stroke-width:2px;
    classDef orange fill:#fff3e0,stroke:#ff9800,stroke-width:2px;
    classDef purple fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px;
    classDef yellow fill:#fffde7,stroke:#fbc02d,stroke-width:2px;
    classDef red fill:#ffebee,stroke:#f44336,stroke-width:2px;

    class PARTIES,GODOWNS_MASTER blue
    class PADDY_INWARD green
    class INV_PADDY,INV_CLEAN,INV_FINISHED,INV_BYPROD,STOCK_LOGS orange
    class CLEANING,PRODUCTION purple
    class SALES yellow
    class LEDGERS,GST,PAYMENTS red
```

---

## 📖 How to read this "Grand Map":

### 1. The Grain Journey (The Arcs)
Follow the **Solid Arrows** (`-->`). You'll see how material moves from a **Party** to **Inward**, gets stored in **Paddy Stock**, moves through **Processing**, and finally leaves via **Sales**.

### 2. The Financial Logic (Red Zone)
Every action in Procurement or Sales automatically triggers an update in the **Red Zone**. 
- Paddy Inward = Ledger Debit (Amount to pay farmer).
- Sales = Ledger Credit (Amount to receive from customer).
- Payment Receipt = Settles the Ledger.

### 3. The Centralized Stock (Orange Zone)
Every physical action (Input/Output) connects to the **Orange Zone**. This zone is the "Heart" of your ERP. It ensures that if you clean 100Kg Paddy, the stock in your godown decreases by exactly 100Kg.

### 4. The Master Registry (Blue Zone)
This zone controls the user experience. By updating the **Godown Registry**, you are updating the options available in every other module (Green, Purple Zones).

---

### 🚀 Key Insight for the Team:
- **PM Choice**: This blueprint shows exactly how modules are dependent. For example, you cannot do **Cleaning** if the **Paddy Inward** hasn't updated the **Stock Bucket** first.
- **Developer Choice**: This map identifies where the `moveStock` logic should be implemented (any arrow pointing TO or FROM the Orange Zone).
