# Admin Farm Management Documentation
-----2.1.2.17-----

## 1. Overview
The Admin Farm Management module allows Administrators to oversee all farms in the system. Admins can view a comprehensive list of farms, search for specific farms using various criteria (farm name, address, owner information), and view detailed information for each farm including its cultivated areas.

## 2. Actors
- **Admin**: Has access to view all farm data.
- **Web App**: The frontend interface (Admin Panel).
- **System**: The backend API processing requests.

## 3. Use Case Specifications

### UC-ADM-FARM-01: View Farm List
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Farm List** |
| **Actor** | Admin |
| **Brief Description** | Admin views a paginated list of all farms in the system. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin navigates to "Quản lý Nông trại" (Farm Management).<br>2. Web App sends request `GET /api/admin/farms`.<br>3. System retrieves all farms with owner info and area counts.<br>4. Web App displays the list of farms.<br>  - Columns: ID, Farm Name, Owner (Name/Email), Address, Area Count, Created Date. |
| **Alternative Flows** | **A1. No Farms:** System returns empty list; UI shows "Chưa có nông trại nào". |
| **Post-conditions** | List of all farms is displayed. |

### UC-ADM-FARM-02: Search Farm
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Farm** |
| **Actor** | Admin |
| **Brief Description** | Admin searches/filters the visible farm list by keywords (Client-side). |
| **Pre-conditions** | Admin is viewing the Farm List. |
| **Basic Flows** | 1. System has loaded all farms (from UC-ADM-FARM-01).<br>2. Admin enters a keyword in the Search Bar.<br>3. Web App filters the list instantly checking matches in:<br>   - Farm Name<br>   - Address<br>   - Owner Name<br>   - Owner Email<br>4. Web App updates the table to show matching results. |
| **Alternative Flows** | **A1. No Match:** UI shows "Không tìm thấy nông trại". |
| **Post-conditions** | Farm list filtered by the keyword. |

### UC-ADM-FARM-03: View Farm Details
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Farm Details** |
| **Actor** | Admin |
| **Brief Description** | Admin views comprehensive details of a specific farm. |
| **Pre-conditions** | Admin is viewing Farm List. |
| **Basic Flows** | 1. Admin clicks "Xem chi tiết" (View Details) button on a farm row.<br>2. Web App navigates to `/admin/farms/:id`.<br>3. Web App sends request `GET /api/admin/farms/:id`.<br>4. System retrieves full farm details + list of Areas.<br>5. Web App displays:<br>   - Basic Info (ID, Name, Address, Desc).<br>   - Owner Info (Name, Email).<br>   - List of Cultivated Areas (Name, Type, Crop). |
| **Alternative Flows** | **A1. Farm Not Found:** System returns 404; UI redirects back to list or shows error. |
| **Post-conditions** | Detailed farm information is displayed. |

---

## 4. Sequence Diagrams

### 4.1 Sequence Diagram: View Farm List

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminFarmsPage)
    participant CTL as FarmsController
    participant SVC as FarmsService
    participant DB as Database

    A->>FE: Navigate to Farm Management
    Note over FE: Page Load
    FE->>CTL: GET /api/admin/farms (via /farms/all endpoint)
    CTL->>SVC: getAllFarms()
    SVC->>DB: SELECT * FROM farms JOIN users, areas
    DB-->>SVC: List of Farms (with User & Area count)
    SVC-->>CTL: Farm Summaries []
    CTL-->>FE: JSON Farm List
    FE-->>A: Display Farm Table
```

### 4.2 Sequence Diagram: Search Farm (Client-side)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminFarmsPage)
    participant CTL as FarmsController
    participant SVC as FarmsService
    participant DB as Database

    A->>FE: Navigate to Farm Management
    Note over FE: Page Load
    FE->>CTL: GET /api/admin/farms (via /farms/all endpoint)
    CTL->>SVC: getAllFarms()
    SVC->>DB: SELECT * FROM farms JOIN users, areas
    DB-->>SVC: List of Farms (with User & Area count)
    SVC-->>CTL: Farm Summaries []
    CTL-->>FE: JSON Farm List
    FE-->>A: Display Farm Table
    
    Note over FE: User Interaction
    A->>FE: Search by farm name,farm address,OwnerName,OwnerEmail
    FE->>FE: Filter local list
    Note right of FE: Check Name OR Address OR OwnerName OR OwnerEmail
    FE-->>A: Update displayed list instantly
```

### 4.3 Sequence Diagram: View Farm Details

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminFarmDetailPage)
    participant CTL as FarmsController
    participant SVC as FarmsService
    participant DB as Database

    A->>FE: Click "View Details"
    FE->>CTL: GET /api/admin/farms/:id
    CTL->>SVC: getFarmById(id)
    SVC->>DB: Find Farm, JOIN User, JOIN Areas
    DB-->>SVC: Farm Entity (Full)
    SVC-->>CTL: Farm Details
    CTL-->>FE: JSON Farm Data
    FE-->>A: Show Details Page (Info + Areas)
```
