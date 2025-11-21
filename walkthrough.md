# Phase 1: Farm Management Foundation - Walkthrough

## 1. Backend Changes (`apps/api`)

### New Modules & Entities
*   **FarmsModule**: Created to handle farm logic.
*   **Entities**:
    *   `Farm`: Stores farm details (name, address, description). Linked to `User`.
    *   `Area`: Represents areas within a farm (e.g., Greenhouse A, Field B).
    *   `Crop`: Reference data for crops.
    *   `FarmActivity`: Records farming activities (Seeding, Fertilizing, etc.) with costs and revenue.
*   **API Endpoints**:
    *   `POST /farms`: Create a new farm.
    *   `GET /farms/me`: Get current user's farm.
    *   `PATCH /farms/me`: Update farm details.
    *   `POST /farms/areas`: Add an area.
    *   `GET /farms/areas`: List areas.
    *   `POST /farms/activities`: Record activity.
    *   `GET /farms/activities`: List activities.
    *   `GET /farms/stats`: Get financial stats.

*   **Routes**:
    *   `/dashboard`: Chat interface.
    *   `/farm`: Farm management interface.
*   **Farm Registration**: Automatically prompts on `/farm` if no farm exists.

## 3. How to Test

1.  **Login** to the application.
2.  If you are a new user (or haven't created a farm), the **Farm Registration Modal** should appear automatically.
3.  Enter farm details (Name, Address) and submit.
4.  Once created, you will be redirected to the **Farm Dashboard**.
5.  You can switch back to Chat using the buttons at the top right.
6.  In **Farm Dashboard**:
    *   Check "Overview" tab.
    *   Go to "Areas" tab (currently empty list).
    *   Go to "Activities" tab.

## 4. Next Steps (Phase 2)
*   Implement IoT Device management (Entities, MQTT integration).
*   Add "Add Area" and "Add Activity" forms in the frontend.
