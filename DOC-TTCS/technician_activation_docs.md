# Technician Device Activation Documentation
-----2.1.2.12-----
## 1. Actors
- **Technician**: Performs physical installation and activates the device in the system.
- **Backend API (NestJS)**: `TechnicianDeviceController`, `DeviceService`.
- **Database**: Updates `Device` and `InstallationRequest` records.

## 2. Use Case Specifications

### UC-TECH-02: Activate Device
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Activate Device** |
| **Actor** | Technician |
| **Brief Description** | Technician links a physical device (Serial Number) to a specific Farm Area and activates it. |
| **Pre-conditions** | Technician is logged in. Device is physically installed. |
| **Basic Flows** | 1. Technician scans/enters **Device Serial Number**.<br>2. Technician selects **Target Area** (filtered by Installation Assignment).<br>3. Technician confirms **Hardware Payment** status (if applicable).<br>4. Technician clicks "Activate".<br>5. System validates Serial Number (creates new if not exists in inventory).<br>6. System assigns Device to Area and sets Status = `ACTIVE`.<br>7. System updates `InstallationRequest` with payment status.<br>8. System returns success. |
| **Alternative Flows** | **A1. Already Active:**<br>1. System detects device is already ACTIVE.<br>2. Error: "Device already active".<br><br>**A2. Request Not Found:**<br>1. Technician tries to link to invalid request.<br>2. Error: "Invalid Installation Request". |
| **Post-conditions** | Device is online and associated with Farmer's Area. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Activate Device

```mermaid
sequenceDiagram
    participant T as Technician
    participant FE as Web App
    participant CTL as TechnicianDeviceController
    participant SVC as DeviceService
    participant DB as Database

    T->>FE: Enter Serial, Select Area -> Click Activate
    FE->>CTL: POST /technician/devices/activate
    CTL->>SVC: activateDevice(dto, technicianId)
    
    SVC->>DB: Find Device by Serial
    alt Device Not Found
        SVC->>DB: Create New Device (Status=AVAILABLE)
    end
    
    SVC->>DB: Check Status
    alt Already Active
        SVC-->>CTL: Error "Already Active"
        CTL-->>FE: Show Error
    else Available
        SVC->>DB: Update Device (AreaId, Status=ACTIVE, ActivatedBy)
        
        opt Update Installation Request
            SVC->>DB: Update Request (IsPaid=true)
        end
        
        DB-->>SVC: Success
        SVC-->>CTL: Return Activated Device
        CTL-->>FE: Success Message
        FE-->>T: Show "Activation Successful"
    end
```
