# Farming Activity Management Documentation
-----2.1.2.5-----
## 1. Actors
- **User (Farmer)**: Record and manage daily farming activities.

## 2. Use Case Specifications

### UC-ACT-01: Add Farming Activity
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Add Farming Activity** |
| **Actor** | User |
| **Brief Description** | User records a new activity (e.g., Planting, Fertilizing, Harvesting) for a specific area. |
| **Pre-conditions** | User is logged in and has at least one cultivation area. |
| **Basic Flows** | 1. User navigates to "Activities" or specific "Area".<br>2. User clicks "Add Activity".<br>3. User selects **Area** and **Plant** (optional).<br>4. User selects **Type** (e.g., Fertilize, Water, Harvest).<br>5. User enters **Date**, **Description**, and specialized data (e.g., amount of fertilizer).<br>6. User clicks "Save".<br>7. System validates input.<br>8. System creates activity record.<br>9. System displays "Activity added successfully". |
| **Alternative Flows** | **A1. Validation Fail:**<br>1. Missing date or type.<br>2. System shows error. |
| **Post-conditions** | Activity is saved in history. |

### UC-ACT-02: Edit Farming Activity
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Farming Activity** |
| **Actor** | User |
| **Brief Description** | User modifies an existing activity record. |
| **Pre-conditions** | User owns the activity record. |
| **Basic Flows** | 1. User selects an activity from the list.<br>2. User clicks "Edit".<br>3. User updates fields (e.g., change date or description).<br>4. User clicks "Update".<br>5. System validates and saves changes.<br>6. System displays success message. |
| **Post-conditions** | Activity record is updated. |

### UC-ACT-03: Delete Farming Activity
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Farming Activity** |
| **Actor** | User |
| **Brief Description** | User removes an activity record. |
| **Pre-conditions** | User owns the activity record. |
| **Basic Flows** | 1. User selects an activity.<br>2. User clicks "Delete".<br>3. System asks for confirmation "Are you sure?".<br>4. User confirms.<br>5. System deletes record.<br>6. System removes item from list. |
| **Post-conditions** | Activity record is permanently removed. |

### UC-ACT-04: Search Farming Activities
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Activities** |
| **Actor** | User |
| **Brief Description** | User finds activities based on specific criteria. |
| **Pre-conditions** | User has activity records. |
| **Basic Flows** | 1. User navigates to Activity History.<br>2. User enters filter criteria:<br>   - **Area**: Select from list.<br>   - **Plant**: Select plant type.<br>   - **Activity Type**: Select (Sowing, Harvest, etc.).<br>   - **Time Range**: Start Date - End Date.<br>   - **Description**: Text keyword.<br>3. User clicks "Search".<br>4. System queries database with filters.<br>5. System returns matching list.<br>6. User views results. |
| **Alternative Flows** | **A1. No Results:**<br>1. No records match criteria.<br>2. System shows "No activities found". |
| **Post-conditions** | Filtered list is displayed. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Add Activity

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Click "Add Activity"
    FE-->>U: Show Form
    U->>FE: Input(Type, Area, Date, Desc) & Submit
    FE->>BE: POST /api/activities
    BE->>BE: Validate Data
    note right of BE: Check if Area belongs to User
    BE->>DB: Insert Activity Record
    DB-->>BE: Success (ID)
    BE-->>FE: Return Created Activity
    FE-->>U: Show Success Toast
```

### 3.2 Sequence Diagram: Search Activities

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Open Activity Log
    U->>FE: Set Filters (Area=A1, Type=Harvest, Date=LastWeek)
    U->>FE: Click "Search"
    FE->>BE: GET /api/activities
    note right of FE: Query Params: ?areaId=A1&type=Harvest&from=...&to=...
    
    BE->>BE: Build Query from Filters
    BE->>DB: Execute Search Query
    DB-->>BE: Return List [Activity1, Activity2...]
    BE-->>FE: Return JSON List
    FE-->>U: Render Activity Table
```

### 3.3 Sequence Diagram: Edit Activity

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Update Data -> Click Save
    FE->>BE: PUT /api/activities/:id
    BE->>DB: Update Record
    DB-->>BE: Success
    BE-->>FE: Success Message
    FE-->>U: Show "Activity Updated"
```

### 3.4 Sequence Diagram: Delete Activity

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Click Delete -> Confirm
    FE->>BE: DELETE /api/activities/:id
    BE->>DB: Remove Record
    DB-->>BE: Success
    BE-->>FE: Success Message
    FE->>FE: Remove from UI List
```
