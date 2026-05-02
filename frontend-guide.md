# Frontend Integration Guide: Rice Mill ERP

As a Senior Full-Stack Developer, here's how you should manage the state and logic in your React (Vite) frontend to ensure a seamless "Paddy to Rice" lifecycle.

## 1. State Management for Complex Workflows

Use a combination of `useState` for local form state and `React Query` (or `SWR`) for server state. This ensures your inventory data is always fresh.

### Example: Sales Form with Backorder Handling

When a user enters a quantity, you should ideally pre-check the stock or handle the response from the backend.

```javascript
// src/pages/SalesPage.jsx snippet
const handleSaleSubmit = async (formData) => {
  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.sale.status === 'Partially Fulfilled') {
      // Prompt the user about the backorder
      alert(`Stock insufficient. ${data.sale.totalDeliveredKg}kg sold. ${data.sale.totalBackorderKg}kg added to Backorders.`);
    } else {
      alert('Sale completed successfully!');
    }
    
    // Refresh inventory and sales list
    queryClient.invalidateQueries(['stock']);
    queryClient.invalidateQueries(['sales']);
  } catch (error) {
    console.error("Sale failed", error);
  }
};
```

## 2. Auto-Calculations (Real-time UI)

Ensure the UI calculates weights and financials instantly to prevent user errors.

- **Paddy Inward**: 
  - `Net Weight = Gross - Tare`
  - `Total Amount = Net Weight * Rate`
  - `Net Payable = Total Amount - Deductions`
  - `Balance = Net Payable - Advance`
- **Cleaning**:
  - `Total Waste = Stones + Dust + Straw + Others`
  - `Efficiency % = (Output / Input) * 100`

## 3. Handling Partial Fulfillment

When the backend returns a `Partially Fulfilled` status:
1.  **UI Feedback**: Show a warning badge or a toast notification.
2.  **Backorder View**: Create a separate "Backorders" tab in your Sales module where staff can see pending quantities and fulfill them once production adds more stock.
3.  **Stock Blocking**: Be careful not to let users sell the same stock twice. The backend ACID transaction already prevents this, but the UI should ideally disable the "Sell" button if the local `quantity` exceeds `availableStock`.

## 4. API Structure for the Frontend

| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| Paddy Inward | POST | `/api/paddy-inwards` | Saves purchase, updates stock & ledger |
| Cleaning | POST | `/api/cleaning` | Deducts Raw Paddy, Adds Cleaned Paddy |
| Production | POST | `/api/production` | Deducts Cleaned, Adds Finished & By-products |
| Sales | POST | `/api/sales` | Deducts Stock, Handles Backorders, Updates Ledger |
| Stock Summary | GET | `/api/stock/summary` | Real-time dashboard stats |

## 5. Security Note

Always validate the `totalWeight` on the backend before committing transactions. Never trust only the frontend calculations.
