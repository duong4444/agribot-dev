# Profile Management Documentation
-----2.1.2.3-----
## 1. Actors
- **User (Farmer)**: The primary actor who manages their own profile information.

## 2. Use Case Specifications

### UC-PROF-01: Edit Personal Information
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Personal Information** |
| **Actor** | User |
| **Brief Description** | User updates their personal details such as name, phone number, and address. |
| **Pre-conditions** | User is logged in to the system. |
| **Basic Flows** | 1. User navigates to the "Settings" page.<br>2. System displays current user information.<br>3. User edits desired fields (e.g., Full Name, Phone Number, Address).<br>4. User clicks "Save Changes".<br>5. System validates the input data.<br>6. System updates the user record in the database.<br>7. System displays a success message "Profile updated successfully". |
| **Alternative Flows** | **A1. Validation Error:**<br>1. User leaves required fields empty or enters invalid format (e.g., invalid phone).<br>2. System displays specific error messages.<br><br>**A2. Network/Server Error:**<br>1. Update request fails due to connection issue.<br>2. System displays generic error "Could not save changes". |
| **Post-conditions** | User information is updated in the database and reflected in the UI. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Edit Personal Information

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App (Next.js)
    participant BE as API (NestJS)
    participant DB as Database (Postgres)

    U->>FE: Navigate to Settings
    FE->>BE: GET /api/users/profile
    BE->>DB: Fetch User Table (id, name, phone, etc.)
    DB-->>BE: Return User Data
    BE-->>FE: Display Profile Form
    
    U->>FE: Edit Fields (Name, Phone, Address)
    U->>FE: Click "Save Changes"
    FE->>BE: PUT /api/users/profile
    note right of FE: Payload: { name, phone, address }
    
    BE->>BE: Validate Input Data
    alt Validation Passed
        BE->>DB: Update User Record
        DB-->>BE: Success
        BE-->>FE: Return Updated Profile Object
        FE-->>U: Show Toast "Success" & Update View
    else Validation Failed
        BE-->>FE: Error 400 (Bad Request)
        FE-->>U: Show Validation Errors
    end
```
