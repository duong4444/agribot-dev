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
    participant BE as API
    participant DB as Database

    U->>FE: Click "Add Area"
    FE-->>U: Show Form
    U->>FE: Enter Details (Name, Type) & Save
    FE->>BE: POST /api/areas
    BE->>BE: Validate & Check Farm Ownership
    BE->>DB: Insert Area Record
    DB-->>BE: Success
    BE-->>FE: Return Created Area
    FE-->>U: Show "Area Created"
```

### 3.2 Sequence Diagram: Edit Cultivation Area

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Edit Area Details -> Click Save
    FE->>BE: PUT /api/areas/:id
    BE->>DB: Update Record
    DB-->>BE: Success
    BE-->>FE: Return Updated Area
    FE-->>U: Show "Area Updated"
```

### 3.3 Sequence Diagram: Delete Cultivation Area

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Click Delete -> Confirm
    FE->>BE: DELETE /api/areas/:id
    BE->>DB: Check Dependencies (Devices/Activities)
    alt No Dependencies
        BE->>DB: Delete Record
        DB-->>BE: Success
        BE-->>FE: Success Message
        FE->>FE: Update List
    else Has Dependencies
        BE-->>FE: Error "Cannot delete area with active devices"
        FE-->>U: Show Error
    end
```
