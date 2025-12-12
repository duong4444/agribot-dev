# Subscription Management Documentation
-----2.1.2.18-----
## 1. Overview
The Subscription Management module allows Administrators to manage user subscription plans, statuses, credits, and expiration dates. This is critical for controlling access to Premium features (AI Chat, Advanced Farm Analytics).
## 2. Actors
- **Admin**: Has permissions to modify subscription data.
- **Web App**: The frontend interface for managing subscriptions.
- **System**: The backend API processing requests.
## 3. Use Case Specifications
### UC-SUB-01: View Subscription List
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Subscription List** |
| **Actor** | Admin |
| **Brief Description** | Admin views a list of users with their current subscription details. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin navigates to "Quản lý Gói Đăng Ký" (Subscription Management).<br>2. Web App sends request `GET /api/admin/users`.<br>3. System retrieves all users.<br>4. Web App displays list focusing on: User Name, Email, Plan (FREE/PREMIUM), Status (ACTIVE/INACTIVE/TRIAL), Credits, and Expiry Date. |
| **Alternative Flows** | **A1. No Data:** System returns empty list. |
| **Post-conditions** | Subscription list is displayed. |
### UC-SUB-02: Search Subscription
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search User's Subscription** |
| **Actor** | Admin |
| **Brief Description** | Admin searches for a specific subscription by User Name or Email (Client-side). |
| **Pre-conditions** | Admin is viewing the Subscription List. |
| **Basic Flows** | 1. System has loaded all users.<br>2. Admin enters a keyword in the Search Bar.<br>3. Web App filters the displayed list instantly checking: User Name, Email.<br>4. Web App updates the table to show matching results. |
| **Post-conditions** | List is filtered by keyword. |
### UC-SUB-03: Edit Subscription Status
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Subscription Status** |
| **Actor** | Admin |
| **Brief Description** | Admin manually updates a user's subscription plan, status, credits, or expiry date. |
| **Pre-conditions** | Admin is viewing the Subscription List. |
| **Basic Flows** | 1. Admin clicks "Edit" on a user row.<br>2. Web App opens "Quản lý gói cước" dialog.<br>3. Admin updates:<br>   - Plan (FREE/PREMIUM)<br>   - Status (ACTIVE/INACTIVE/TRIAL)<br>   - Credits (Number)<br>   - Expiry Date<br>4. Admin clicks "Lưu thay đổi" (Save).<br>5. System updates the user record.<br>6. Web App refreshes the list with new data. |
| **Alternative Flows** | **A1. Update Failed:** System returns error; UI shows error message. |
| **Post-conditions** | User's subscription data is updated in the Database. |
---
## 4. Sequence Diagrams
### 4.1 Sequence Diagram: View Subscription List
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionsPage)
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database
    A->>FE: Navigate to Subscriptions
    FE->>CTL: GET /api/admin/users
    CTL->>SVC: findAll()
    SVC->>DB: SELECT * FROM users
    DB-->>SVC: User List []
    SVC-->>CTL: User List []
    CTL-->>FE: JSON Data
    FE-->>A: Display Table (Plan/Status/Credits)
```
### 4.2 Sequence Diagram: Search Subscription (Client-side)
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionsPage)
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database
    A->>FE: Navigate to Subscriptions
    FE->>CTL: GET /api/admin/users
    CTL->>SVC: findAll()
    SVC->>DB: SELECT * FROM users
    DB-->>SVC: User List []
    SVC-->>CTL: User List []
    CTL-->>FE: JSON Data
    FE-->>A: Display Table
    
    A->>FE: Type user's name or user's email
    FE->>FE: Filter local list
    FE-->>A: Update displayed list instantly
```
### 4.3 Sequence Diagram: Edit Subscription Status
```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionsPage)
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database
    A->>FE: Click Edit -> Modify Status/Plan -> Save
    FE->>CTL: PUT /api/admin/users/:id
    CTL->>SVC: update(id, data)
    SVC->>DB: UPDATE users SET ...
    DB-->>SVC: Updated User
    SVC-->>CTL: Success
    CTL-->>FE: Success Message
    FE-->>A: Refresh List
```