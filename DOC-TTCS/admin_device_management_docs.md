# Admin Device Management Documentation
---2.1.2.14---
## 1. Actors
- **Admin**: Manages the inventory of IoT devices (sensors, controllers) in the system.
- **Backend API (NestJS)**: `DeviceInventoryController`, `DeviceService`.
- **Database**: Stores `Device` records.

## 2. Use Case Specifications

### UC-DEV-01: Add New Device
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Add New Device** |
| **Actor** | Admin |
| **Brief Description** | Admin registers a new physical device into the system inventory. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin navigates to "Device Inventory".<br>2. Admin clicks "Add Device".<br>3. Admin enters **Serial Number**, **Name**, and **Type** (Sensor/Controller).<br>4. Admin submits form.<br>5. System validates uniqueness of Serial Number.<br>6. System creates device with status `AVAILABLE`.<br>7. System displays success message. |
| **Alternative Flows** | **A1. Duplicate Serial:**<br>1. System finds existing serial.<br>2. Error "Device already exists". |
| **Post-conditions** | New device created with status `AVAILABLE`. |

### UC-DEV-02: Search  Devices
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Devices** |
| **Actor** | Admin |
| **Brief Description** | Admin searches for devices by Name/Serial or filters by Status. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin enters keyword (Name/Serial) or selects Status (Active/Available/Inactive).<br>2. System filters the list based on criteria (Client-side or Server-side).<br>3. System displays matching devices. |
| **Post-conditions** | Filtered list displayed. |

### UC-DEV-03: Edit Device Information
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Device Information** |
| **Actor** | Admin |
| **Brief Description** | Admin updates device details (Name, Type). |
| **Pre-conditions** | Device exists. |
| **Basic Flows** | 1. Admin selects a device.<br>2. Admin clicks "Edit".<br>3. Admin updates fields (e.g., Name).<br>4. System saves changes.<br>5. System displays success. |
| **Post-conditions** | Device info updated. |

### UC-DEV-04: Deactivate Device (Soft Disable)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Deactivate Device** |
| **Actor** | Admin |
| **Brief Description** | Admin temporarily disables a device without removing it from the system. |
| **Pre-conditions** | Device exists and is currently `ACTIVE` or `AVAILABLE`. |
| **Basic Flows** | 1. Admin selects a device.<br>2. Admin clicks "Deactivate".<br>3. System updates Device Status to `INACTIVE` and `isActive = false`.<br>4. System cuts off MQTT communication (conceptually).<br>5. System displays success message. |
| **Post-conditions** | Device record remains in DB but status is `INACTIVE`. History is preserved. |

### UC-DEV-05: Delete Device (Hard Remove)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Device** |
| **Actor** | Admin |
| **Brief Description** | Admin permanently removes a device from the system. |
| **Pre-conditions** | Device exists. **Warning: Irreversible action.** |
| **Basic Flows** | 1. Admin selects a device.<br>2. Admin clicks "Delete".<br>3. Admin confirms confirmation dialog ("Are you sure? This cannot be undone.").<br>4. System permanently removes the Device record from the Database.<br>5. System cascades delete to related Sensor Data (if configured).<br>6. System displays success message. |
| **Post-conditions** | Device record is deleted. Data may be lost. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Add Device

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as DeviceInventoryController
    participant SVC as DeviceService
    participant DB as Database

    A->>FE: Click "Add Device" -> Enter Info
    FE->>CTL: POST /admin/device-inventory
    CTL->>SVC: createInventoryDevice(serial, type, name)
    
    SVC->>DB: Check Duplicate Serial
    alt Duplicate
        DB-->>SVC: Exists
        SVC-->>CTL: Error "Duplicate Serial"
        FE-->>A: Show Error
    else New
        SVC->>DB: Create Device (Status=AVAILABLE)
        DB-->>SVC: Success
        SVC-->>CTL: Return New Device
        CTL-->>FE: Success
        FE-->>A: Show "Device Added"
    end
```

### 3.2 Sequence Diagram: Search & Filter Devices

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as DeviceInventoryController
    participant SVC as DeviceService
    participant DB as Database

    A->>FE: Open Inventory
    FE->>CTL: GET /admin/device-inventory
    CTL->>SVC: findAll()
    SVC->>DB: Fetch All Devices
    DB-->>SVC: Return List
    SVC-->>CTL: Return List
    CTL-->>FE: JSON Response
    
    note right of FE: Client-side Filter
    A->>FE: Enter "Sensor 1" or Filter "ACTIVE"
    FE->>FE: Filter List by properties
    FE-->>A: Display Filtered Results
```

### 3.3 Sequence Diagram: Edit Device

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as DeviceInventoryController
    participant SVC as DeviceService
    participant DB as Database

    A->>FE: Click Edit -> Update Name
    FE->>CTL: PUT /admin/device-inventory/:id
    CTL->>SVC: update(id, body)
    
    SVC->>DB: Update Record
    DB-->>SVC: Success
    SVC-->>CTL: Return Updated Device
    FE-->>A: Show "Updated Successfully"
```

### 3.4 Sequence Diagram: Deactivate Device (Soft)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as DeviceInventoryController
    participant SVC as DeviceService
    participant DB as Database

    A->>FE: Click Deactivate
    FE->>CTL: PUT /admin/device-inventory/:id
    note right of FE: Request Body: { status: 'INACTIVE', isActive: false }
    CTL->>SVC: update(id, body)
    
    SVC->>DB: Update (Set Status = INACTIVE)
    DB-->>SVC: Success
    SVC-->>CTL: Return Success
    FE-->>A: Show "Device Deactivated"
```

### 3.5 Sequence Diagram: Delete Device (Hard)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as DeviceInventoryController
    participant SVC as DeviceService
    participant DB as Database

    A->>FE: Click Delete -> Confirm Warning
    FE->>CTL: DELETE /admin/device-inventory/:id
    CTL->>SVC: delete(id)
    
    SVC->>DB: Remove Record (DELETE FROM devices...)
    DB-->>SVC: Success
    SVC-->>CTL: Return Success
    FE-->>A: Show "Device Deleted"
```
