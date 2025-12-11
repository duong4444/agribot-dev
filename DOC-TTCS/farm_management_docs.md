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
    participant CTL as FarmController
    participant SVC as FarmService
    participant DB as Database

    U->>FE: Fill Farm Data -> Submit
    FE->>CTL: POST /api/farms
    CTL->>SVC: create(userId, dto)
    
    SVC->>DB: Check Limit (if any)
    alt Limit OK
        SVC->>DB: Insert Farm Record
        DB-->>SVC: Success
        SVC-->>CTL: Return New Farm
        CTL-->>FE: Success JSON
        FE-->>U: Redirect to Dashboard
    else Limit Exceeded
        SVC-->>CTL: Throw BadRequestException
        CTL-->>FE: Error Response
        FE-->>U: Show Error
    end
```

### 3.2 Sequence Diagram: Edit Farm

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as FarmController
    participant SVC as FarmService
    participant DB as Database

    U->>FE: Edit Farm Info -> Save
    FE->>CTL: PUT /api/farms/:id
    CTL->>SVC: update(id, userId, dto)
    
    SVC->>DB: Update Record
    DB-->>SVC: Success
    SVC-->>CTL: Return Updated Farm
    CTL-->>FE: Success JSON
    FE-->>U: Show "Farm Updated"
```

### 3.3 Sequence Diagram: View Financial Data

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as FarmController
    participant SVC as FarmService
    participant DB as Database

    U->>FE: Select Period -> View Stats
    FE->>CTL: GET /api/farms/:id/stats
    CTL->>SVC: getStats(farmId, period)
    
    par Fetch Revenue & Expenses
        SVC->>DB: Sum(Harvest Revenues)
        SVC->>DB: Sum(Input Expenses)
    end
    
    DB-->>SVC: Return Computations
    SVC->>SVC: Calculate Profit
    SVC-->>CTL: Return Stats (Rev, Exp, Prof)
    CTL-->>FE: JSON Response
    FE-->>U: Render Charts
```
