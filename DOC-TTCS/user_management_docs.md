# User Management Documentation
-----2.1.2.16-----

## 1. Overview
The User Management module allows Administrators to manage all accounts in the system, including Farmers and Technicians. Features include creating accounts, updating information, assigning roles, deactivating access, and removing users permanently.

## 2. Actors
- **Admin**: Has full access to manage users.
- **Web App**: The frontend interface for interacting with the system.
- **System**: The backend API processing requests.

## 3. Use Case Specifications

### UC-USR-01: View Account List
| Feature | Description |
| :--- | :--- |
| **Use Case** | **View Account List** |
| **Actor** | Admin |
| **Brief Description** | Admin views the list of all registered users in the system. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin navigates to the User Management page.<br>2. Web App sends request to fetch all users.<br>3. System retrieves user data from Database.<br>4. Web App displays the list of users including Status and Role. |
| **Alternative Flows** | **A1. No Users:** System returns empty list; UI shows "No users found". |
| **Post-conditions** | List of users is displayed. |

### UC-USR-02: Search Account
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Search Account** |
| **Actor** | Admin |
| **Brief Description** | Admin searches for a Account by Username or Email (Client-side). |
| **Pre-conditions** | Admin is logged in and viewing the User List. |
| **Basic Flows** | 1. System has loaded the User List.<br>2. Admin enters keyword (Name or Email) in search bar.<br>3. Web App filters the displayed list instantly regardless of case.<br>*(Note: This is client-side filtering as implemented in `AdminUsersPage`)* |
| **Alternative Flows** | **A1. No Results:** UI displays empty table. |
| **Post-conditions** | Displayed list is filtered matching the keyword. |

### UC-USR-03: Create Account
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Create Account** |
| **Actor** | Admin |
| **Brief Description** | Admin manually adds a new Account to the system. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin clicks "Add User".<br>2. Admin enters Email, Password, Full Name, Phone, and Role.<br>3. Admin clicks "Create".<br>4. System validates unique Email.<br>5. System hashes password and saves User.<br>6. Web App refreshes the list. |
| **Alternative Flows** | **A1. Email Exists:** System returns conflict error; UI shows "Email already exists". |
| **Post-conditions** | New user account is created in Database. |

### UC-USR-04: Edit Account
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Account** |
| **Actor** | Admin |
| **Brief Description** | Admin updates Account's basic information (Name, Phone, Email). |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin selects "Edit" on a user.<br>2. Admin modifies Name, Phone, or Email.<br>3. Admin clicks "Save".<br>4. System updates the record.<br>5. Web App refreshes the list. |
| **Alternative Flows** | **A1. Invalid Data:** System rejects invalid email format. |
| **Post-conditions** | User information is updated. |

### UC-USR-05: Deactivate Account
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Deactivate Account** |
| **Actor** | Admin |
| **Brief Description** | Admin temporarily disables a user account, preventing login. |
| **Pre-conditions** | Admin is logged in. User is currently Active. |
| **Basic Flows** | 1. Admin selects "Deactivate" from actions menu.<br>2. Web App sends request to set `isActive = false`.<br>3. System updates user status.<br>4. Web App updates status badge to "Inactive". |
| **Alternative Flows** | **A1. Already Inactive:** Action not available or System returns current state. |
| **Post-conditions** | User `isActive` is false; User cannot log in. |

### UC-USR-06: Assign Role (Authorization)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Assign Role** |
| **Actor** | Admin |
| **Brief Description** | Admin changes a user's role (e.g., Farmer to Technician). |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin selects "Change Role".<br>2. Admin chooses new Role (ADMIN, FARMER, TECHNICIAN) from dropdown.<br>3. Admin confirms.<br>4. System updates user role.<br>5. Web App reflects the change. |
| **Post-conditions** | User permissions are updated defined by the new Role. |

### UC-USR-07: Delete Account
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Account** |
| **Actor** | Admin |
| **Brief Description** | Admin permanently removes a user and their data. |
| **Pre-conditions** | Admin is logged in. |
| **Basic Flows** | 1. Admin clicks "Delete" icon.<br>2. Admin confirms warning ("Irreversible action").<br>3. System deletes User and cascades to related data (Farms, Requests).<br>4. Web App removes user from list. |
| **Post-conditions** | User data is permanently removed from Database. |

---

## 4. Sequence Diagrams

### 4.1 Sequence Diagram: View User List

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminUsersPage)
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Navigate to User Management
    FE->>CTL: GET /api/admin/users
    CTL->>SVC: findAll()
    SVC->>DB: SELECT * FROM users
    DB-->>SVC: User List []
    SVC-->>CTL: User List []
    CTL-->>FE: JSON { data: [...] }
    FE-->>A: Display Table
```

### 4.2 Sequence Diagram: Search Account (Client-side)

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminUsersPage)
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Navigate to User Management
    FE->>CTL: GET /api/admin/users
    CTL->>SVC: findAll()
    SVC->>DB: SELECT * FROM users
    DB-->>SVC: User List []
    SVC-->>CTL: User List []
    CTL-->>FE: JSON User List
    
    A->>FE: Type "Nguyen" in Search Bar
    FE->>FE: Filter local array (name/email match "Nguyen")
    FE-->>A: Update displayed list instantly
```

### 4.3 Sequence Diagram: Create User

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Click Add -> Fill Details -> Submit
    FE->>CTL: POST /api/admin/users
    CTL->>SVC: create(dto)
    SVC->>DB: Check Email Uniqueness
    SVC->>SVC: Hash Password
    SVC->>DB: INSERT into users
    DB-->>SVC: User Entity
    SVC-->>CTL: Success
    CTL-->>FE: Success Message
    FE-->>A: Add to List
```

### 4.4 Sequence Diagram: Edit User

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Edit User -> Modified Info -> Save
    FE->>CTL: PUT /api/admin/users/:id
    CTL->>SVC: update(id, data)
    SVC->>DB: UPDATE users SET ...
    DB-->>SVC: Updated User
    SVC-->>CTL: Success
    CTL-->>FE: Success Message
    FE-->>A: Update Row in Table
```

### 4.5 Sequence Diagram: Deactivate User

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Select user to deactive
    FE->>CTL: PUT /api/admin/users/:id/deactivate
    CTL->>SVC: deactivate(id)
    SVC->>DB: UPDATE users SET isActive = false
    DB-->>SVC: Updated User
    SVC-->>CTL: Success
    CTL-->>FE: Show "Deactivate Success"
    FE-->>A: Update Status Badge
```

### 4.6 Sequence Diagram: Assign Role

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Action -> Change Role -> Select Role -> Save
    FE->>CTL: PUT /api/admin/users/:id/role
    CTL->>SVC: changeRole(id, role)
    SVC->>DB: UPDATE users SET role = :role
    DB-->>SVC: Updated User
    SVC-->>CTL: Success
    CTL-->>FE: Update Role Badge
```

### 4.7 Sequence Diagram: Delete User

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    A->>FE: Action -> Delete -> Confirm
    FE->>CTL: DELETE /api/admin/users/:id
    CTL->>SVC: delete(id)
    SVC->>DB: Check existence
    SVC->>DB: DELETE FROM users (Cascade)
    DB-->>SVC: Success
    SVC-->>CTL: Success
    CTL-->>FE: Remove Row from Table
```
