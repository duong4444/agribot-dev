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
    participant FE as Web App
    participant CTL as UsersController
    participant SVC as UsersService
    participant DB as Database

    U->>FE: Edit Fields -> Click "Save"
    FE->>CTL: PUT /api/users/profile (body: name, phone)
    CTL->>SVC: updateProfile(userId, updateDto)
    
    SVC->>SVC: Validate Input Data
    alt Validation Passed
        SVC->>DB: Update User Record
        DB-->>SVC: Success
        SVC-->>CTL: Return Updated User
        CTL-->>FE: Success Message
        FE-->>U: Show "Profile Updated"
    else Validation Failed
        SVC-->>CTL: Throw BadRequestException
        CTL-->>FE: Error 400
        FE-->>U: Show Validation Errors
    end
```
