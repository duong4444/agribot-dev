# Authentication Module Documentation
------2.1.2-----2.1.2.1----2.1.2.2-----
## 1. Actors
- **User (Farmer)**: Can Register, Login (Email/Google), Logout, Forgot Password, Change Password.
- **Technician**: Can Login (Email only), Logout, Change Password.
- **Admin**: Can Login (Email only), Logout, Change Password.

---

## 2. Use Case Specifications

### UC-AUTH-01: User Registration 
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Register Account** |
| **Actor** | User |
| **Brief Description** | User creates a new account to use the system. |
| **Pre-conditions** | User is not logged in. |
| **Basic Flows** | 1. User enters Full Name, Email, Password, Phone.<br>2. User submits form.<br>3. System validates input (email format, uniqueness).<br>4. System creates account.<br>5. System logs user in or redirects to login. |
| **Alternative Flows** | **A1. Email Exists:**<br>1. System detects email is taken.<br>2. System shows error "Email already exists".<br><br>**A2. Validation Error:**<br>1. Password too-weak or invalid email.<br>2. System shows validation error. |
| **Post-conditions** | Account created in database. |

### UC-AUTH-02: System Login
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Login** |
| **Actor** | User, Admin, Technician |
| **Brief Description** | Actors authenticate to access protected features. |
| **Pre-conditions** | Account exists. |
| **Basic Flows** | 1. Actor enters Email and Password.<br>2. System validates credentials.<br>3. System determines logic based on role (Admin/Tech/User).<br>4. System generates JWT Access Token.<br>5. System redirects to Dashboard (User/Farm or Admin Panel). |
| **Alternative Flows** | **A1. Invalid Credentials:**<br>1. Password mismatch.<br>2. System shows "Invalid email or password".<br><br>**A2. Login via Google (User Only):**<br>1. User clicks "Login with Google".<br>2. Redirects to Google OAuth.<br>3. Google returns profile.<br>4. System creates account (if new) or logs in.<br>5. Redirects to Dashboard. |
| **Post-conditions** | Actor is authenticated; Session active. |

### UC-AUTH-03: System Logout
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Logout** |
| **Actor** | User, Admin, Technician |
| **Brief Description** | Terminate current session. |
| **Pre-conditions** | Actor is logged in. |
| **Basic Flows** | 1. Actor clicks "Logout".<br>2. System invalidates session/token (client-side removal).<br>3. System redirects to Login page. |
| **Post-conditions** | Actor is unauthenticated. |

### UC-AUTH-04: Forgot Password
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Forgot Password** |
| **Actor** | User Only |
| **Brief Description** | Recover account access via email reset. |
| **Pre-conditions** | User is not logged in. |
| **Basic Flows** | 1. User enters Email.<br>2. System verifies email existence.<br>3. System generates reset token.<br>4. System sends email with Reset Link.<br>5. User clicks link -> Enters New Password.<br>6. System updates password. |
| **Alternative Flows** | **A1. Email Not Found:**<br>1. System shows generic success message (security) or error. |
| **Post-conditions** | Password updated. |

### UC-AUTH-05: Change Password
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Change Password** |
| **Actor** | User, Technician, Admin |
| **Brief Description** | Authenticated user changes their password. |
| **Pre-conditions** | User/Technician/Admin is logged in. |
| **Basic Flows** | 1. User enters Old Password and New Password.<br>2. System validates Old Password.<br>3. System validates New Password rules.<br>4. System updates password hash.<br>5. System confirms success. |
| **Alternative Flows** | **A1. Wrong Old Password:**<br>1. System rejects change. |
| **Post-conditions** | Password key updated. |

---

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: User Registration

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as AuthController
    participant SVC as AuthService
    participant DB as Database

    U->>FE: Submit Registration Form
    FE->>CTL: POST /auth/register
    CTL->>SVC: register(dto)
    
    SVC->>DB: Check Email Existence
    alt Email already used
        SVC-->>CTL: ConflictException
        CTL-->>FE: Error 409
        FE-->>U: Show "Email exists"
    else Available
        SVC->>SVC: Hash Password
        SVC->>DB: Create User
        DB-->>SVC: Success
        SVC-->>CTL: Return User/Token
        CTL-->>FE: JSON Response
        FE-->>U: Redirect to Dashboard
    end
```

### 3.2 Sequence Diagram: Login (Standard & Google)

```mermaid
sequenceDiagram
    participant A as Actor
    participant FE as Web App
    participant CTL as AuthController
    participant SVC as AuthService
    participant G as Google OAuth
    participant DB as Database

    alt Email/Password
        A->>FE: Submit Login
        FE->>CTL: POST /auth/login
        CTL->>SVC: validateUser()
        SVC->>DB: Verify Creds
        alt Valid
            SVC->>SVC: Generate JWT
            SVC-->>CTL: Token
            CTL-->>FE: Token
            FE-->>A: Dashboard
        else Invalid
            SVC-->>CTL: Unauthorized
            CTL-->>FE: Error 401
            FE-->>A: "Invalid ID/Pass"
        end
    else Google Login
        A->>FE: Click "Login with Google"
        FE->>G: Redirect to OAuth
        G-->>FE: Callback with Code
        FE->>CTL: POST /auth/google/callback
        CTL->>SVC: googleLogin(code)
        SVC->>G: Get Profile
        SVC->>DB: Find/Create User
        SVC->>SVC: Generate JWT
        SVC-->>CTL: Token
        CTL-->>FE: Token
        FE-->>A: Dashboard
    end
```

### 3.3 Sequence Diagram: Forgot Password

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as AuthController
    participant SVC as AuthService
    participant DB as Database
    participant M as Email Service

    U->>FE: Submit Email
    FE->>CTL: POST /auth/forgot-password
    CTL->>SVC: forgotPassword(email)
    SVC->>DB: Find User
    alt Exists
        SVC->>M: Send Link
        M-->>U: Email sent
    end
    SVC-->>CTL: Success
    CTL-->>FE: Success
    FE-->>U: "Check your email"
    
    note right of U: User clicks link & enters new pass
    U->>FE: Submit New Password
    FE->>CTL: POST /auth/reset-password
    CTL->>SVC: resetPassword(token, newPass)
    SVC->>DB: Update Password
    SVC-->>CTL: Success
    CTL-->>FE: Success
    FE-->>U: Redirect to Login
```

### 3.4 Sequence Diagram: Change Password

```mermaid
sequenceDiagram
    participant A as Actor
    participant FE as Web App
    participant CTL as AuthController
    participant SVC as AuthService
    participant DB as Database

    A->>FE: Submit Old & New Pass
    FE->>CTL: POST /auth/change-password
    CTL->>SVC: changePassword(userId, dto)
    SVC->>DB: Verify Old Pass & Update New
    alt Success
        DB-->>SVC: Done
        SVC-->>CTL: Success
        CTL-->>FE: Success
        FE-->>A: Toast "Password Changed"
    else Fail
        SVC-->>CTL: Error
        CTL-->>FE: Error
        FE-->>A: Error Message
    end
```

### 3.5 Sequence Diagram: Logout

```mermaid
sequenceDiagram
    participant A as Actor
    participant FE as Web App
    participant CTL as AuthController
    participant SVC as AuthService

    A->>FE: Click Logout
    FE->>CTL: POST /auth/logout
    CTL->>SVC: logout(userId)
    SVC-->>CTL: Success
    CTL-->>FE: Success
    FE->>FE: Clear Tokens/Cookies
    FE-->>A: Redirect to Login
```
