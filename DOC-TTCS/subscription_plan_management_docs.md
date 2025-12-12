# Subscription Plan Management Documentation
-----2.1.2.19-----
## 1. Overview
The Subscription Plan Management module allows Administrators to create, edit, and delete subscription plan templates. These plans define the pricing, credits, and duration options available to users when purchasing subscriptions.

## 2. Actors
- **Admin**: Has full access to manage subscription plans.
- **Web App**: The frontend interface for plan management.
- **System**: The backend API processing requests.

## 3. Use Case Specifications

### UC-PLAN-03: Create Subscription Plan
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Create Subscription Plan** |
| **Actor** | Admin |
| **Brief Description** | Admin creates a new subscription plan template. |
| **Pre-conditions** | Admin is viewing the Plan List. |
| **Basic Flows** | 1. Admin clicks "Thêm gói mới" (Add New Plan).<br>2. Web App opens creation dialog.<br>3. Admin fills in:<br>   - Code (unique, e.g., MONTHLY, YEARLY)<br>   - Name (e.g., "Gói Tháng")<br>   - Description<br>   - Price (VNĐ)<br>   - Credits<br>   - Duration (days)<br>   - Display Order<br>   - Discount Percent<br>   - Badge Text<br>   - Is Popular (checkbox)<br>   - Is Active (checkbox)<br>4. Admin clicks "Tạo mới" (Create).<br>5. System validates unique Code.<br>6. System saves plan to Database.<br>7. Web App refreshes the list. |
| **Alternative Flows** | **A1. Code Exists:** System returns error; UI shows "Mã gói đã tồn tại".<br>**A2. Invalid Data:** System rejects; UI shows validation errors. |
| **Post-conditions** | New subscription plan is created. |

### UC-PLAN-04: Edit Subscription Plan
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Edit Subscription Plan** |
| **Actor** | Admin |
| **Brief Description** | Admin updates an existing subscription plan. |
| **Pre-conditions** | Admin is viewing the Plan List. |
| **Basic Flows** | 1. Admin clicks "Edit" icon on a plan row.<br>2. Web App opens edit dialog with current values.<br>3. Admin modifies fields.<br>4. Admin clicks "Cập nhật".<br>5. System updates the plan in Database.<br>6. Web App refreshes the list. |
| **Alternative Flows** | **A1. Update Failed:** System returns error; UI shows error message. |
| **Post-conditions** | Subscription plan is updated. |

### UC-PLAN-05: Delete Subscription Plan
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Delete Subscription Plan** |
| **Actor** | Admin |
| **Brief Description** | Admin permanently removes a subscription plan. |
| **Pre-conditions** | Admin is viewing the Plan List. |
| **Basic Flows** | 1. Admin clicks "Delete" icon on a plan row.<br>2. Web App shows confirmation dialog.<br>3. Admin confirms deletion.<br>4. System deletes the plan from Database.<br>5. Web App removes the plan from the list. |
| **Alternative Flows** | **A1. Plan In Use:** System may prevent deletion if plan is referenced by active subscriptions (implementation-dependent). |
| **Post-conditions** | Subscription plan is permanently deleted. |

---

## 4. Sequence Diagrams

### 4.3 Sequence Diagram: Create Subscription Plan

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionPlansPage)
    participant CTL as SubscriptionPlanController
    participant SVC as SubscriptionPlanService
    participant DB as Database

    A->>FE: Click "Add New" -> Fill Form -> Submit
    FE->>CTL: POST /api/admin/subscription-plans
    CTL->>SVC: create(dto)
    SVC->>DB: Check unique code
    SVC->>DB: INSERT INTO subscription_plans
    DB-->>SVC: New Plan Entity
    SVC-->>CTL: Success
    CTL-->>FE: JSON { success: true, message: "Tạo gói đăng ký thành công" }
    FE-->>A: Show success toast + Refresh list
```

### 4.4 Sequence Diagram: Edit Subscription Plan

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionPlansPage)
    participant CTL as SubscriptionPlanController
    participant SVC as SubscriptionPlanService
    participant DB as Database

    A->>FE: Click Edit -> Modify Fields -> Submit
    FE->>CTL: PUT /api/admin/subscription-plans/:id
    CTL->>SVC: update(id, dto)
    SVC->>DB: UPDATE subscription_plans SET ... WHERE id = :id
    DB-->>SVC: Updated Plan
    SVC-->>CTL: Success
    CTL-->>FE: JSON { success: true, message: "Cập nhật gói đăng ký thành công" }
    FE-->>A: Show success toast + Refresh list
```

### 4.5 Sequence Diagram: Delete Subscription Plan

```mermaid
sequenceDiagram
    participant A as Admin
    participant FE as Web App (AdminSubscriptionPlansPage)
    participant CTL as SubscriptionPlanController
    participant SVC as SubscriptionPlanService
    participant DB as Database

    A->>FE: Click Delete -> Confirm
    FE->>CTL: DELETE /api/admin/subscription-plans/:id
    CTL->>SVC: delete(id)
    SVC->>DB: DELETE FROM subscription_plans WHERE id = :id
    DB-->>SVC: Success
    SVC-->>CTL: Success
    CTL-->>FE: JSON { success: true, message: "Xóa gói đăng ký thành công" }
    FE-->>A: Remove from list + Show toast
```
