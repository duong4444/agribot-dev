# Cultivation Area Management Documentation
-----2.1.2.6-------
## 1. Actors
- **User (Farmer)**: Manage cultivation areas within their farm.

## 2. Use Case Specifications

### UC-AREA-01: Add Cultivation Area
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Add Cultivation Area** |
| **Actor** | User |
| **Brief Description** | User defines a new area (e.g., "Greenhouse 1") for farming. |
| **Pre-conditions** | User is logged in and owns a farm. |
| **Basic Flows** | 1. User navigates to Farm Detail/Areas page.<br>2. User clicks "Add Area".<br>3. User enters Area Name, Type (e.g., Outdoor, Greenhouse), and Size.<br>4. User clicks "Create".<br>5. System validates data.<br>6. System saves new area.<br>7. System reflects new area in list. |
| **Alternative Flows** | **A1. Validation Error:**<br>1. Missing name.<br>2. System shows error. |
| **Post-conditions** | New area added to farm. |

### UC-AREA-02: Edit Cultivation Area
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Cultivation Area** |
| **Actor** | User |
| **Brief Description** | User updates details of a specific area. |
| **Pre-conditions** | User owns the area. |
| **Basic Flows** | 1. User selects an Area.<br>2. User clicks "Edit".<br>3. User updates fields (Name, Description).<br>4. User clicks "Save".<br>5. System validates and updates record.<br>6. System displays success message. |
| **Post-conditions** | Area details updated. |

### UC-AREA-03: Delete Cultivation Area
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Cultivation Area** |
| **Actor** | User |
| **Brief Description** | User removes an area. |
| **Pre-conditions** | User owns the area. Warning: Deleting area might affect associated activities/devices. |
| **Basic Flows** | 1. User selects an Area.<br>2. User clicks "Delete".<br>3. System warns about cascading effects (if any).<br>4. User confirms.<br>5. System deletes area.<br>6. System removes area from UI. |
| **Alternative Flows** | **A1. Restriction:**<br>1. Area has active devices/installations.<br>2. System prevents delete and asks user to remove devices first. |
| **Post-conditions** | Area removed. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Add Cultivation Area

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as AreaController
    participant SVC as AreaService
    participant DB as Database

    U->>FE: Fill Area Form -> Submit
    FE->>CTL: POST /api/areas
    CTL->>SVC: create(userId, dto)
    
    SVC->>DB: Validate Farm Ownership
    SVC->>DB: Insert Area Record
    DB-->>SVC: Success
    SVC-->>CTL: Return New Area
    CTL-->>FE: Success JSON
    FE-->>U: Show "Area Created"
```

### 3.2 Sequence Diagram: Edit Cultivation Area

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as AreaController
    participant SVC as AreaService
    participant DB as Database

    U->>FE: Edit Area Info -> Save
    FE->>CTL: PUT /api/areas/:id
    CTL->>SVC: update(id, userId, dto)
    
    SVC->>DB: Update Record
    DB-->>SVC: Success
    SVC-->>CTL: Return Updated Area
    CTL-->>FE: Success JSON
    FE-->>U: Show "Area Updated"
```

### 3.3 Sequence Diagram: Delete Cultivation Area

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as AreaController
    participant SVC as AreaService
    participant DB as Database

    U->>FE: Click Delete -> Confirm
    FE->>CTL: DELETE /api/areas/:id
    CTL->>SVC: delete(id, userId)
    
    SVC->>DB: Check Dependencies (Active Devices)
    alt No Dependencies
        SVC->>DB: Delete Record
        DB-->>SVC: Success
        SVC-->>CTL: Return Success
        CTL-->>FE: Success JSON
        FE-->>U: Remove from List
    else Has Dependencies
        SVC-->>CTL: Throw BadRequestException
        CTL-->>FE: Error Response
        FE-->>U: Show Error Message
    end
```
