# Subscription Management Documentation
-----2.1.2.10-----
## 1. Actors
- **User (Farmer)**: Registers for Premium Subscription.
- **Web App**: Frontend initiating payment.
- **Payment Service (API)**: Handles payment URL creation, callback verification, and activation.
- **VNPAY Gateway**: External Payment Provider.
- **User Service**: Updates user subscription status.

## 2. Use Case Specifications

### UC-SUB-01: Đăng ký gói trả phí
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Đăng ký gói trả phí** |
| **Actor** | User |
| **Brief Description** | User upgrades account to Premium (Monthly/Yearly) via database payment (VNPAY). |
| **Pre-conditions** | User is logged in. User has completed **Hardware Installation** (validated by `InstallationRequestStatus`). |
| **Basic Flows** | 1. User selects "Upgrade to Premium" on Pricing Page.<br>2. User chooses Plan (Monthly: 200k, Yearly: 2M).<br>3. User clicks "Pay with VNPAY".<br>4. System validates hardware installation.<br>5. System creates Pending Transaction.<br>6. System generates VNPAY Payment URL.<br>7. System redirects User to VNPAY.<br>8. User completes payment on VNPAY.<br>9. VNPAY redirects back to `vnpay-return`.<br>10. System verifies checksum and payment status.<br>11. System updates Transaction to SUCCESS.<br>12. System activates Premium Plan for User.<br>13. Dashboard shows "Premium Active". |
| **Alternative Flows** | **A1. No Hardware:**<br>1. User tries to upgrade.<br>2. System checks `InstallationRequest`.<br>3. System throws Forbidden: "Please install hardware first".<br>4. UI shows error.<br><br>**A2. Payment Failed/Cancelled:**<br>1. User cancels at VNPAY.<br>2. VNPAY returns error code.<br>3. System marks Transaction FAILED.<br>4. UI shows "Payment Failed". |
| **Post-conditions** | User status becomes `PREMIUM`. Transaction recorded. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Subscribe to Premium (VNPAY Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant PC as PaymentController
    participant PS as PaymentService
    participant US as UsersService
    participant DB as Database
    participant VNP as VNPAY Gateway

    U->>FE: Select Plan (Monthly/Yearly) -> Click Pay
    FE->>PC: POST /payment/create-url { plan: 'MONTHLY' }
    PC->>PS: createSubscriptionPaymentUrl(userId, plan)
    
    PS->>DB: Check InstallationRequest (Status=COMPLETED)
    alt No Hardware
        PS-->>PC: Error "Hardware required"
        PC-->>FE: Error Message
        FE-->>U: Show Error
    else Hardware Installed
        PS->>DB: Create Transaction (PENDING)
        PS->>PS: Generate VNPAY URL (Checksum)
        PS-->>PC: Return URL
        PC-->>FE: { url: "https://sandbox.vnpayment.vn/..." }
        FE-->>U: Redirect to VNPAY
    end
    
    U->>VNP: Enter Bank Info & Pay
    VNP-->>U: Redirect to Return URL
    
    U->>FE: GET /payment/return?vnp_ResponseCode=00...
    FE->>PC: GET /payment/vnpay-return
    PC->>PS: handleCallback(query)
    
    PS->>PS: Verify Checksum
    alt Success (Code 00)
        PS->>DB: Update Transaction (SUCCESS)
        PS->>US: activatePremiumSubscription(userId, plan)
        US->>DB: Update User (Plan=PREMIUM, Status=ACTIVE)
        PS-->>PC: { success: true }
        PC-->>FE: Redirect /payment/success
        FE-->>U: Show "Upgrade Successful"
    else Failed
        PS->>DB: Update Transaction (FAILED)
        PS-->>PC: { success: false }
        PC-->>FE: Redirect /payment/failed
        FE-->>U: Show "Payment Failed"
    end
```
