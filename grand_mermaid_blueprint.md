# 🛸 Rice Mill ERP: The Grand Blueprint

This unified diagram represents the entire ecosystem of your project. It maps User Actions, Frontend Logic, Backend Services, and Database Persistence in one single flow.

```mermaid
graph TD
    %% Standard Styles
    classDef actor fill:#f9f,stroke:#333,stroke-width:2px;
    classDef module fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef database fill:#f1f8e9,stroke:#33691e,stroke-width:2px;
    classDef sync fill:#f3e5f5,stroke:#7b1fa2,stroke-width:4px,stroke-dasharray: 5 5;

    %% Actors
    USER((Mill Manager / Staff)):::actor

    %% Frontend Layers
    subgraph "⚛️ VITE FRONTEND (React + Tailwind v4)"
        NAV[Sidebar Navigation]
        
        subgraph "Inventory Control"
            GODOWN_UI[Godown Stock Dashboard]:::module
            PADDY_UI[Paddy Inward Page]:::module
            CLEAN_UI[Grain Cleaning Page]:::module
            PROD_UI[Production Page]:::module
        end
        
        subgraph "Sales & Finance"
            SALES_UI[Sales & Billing]:::module
            ACC_UI[Accounts & Ledgers]:::module
        end
    end

    %% Backend Layers
    subgraph "🚀 EXPRESS BACKEND (Node.js)"
        API_GATEWAY[authFetch / Middleware]
        
        subgraph "Controllers"
            STOCK_CTRL[Stock Controller]:::service
            PADDY_CTRL[Paddy Controller]:::service
            PROCESS_CTRL[Process/Yield Logic]:::service
        end
        
        subgraph "Central Core"
            SYNC_ENGINE((Dynamic Godown Sync)):::sync
            STOCK_SERVICE[moveStock Utility]:::service
        end
    end

    %% Database Layer
    subgraph "🗄️ NEON POSTGRES (Atomic State)"
        DB_GODOWNS[(Table: godowns)]:::database
        DB_STOCKS[(Table: rice_stocks)]:::database
        DB_INWARDS[(Table: paddy_inwards)]:::database
        DB_TRANS[(Table: stock_movements)]:::database
        DB_LEDGERS[(Table: party_ledgers)]:::database
    end

    %% Interaction Flows
    USER -->|Navigates| NAV
    NAV --> PADDY_UI
    NAV --> GODOWN_UI

    %% The Dynamic Sync Flow (Latest Feature)
    GODOWN_UI -->|Add New Godown| SYNC_ENGINE
    SYNC_ENGINE -->|1. Write| DB_GODOWNS
    DB_GODOWNS -->|2. Propagate| PADDY_UI
    DB_GODOWNS -->|2. Propagate| CLEAN_UI
    DB_GODOWNS -->|2. Propagate| PROD_UI

    %% The Stock Movement Logic
    PADDY_UI -->|Arrival Log| PADDY_CTRL
    CLEAN_UI -->|Cleaning Log| PROCESS_CTRL
    PROD_UI -->|Yield Log| PROCESS_CTRL
    
    PADDY_CTRL -->|Trigger| STOCK_SERVICE
    PROCESS_CTRL -->|Trigger| STOCK_SERVICE
    STOCK_SERVICE -->|Atomic Update| DB_STOCKS
    STOCK_SERVICE -->|Audit Row| DB_TRANS

    %% Financial Integration
    SALES_UI -->|Invoice| ACC_UI
    ACC_UI -->|Credit/Debit| DB_LEDGERS

    %% Real-time Dashboard Sync
    DB_STOCKS -->|Live Aggregated SUM| GODOWN_UI
    DB_TRANS -->|Vertical History| GODOWN_UI

    %% Notes
    Note1[New Godown table acts as Master for all Dropdowns]
    Note2[Summary First UI uses LEFT JOIN for Zero-Stock visibility]
    
    GODOWN_UI -.-> Note1
    DB_STOCKS -.-> Note2
```

## 🔍 Why this Architecture is "Elite":
1.  **Atomic Inventory**: Stock shifts are not scattered. Every module calls `moveStock`, meaning your total weight always balances to zero.
2.  **Master Proxy Pattern**: The dropdowns in Paddy/Cleaning/Production are now "Live Observers" of the `godowns` table. If you delete a godown, they all know immediately.
3.  **Zero-Stock Logic**: The dashboard uses a **LEFT JOIN** from Godowns to Stocks. This means a new, empty godown room will STILL show up on your dashboard as a card, rather than disappearing.
4.  **Traceability**: Every single Kilogram is tracked in the `stock_movements` log, creating a vertical timeline of your mill's life.

---

> [!TIP]
> **Pro Choice**: For an intermediate developer, notice how the `SYNC_ENGINE` bridges the gap between Master Data (Godowns) and Operational Data (Inwards/Production). 
