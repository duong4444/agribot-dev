# Installation Request Management Documentation
-----2.1.2.7-----
## 1. Actors
- **User (Farmer)**: Requests IoT installation services for their farm.

## 2. Use Case Specifications

### UC-REQ-01: Create Installation Request
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Create Installation Request** |
| **Actor** | User |
| **Brief Description** | User submits a request to install IoT devices in a specific area. |
| **Pre-conditions** | User is logged in and has a farm/area. |
| **Basic Flows** | 1. User navigates to "Installation Requests".<br>2. User clicks "New Request".<br>3. User selects **Target Area**.<br>4. User enters **Device Type** needed (e.g., Pump, Sensor) and **Notes**.<br>5. User clicks "Submit".<br>6. System creates request with status "PENDING".<br>7. System notifies Admin.<br>8. System displays confirmation. |
| **Alternative Flows** | **A1. Validation Error:**<br>1. Missing area or description.<br>2. System shows error. |
| **Post-conditions** | Request exists in "PENDING" state. |

### UC-REQ-02: Edit Installation Request
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Installation Request** |
| **Actor** | User |
| **Brief Description** | User updates details of a pending request. |
| **Pre-conditions** | Request is in "PENDING" status. (Cannot edit if "ASSIGNED" or "COMPLETED"). |
| **Basic Flows** | 1. User selects a Pending Request.<br>2. User clicks "Edit".<br>3. User modifies details (e.g., change notes or area).<br>4. User clicks "Update".<br>5. System validates status is still PENDING.<br>6. System saves changes.<br>7. System shows success. |
| **Alternative Flows** | **A1. Status Changed:**<br>1. Admin assigned technician while user was editing.<br>2. System prevents update: "Cannot edit processed request". |
| **Post-conditions** | Request details updated. |

### UC-REQ-03: Cancel Installation Request
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Cancel Installation Request** |
| **Actor** | User |
| **Brief Description** | User withdraws a request before it is processed. |
| **Pre-conditions** | Request is in "PENDING" status. |
| **Basic Flows** | 1. User selects a Pending Request.<br>2. User clicks "Cancel".<br>3. User confirms action.<br>4. System updates status to "CANCELLED".<br>5. System displays success message. |
| **Alternative Flows** | **A1. Already Processed:**<br>1. Request is already ASSIGNED.<br>2. System shows error "Cannot cancel progressed request". |
| **Post-conditions** | Request status becomes "CANCELLED". |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Create Installation Request

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as InstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database

    U->>FE: Fill Request Form -> Submit
    FE->>CTL: POST /api/installation-requests
    CTL->>SVC: create(userId, dto)
    
    SVC->>DB: Verify Area Ownership
    alt Valid Area
        SVC->>DB: Insert Request (Status=PENDING)
        DB-->>SVC: Success
        SVC-->>CTL: Return Created Request
        CTL-->>FE: Success JSON
        FE-->>U: Show "Request Submitted"
    else Invalid Area
        SVC-->>CTL: Throw Forbidden/NotFound
        CTL-->>FE: Error Response
        FE-->>U: Show Error Message
    end
```

### 3.2 Sequence Diagram: Edit Installation Request

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as InstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database

    U->>FE: Update Details -> Click Save
    FE->>CTL: PUT /api/installation-requests/:id
    CTL->>SVC: update(id, userId, dto)
    
    SVC->>DB: Fetch Request & Check Status
    alt Status is PENDING
        SVC->>DB: Update Details
        DB-->>SVC: Success
        SVC-->>CTL: Return Updated Request
        CTL-->>FE: Success JSON
        FE-->>U: Show "Success"
    else Processed
        SVC-->>CTL: Throw BadRequestException
        CTL-->>FE: Error Response
        FE-->>U: Show "Cannot edit processed request"
    end
```

### 3.3 Sequence Diagram: Cancel Installation Request

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as InstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database

    U->>FE: Click Cancel -> Confirm
    FE->>CTL: PATCH /api/installation-requests/:id/cancel
    CTL->>SVC: cancel(id, userId)
    
    SVC->>DB: Fetch Request & Check Status
    alt Status is PENDING
        SVC->>DB: Update Status = CANCELLED
        DB-->>SVC: Success
        SVC-->>CTL: Return Success
        CTL-->>FE: Success JSON
        FE-->>U: Show "Request Cancelled"
    else Cannot Cancel
        SVC-->>CTL: Throw BadRequestException
        CTL-->>FE: Error Response
        FE-->>U: Show Error Message
    end
```
