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
    participant BE as API
    participant DB as Database

    U->>FE: Click "New Request"
    FE-->>U: Show Form
    U->>FE: Select Area, Type, Notes -> Submit
    FE->>BE: POST /api/installation-requests
    BE->>BE: Validate Data
    BE->>DB: Insert Request (Status=PENDING)
    DB-->>BE: Success
    BE-->>FE: Return Request Object
    FE-->>U: Show "Request Submitted"
```

### 3.2 Sequence Diagram: Edit Installation Request

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Edit Request -> Save
    FE->>BE: PUT /api/installation-requests/:id
    BE->>DB: Fetch Current Status
    alt Status is PENDING
        BE->>DB: Update Request Details
        DB-->>BE: Success
        BE-->>FE: Success Message
        FE-->>U: Show "Updated Successfully"
    else Status is ASSIGNED/COMPLETED
        BE-->>FE: Error "Cannot edit processed request"
        FE-->>U: Show Error
    end
```

### 3.3 Sequence Diagram: Cancel Installation Request

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database

    U->>FE: Click Cancel -> Confirm
    FE->>BE: PATCH /api/installation-requests/:id/cancel
    BE->>DB: Fetch Current Status
    alt Status is PENDING
        BE->>DB: Update Status = CANCELLED
        DB-->>BE: Success
        BE-->>FE: Success Message
        FE-->>U: Show "Request Cancelled"
    else Status cannot be cancelled
        BE-->>FE: Error "Cannot cancel this request"
        FE-->>U: Show Error
    end
```
