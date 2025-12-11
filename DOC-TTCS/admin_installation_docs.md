# Admin Installation Management Documentation
---2.1.2.13---
## 1. Actors
- **Admin**: Manages the overall installation process, assigns technicians, and oversees request statuses.
- **Backend API (NestJS)**: `AdminInstallationRequestController`.
- **Database**: Stores `InstallationRequest` and `User` (Technician) records.
## 2. Use Case Specifications
### UC-ADMIN-01: View Installation Requests
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Installation Requests** |
| **Actor** | Admin |
| **Brief Description** | Admin views a list of all installation requests in the system. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin navigates to "Installation Requests".<br>2. System fetches all requests from the database.<br>3. System sorts requests (e.g., newest first).<br>4. System displays the list with summary details (Farmer, Status, Date). |
| **Post-conditions** | Admin sees the list of all requests. |
### UC-ADMIN-02: Assign Technician
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Assign Technician** |
| **Actor** | Admin |
| **Brief Description** | Admin assigns a specific Technician to handle a pending installation request. |
| **Pre-conditions** | Request status is `PENDING` or `ASSIGNED`. Technician exists in system. |
| **Basic Flows** | 1. Admin selects a Request.<br>2. Admin clicks "Assign Technician".<br>3. System shows list of available Technicians.<br>4. Admin selects a Technician and confirms.<br>5. System updates request with `assignedTechnicianId` and sets status `ASSIGNED`.<br>6. System displays success message. |
| **Alternative Flows** | **A1. Technician Invalid:**<br>1. System checks ID implies not a technician.<br>2. Error "Invalid role". |
| **Post-conditions** | Request status becomes `ASSIGNED`. Technician is notified (conceptually). |
### UC-ADMIN-03: Cancel Request
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Cancel Request** |
| **Actor** | Admin |
| **Brief Description** | Admin cancels a request due to invalid info or other reasons. |
| **Pre-conditions** | Request is NOT `COMPLETED` or `CANCELLED`. |
| **Basic Flows** | 1. Admin selects a Request.<br>2. Admin clicks "Cancel".<br>3. Admin confirms action.<br>4. System updates status to `CANCELLED`.<br>5. System displays success message. |
| **Post-conditions** | Request status becomes `CANCELLED`. |
### UC-ADMIN-04: Search Installation Requests
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Installation Requests** |
| **Actor** | Admin |
| **Brief Description** | Admin filters the installation requests list by **Farmer Name** or **Farm Name**. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin enters keywords (e.g., "Nguyen Van A", "Green Farm").<br>2. System filters the displayed list based on the input.<br>3. System displays only the requests matching the Farmer Name or Farm Name. |
| **Alternative Flows** | **A1. No Matches:**<br>1. System finds no records matching criteria.<br>2. System displays "No requests found". |
| **Post-conditions** | Displayed list is filtered. |
## 3. Sequence Diagrams
### 3.1 Sequence Diagram: View Requests
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as AdminInstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database
    A->>FE: Open "Installation Requests" Page
    FE->>CTL: GET /admin/installation-requests
    CTL->>SVC: findAll()
    
    SVC->>DB: Find All (Relations: Farmer, Farm, Technician)
    DB-->>SVC: Return All Requests
    
    SVC-->>CTL: Return List
    
    note right of FE: List includes Farmer Name & Farm Name
    CTL-->>FE: JSON Response
    FE-->>A: Display Request List
```
### 3.2 Sequence Diagram: Assign Technician
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as AdminInstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database
    A->>FE: Select Tech -> Click Assign
    FE->>CTL: PUT /admin/installation-requests/:id/assign
    CTL->>SVC: assignTechnician(id, dto)
    
    SVC->>DB: Validate Technician (Role=TECHNICIAN)
    alt Valid
        SVC->>DB: Update Request (TechnicianId, Status=ASSIGNED)
        DB-->>SVC: Success
        SVC-->>CTL: Return Updated Request
        CTL-->>FE: Success Message
        FE-->>A: Show "Assigned Successfully"
    else Invalid Role/Not Found
        SVC-->>CTL: Throw NotFound/BadRequest
        CTL-->>FE: Error Message
    end
```
### 3.3 Sequence Diagram: Cancel Request
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as AdminInstallationRequestController
    participant SVC as InstallationRequestService
    participant DB as Database
    A->>FE: Click Cancel -> Confirm
    FE->>CTL: PUT /admin/installation-requests/:id/cancel
    CTL->>SVC: cancelByAdmin(id)
    
    SVC->>DB: Find Request
    alt Not Completed/Cancelled
        SVC->>DB: Update Status = CANCELLED
        DB-->>SVC: Success
        SVC-->>CTL: Return Success
        FE-->>A: Show "Request Cancelled"
    else Already Cancelled/Completed
        SVC-->>CTL: Error Request
        FE-->>A: Show Error
    end
```
### 3.4 Sequence Diagram: Search Requests (By Name/Farm)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App

    A->>FE: Enter Keyword (e.g., "Nguyen Van A")
    FE->>FE: Retrieve Installation Requests from Local State
    FE->>FE: Apply Filter: Request.FarmerName or Request.FarmName includes Keyword
    
    alt Match Found
        FE-->>A: Update List UI with Matching Items
    else No Match
        FE-->>A: Show "No records found"
    end
```