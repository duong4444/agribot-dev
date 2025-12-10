# Farm Management Documentation
------2.1.2.4-----
## 1. Actors
- **User (Farmer)**: Managing their own farm and financial data.

## 2. Use Case Specifications

### UC-FARM-01: Add Farm
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Add Farm** |
| **Actor** | User |
| **Brief Description** | User registers a new farm in the system. Note: Each user typically owns one farm, but the system may allow adding one if none exists. |
| **Pre-conditions** | User is logged in. User does not have a farm (if 1-farm limit applies) or limit not reached. |
| **Basic Flows** | 1. User navigates to "My Farms" or Dashboard.<br>2. User clicks "Add Farm".<br>3. User enters Farm Name, Address, Description.<br>4. User clicks "Create".<br>5. System validates input.<br>6. System creates farm record.<br>7. System associates farm with User.<br>8. System redirects to Farm Dashboard. |
| **Alternative Flows** | **A1. Validation Error:**<br>1. Missing required fields.<br>2. System shows error.<br><br>**A2. Limit Reached:**<br>1. User tries to add a second farm (if rule exists).<br>2. System shows "You can only own one farm". |
| **Post-conditions** | New farm created; User is set as owner. |

### UC-FARM-02: Edit Farm
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Farm** |
| **Actor** | User |
| **Brief Description** | User updates farm details. |
| **Pre-conditions** | User is logged in and owns the farm. |
| **Basic Flows** | 1. User navigates to Farm Settings.<br>2. User updates Name, Address, or Description.<br>3. User clicks "Save".<br>4. System validates input.<br>5. System updates record.<br>6. System shows success message. |
| **Alternative Flows** | **A1. Validation Error:**<br>1. Invalid data.<br>2. System shows error. |
| **Post-conditions** | Farm details updated. |

### UC-FARM-03: View Financial Data
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Financial Data** |
| **Actor** | User |
| **Brief Description** | User views revenue, expenses, and profit statistics. |
| **Pre-conditions** | User is logged in and has a farm with activity logs. |
| **Basic Flows** | 1. User navigates to "Financials" or "Statistics" tab.<br>2. System fetches financial data (Expenses from inputs, Revenue from harvests).<br>3. System calculates Profit = Revenue - Expenses.<br>4. System displays dashboard (Charts/Tables) filtered by month/year.<br>5. User changes time filter (e.g., "This Month").<br>6. System updates view. |
| **Alternative Flows** | **A1. No Data:**<br>1. No activities recorded yet.<br>2. System shows empty state or "No data available". |
| **Post-conditions** | Financial insights displayed. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Add Farm

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Click "Add Farm"
    FE-->>U: Show Farm Creation Form
    U->>FE: Enter Details (Name, Addr) & Submit
    FE->>BE: POST /api/farms
    BE->>BE: Validate & Check User Limits
    alt Valid & Limit OK
        BE->>DB: Insert Farm Record
        DB-->>BE: Success (FarmID)
        BE->>DB: Link User as Owner
        BE-->>FE: Return Farm Data
        FE-->>U: Redirect to Farm Dashboard
    else Validation Fail / Limit Exceeded
        BE-->>FE: Error Message
        FE-->>U: Display Error
    end
```

### 3.2 Sequence Diagram: Edit Farm

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Open Farm Settings
    FE->>BE: GET /api/farms/:id
    BE-->>FE: Current Farm Info
    U->>FE: Edit fields & Save
    FE->>BE: PUT /api/farms/:id
    BE->>BE: Validate Input
    BE->>DB: Update Farm Record
    DB-->>BE: Success
    BE-->>FE: Success Message
    FE-->>U: Show "Farm Updated"
```

### 3.3 Sequence Diagram: View Financial Data

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Navigate to Financials
    U->>FE: Select Period (e.g., current month)
    FE->>BE: GET /api/farms/:id/stats?period=month
    
    par Fetch Revenue & Expenses
        BE->>DB: Sum(Harvest Revenues) in Period
        BE->>DB: Sum(Input Expenses) in Period
    end
    
    DB-->>BE: Return Totals
    BE->>BE: Calculate Profit
    BE-->>FE: JSON { revenue, expense, profit }
    FE-->>U: Render Charts/Tables
```
