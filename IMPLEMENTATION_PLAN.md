# Kế hoạch Triển khai Tính năng Nông nghiệp & IoT cho AgriBot

## 1. GAP ANALYSIS (Phân tích khoảng trống)

Dựa trên việc đối chiếu `SPECS.txt` và codebase hiện tại (`apps/api`, `apps/python-ai-service`), dưới đây là bảng phân tích:

| Phân hệ | Tính năng | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Auth & User** | Đăng ký / Đăng nhập | ✅ Đã có | Đã hỗ trợ Role (FARMER, ADMIN), Google Auth. |
| | Quản lý Profile | ✅ Đã có | |
| **Chatbot** | Hỏi đáp kiến thức (RAG/LLM) | ✅ Đã có | Đã tích hợp Python Service. |
| | Phân tích Intent/NER | ✅ Đã có | Python Service trả về Intent/NER chuẩn. |
| | **Xử lý Action (IoT/Farm)** | ❌ **Chưa có** | Backend chưa map Intent sang hành động cụ thể. |
| **Nông trại** | Quản lý thông tin nông trại | ❌ **Chưa có** | Chưa có bảng `Farm`, `Area`. |
| | Nhật ký canh tác (Activity) | ❌ **Chưa có** | Chưa có tính năng ghi chép gieo trồng, bón phân. |
| | Quản lý tài chính (Chi phí) | ❌ **Chưa có** | Chưa có báo cáo chi phí/lợi nhuận. |
| **IoT** | Quản lý thiết bị (Device) | ❌ **Chưa có** | Chưa có định nghĩa Device, Sensor. |
| | Thu thập dữ liệu (Sensor) | ❌ **Chưa có** | Chưa tích hợp MQTT để lưu dữ liệu cảm biến. |
| | Điều khiển thiết bị | ❌ **Chưa có** | Chưa có luồng điều khiển bật/tắt qua MQTT. |
| | Dashboard giám sát | ❌ **Chưa có** | Chưa có UI hiển thị thông số môi trường. |

---

## 2. DATA MODELING (Thiết kế dữ liệu)

Đề xuất mở rộng Database (PostgreSQL) với các bảng sau. Sử dụng TypeORM Entities.

### 2.1. Nhóm Nông trại (Farm Management)

*   **Farm** (Nông trại)
    *   Quan hệ: 1-1 với `User`.
    *   Fields: `id` (UUID), `name`, `address`, `description`, `userId` (FK).
*   **Area** (Khu vực - ví dụ: Khu A, Khu B)
    *   Quan hệ: N-1 với `Farm`.
    *   Fields: `id` (UUID), `name` (Khu A), `type` (Nhà kính/Ngoài trời), `farmId` (FK).
*   **Crop** (Loại cây trồng - Dữ liệu tham khảo)
    *   Fields: `id` (UUID), `name` (Cam sành), `description`, `technicalGuide` (Link tài liệu).
*   **FarmActivity** (Nhật ký canh tác)
    *   Quan hệ: N-1 với `Farm`, `Area`, `Crop`.
    *   Fields: `id` (UUID), `type` (SEEDING, FERTILIZE, PESTICIDE, HARVEST), `date`, `description`, `cost` (Chi phí), `revenue` (Doanh thu - nếu là thu hoạch), `farmId` (FK), `areaId` (FK), `cropId` (FK).

### 2.2. Nhóm IoT

*   **Device** (Thiết bị)
    *   Quan hệ: N-1 với `Area`.
    *   Fields: `id` (UUID), `name` (Bơm 1), `type` (SENSOR, CONTROLLER), `deviceType` (PUMP, LIGHT, TEMP_SENSOR, HUMIDITY_SENSOR), `pin` (GPIO pin hoặc ID phần cứng), `status` (ON/OFF), `areaId` (FK).
*   **SensorData** (Dữ liệu cảm biến)
    *   Quan hệ: N-1 với `Device`.
    *   Fields: `id` (UUID), `value` (Float), `unit` (C, %, Lux), `timestamp`, `deviceId` (FK).
    *   *Lưu ý: Cân nhắc dùng TimescaleDB hoặc Partitioning nếu dữ liệu lớn, nhưng hiện tại dùng bảng thường là đủ.*

---

## 3. IMPLEMENTATION PLAN (Kế hoạch triển khai)

Chia làm 3 Phase để đảm bảo tính ổn định và có thể kiểm thử từng phần.

### Phase 1: Farm Management Foundation (Nền tảng quản lý nông trại)
**Mục tiêu:** User có thể tạo nông trại, chia khu vực và ghi nhật ký canh tác.
*   **Backend:**
    *   Tạo Entity: `Farm`, `Area`, `Crop`, `FarmActivity`.
    *   Viết API CRUD cho Farm & Area.
    *   Viết API ghi nhận hoạt động (Activity) & Báo cáo tài chính cơ bản (Sum cost/revenue).
*   **Frontend:**
    *   UI Đăng ký thông tin nông trại (khi User mới login lần đầu).
    *   Dashboard hiển thị danh sách khu vực.
    *   Form nhập liệu nhật ký canh tác.

### Phase 2: IoT System Integration (Hệ thống IoT)
**Mục tiêu:** Kết nối thiết bị, thu thập dữ liệu và điều khiển cơ bản.
*   **Backend:**
    *   Tạo Entity: `Device`, `SensorData`.
    *   Tích hợp MQTT Broker (Mosquitto/HiveMQ).
    *   Viết Service lắng nghe MQTT topic `farm/+/sensor/+` để lưu `SensorData`.
    *   Viết API `POST /devices/:id/control` -> Publish lệnh xuống MQTT `farm/+/control`.
*   **Frontend:**
    *   UI Quản lý thiết bị (Thêm/Sửa/Xóa thiết bị vào Khu vực).
    *   Dashboard IoT: Biểu đồ nhiệt độ/độ ẩm (Chart.js/Recharts) & Nút Bật/Tắt thiết bị.

### Phase 3: Intelligent Chatbot Integration (Tích hợp Chatbot thông minh)
**Mục tiêu:** Chatbot hiểu và thực thi lệnh điều khiển/truy vấn.
*   **Backend:**
    *   Viết `ChatService` xử lý logic sau khi nhận Intent từ Python Service.
    *   **Map Intent:**
        *   `device_control`: Parse `device_name`, `farm_area`, `duration` -> Gọi Device Service -> Publish MQTT.
        *   `sensor_query`: Parse `sensor_type`, `farm_area` -> Query `SensorData` mới nhất -> Trả về text.
        *   `financial_query`: Parse `date` -> Query `FarmActivity` -> Tính tổng chi phí/doanh thu.
*   **Frontend:**
    *   Cập nhật UI Chat để hiển thị phản hồi phong phú (ví dụ: Hiển thị Card thông tin cảm biến thay vì chỉ text).

---
**Xin mời review kế hoạch trên. Nếu đồng ý, tôi sẽ bắt đầu thực hiện Phase 1.**
