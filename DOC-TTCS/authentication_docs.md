# Authentication Module Documentation
------2.1.2-----2.1.2.1----2.1.2.2-----
## 1. Actors
- **User (Farmer)**: Can Register, Login (Email/Google), Logout, Forgot Password, Change Password.
- **Technician**: Can Login (Email only), Logout, Change Password.
- **Admin**: Can Login (Email only), Logout.

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
| **Actor** | User, Technician |
| **Brief Description** | Authenticated user changes their password. |
| **Pre-conditions** | User/Technician is logged in. |
| **Basic Flows** | 1. User enters Old Password and New Password.<br>2. System validates Old Password.<br>3. System validates New Password rules.<br>4. System updates password hash.<br>5. System confirms success. |
| **Alternative Flows** | **A1. Wrong Old Password:**<br>1. System rejects change. |
| **Post-conditions** | Password key updated. |

---

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: User Registration

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App (Next.js)
    participant BE as API (NestJS)
    participant DB as Database (Postgres)

    U->>FE: Click "Register"
    FE-->>U: Show Registration Form
    U->>FE: Input Info (Name, Email, Pass) & Submit
    FE->>BE: POST /auth/register
    BE->>DB: Check if Email Exists
    alt Email already used
        DB-->>BE: User Found
        BE-->>FE: Error "Email already exists"
        FE-->>U: Display Error
    else Email available
        BE->>BE: Hash Password
        BE->>DB: Create User Record
        DB-->>BE: Success
        BE-->>FE: Return User Info / Token
        FE-->>U: Redirect to Dashboard
    end
```

### 3.2 Sequence Diagram: Login (Standard & Google)

```mermaid
sequenceDiagram
    participant A as Actor (User/Admin/Tech)
    participant FE as Web App
    participant BE as API
    participant G as Google OAuth
    participant DB as Database

    alt Email/Password Login
        A->>FE: Input Email/Pass & Click Login
        FE->>BE: POST /auth/login
        BE->>DB: Find User by Email
        DB-->>BE: Return User w/ Hash
        BE->>BE: Compare Passwords
        alt Valid
            BE->>BE: Generate JWT
            BE-->>FE: Return Token & User Role
            FE-->>A: Redirect to Dashboard
        else Invalid
            BE-->>FE: Error 401
            FE-->>A: Show "Invalid Credentials"
        end
    else Google Login (User Only)
        A->>FE: Click "Login with Google"
        FE->>G: Redirect to OAuth Provider
        G-->>FE: Callback with Auth Code
        FE->>BE: POST /auth/google/callback
        BE->>G: Exchange Code for Profile
        G-->>FE: Return Profile (Email, Name)
        BE->>DB: Find/Create User
        BE->>BE: Generate JWT
        BE-->>FE: Return Token
        FE-->>A: Redirect to Dashboard
    end
```

### 3.3 Sequence Diagram: Forgot Password (User Only)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant BE as API
    participant DB as Database
    participant M as Email Service

    U->>FE: Click "Forgot Password"
    FE-->>U: Show Email Input
    U->>FE: Submit Email
    FE->>BE: POST /auth/forgot-password
    BE->>DB: Find User
    alt User Exists
        BE->>DB: Save Reset Token
        BE->>M: Send Reset Link
        M-->>U: Email with Link
    end
    BE-->>FE: Show "Check your email" (Always return success to prevent enum)
    
    U->>FE: Click Link (w/ Token) & Input New Pass
    FE->>BE: POST /auth/reset-password
    BE->>DB: Validate Token & Update Password
    DB-->>BE: Success
    BE-->>FE: Success Message
    FE-->>U: Redirect to Login
```

### 3.4 Sequence Diagram: Change Password

```mermaid
sequenceDiagram
    participant A as Actor (User/Tech)
    participant FE as Web App
    participant BE as API
    participant DB as Database

    A->>FE: Navigate to Settings
    A->>FE: Submit Old Pass + New Pass
    FE->>BE: POST /auth/change-password
    BE->>DB: Fetch User Hash
    BE->>BE: Verify Old Pass
    alt Valid
        BE->>DB: Update New Password Hash
        DB-->>BE: Success
        BE-->>FE: Success Message
    else Invalid
        BE-->>FE: Error "Incorrect Old Password"
    end
```

### 3.5 Sequence Diagram: Logout

```mermaid
sequenceDiagram
    participant A as Actor (User/Admin/Tech)
    participant FE as Web App
    participant BE as API

    A->>FE: Click "Logout"
    FE->>BE: POST /auth/logout
    BE-->>FE: Success (Cookies/Session Cleared)
    FE->>FE: Remove Local Tokens
    FE-->>A: Redirect to Login Page
```
