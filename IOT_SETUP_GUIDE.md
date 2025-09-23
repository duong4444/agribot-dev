# 🌱 **HƯỚNG DẪN TRIỂN KHAI IoT INTEGRATION**

## 📋 **TỔNG QUAN**

Hệ thống IoT Integration cho phép:
- **Kết nối cảm biến**: Độ ẩm đất, nhiệt độ, ánh sáng, pH
- **Điều khiển thiết bị**: Bơm nước, quạt, hệ thống tưới
- **Real-time monitoring**: WebSocket + MQTT
- **AI Integration**: Chatbot có thể truy vấn và điều khiển IoT

---

## 🏗️ **KIẾN TRÚC HỆ THỐNG**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IoT Devices   │    │   MQTT Broker   │    │   Backend API   │
│                 │    │                 │    │                 │
│ • Sensors       │◄──►│ • Mosquitto     │◄──►│ • NestJS        │
│ • Actuators     │    │ • Port 1883     │    │ • MQTT Client   │
│ • Controllers   │    │ • WebSocket     │    │ • WebSocket     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Frontend      │    │   Database      │
                       │                 │    │                 │
                       │ • React/Next.js │    │ • PostgreSQL    │
                       │ • Socket.IO     │    │ • IoT Tables    │
                       │ • Real-time UI  │    │ • Sensor Data   │
                       └─────────────────┘    └─────────────────┘
```

---

## 🚀 **BƯỚC 1: CÀI ĐẶT MQTT BROKER**

### **Option A: Docker (Recommended)**

```bash
# Tạo docker-compose.yml cho MQTT
version: '3.8'
services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: mosquitto
    ports:
      - "1883:1883"      # MQTT
      - "9001:9001"      # WebSocket
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log
    restart: unless-stopped

volumes:
  mosquitto_data:
  mosquitto_logs:
```

### **Option B: Local Installation**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Windows (Chocolatey)
choco install mosquitto

# macOS (Homebrew)
brew install mosquitto
```

### **Cấu hình Mosquitto (mosquitto.conf)**

```conf
# MQTT Configuration
listener 1883
allow_anonymous true

# WebSocket Configuration
listener 9001
protocol websockets

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information

# Persistence
persistence true
persistence_location /mosquitto/data/
```

---

## 🔧 **BƯỚC 2: CẤU HÌNH BACKEND**

### **Environment Variables (.env)**

```env
# MQTT Configuration
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

# WebSocket Configuration
FRONTEND_URL=http://localhost:3001

# Database (IoT Tables sẽ được tạo tự động)
DATABASE_URL=postgresql://username:password@localhost:5432/farm_management
```

### **Database Migration**

```bash
# Chạy migration để tạo IoT tables
cd apps/api
pnpm run migration:run
```

**IoT Tables được tạo:**
- `sensors` - Thông tin cảm biến
- `devices` - Thông tin thiết bị
- `sensor_readings` - Dữ liệu cảm biến
- `device_commands` - Lệnh điều khiển

---

## 📱 **BƯỚC 3: CẤU HÌNH FRONTEND**

### **Socket.IO Client Setup**

```typescript
// apps/web/src/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/iot', {
  transports: ['websocket'],
  autoConnect: true,
});

export default socket;
```

### **IoT Dashboard**

Truy cập: `http://localhost:3001/iot`

**Tính năng:**
- Real-time sensor data
- Device control interface
- MQTT connection status
- Historical data analytics

---

## 🔌 **BƯỚC 4: KẾT NỐI THIẾT BỊ IoT**

### **MQTT Topics Structure**

```
sensors/{deviceId}/data          # Sensor data publishing
sensors/{deviceId}/request       # Request sensor data
devices/{deviceId}/command       # Device control commands
devices/{deviceId}/status        # Device status updates
devices/{deviceId}/response      # Command responses
alerts/{deviceId}                # Device alerts
```

### **Sensor Data Format**

```json
{
  "type": "moisture",
  "value": 65.5,
  "unit": "%",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "battery": 85,
    "signal": -45
  }
}
```

### **Device Command Format**

```json
{
  "command": "pump_on",
  "parameters": {
    "duration": 300
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🤖 **BƯỚC 5: AI INTEGRATION**

### **Chatbot IoT Commands**

**Sensor Queries:**
- "Độ ẩm đất hiện tại bao nhiêu?"
- "Nhiệt độ trong nhà kính là bao nhiêu?"
- "Dữ liệu cảm biến gần đây"

**Device Control:**
- "Bật bơm 10 phút"
- "Tắt quạt thông gió"
- "Tưới nước tự động"

### **AI Service Integration**

```typescript
// AI Service tự động nhận diện IoT intents
const iotIntents = [
  'sensor_query',    // Truy vấn dữ liệu cảm biến
  'device_control'   // Điều khiển thiết bị
];
```

---

## 🧪 **BƯỚC 6: TESTING**

### **Test MQTT Connection**

```bash
# Subscribe to sensor data
mosquitto_sub -h localhost -t "sensors/+/data"

# Publish test sensor data
mosquitto_pub -h localhost -t "sensors/test001/data" -m '{"type":"moisture","value":65,"unit":"%","timestamp":"2024-01-15T10:30:00Z"}'
```

### **Test Device Control**

```bash
# Send pump command
mosquitto_pub -h localhost -t "devices/pump001/command" -m '{"command":"pump_on","parameters":{"duration":300},"timestamp":"2024-01-15T10:30:00Z"}'
```

### **Test WebSocket**

```javascript
// Browser console
const socket = io('http://localhost:3000/iot');
socket.emit('join-farm', { farmId: 'test-farm' });
socket.on('sensor-reading', (data) => console.log(data));
```

---

## 📊 **BƯỚC 7: MONITORING & ANALYTICS**

### **Real-time Dashboard**

- **Sensor Readings**: Live data với charts
- **Device Status**: Online/offline status
- **Command History**: Lịch sử điều khiển
- **Alerts**: Cảnh báo ngưỡng

### **Analytics Features**

- **Trend Analysis**: Xu hướng dữ liệu cảm biến
- **Performance Metrics**: Hiệu suất thiết bị
- **Cost Analysis**: Chi phí vận hành IoT
- **Predictive Maintenance**: Bảo trì dự đoán

---

## 🔒 **BƯỚC 8: SECURITY**

### **MQTT Security**

```conf
# mosquitto.conf
allow_anonymous false
password_file /mosquitto/config/passwd
acl_file /mosquitto/config/acl
```

### **Authentication**

```bash
# Tạo user MQTT
mosquitto_passwd -c /mosquitto/config/passwd iot_user
```

### **ACL Configuration**

```
# acl file
user iot_user
topic read sensors/+/data
topic write devices/+/command
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

**1. MQTT Connection Failed**
```bash
# Check MQTT broker status
sudo systemctl status mosquitto
mosquitto_pub -h localhost -t "test" -m "hello"
```

**2. WebSocket Connection Issues**
```javascript
// Check WebSocket connection
console.log(socket.connected);
socket.on('connect_error', (error) => console.error(error));
```

**3. Database Connection**
```bash
# Check database tables
psql -d farm_management -c "\dt"
```

**4. Frontend Build Issues**
```bash
# Clear cache and rebuild
cd apps/web
rm -rf .next
pnpm run build
```

---

## 📈 **SCALING & OPTIMIZATION**

### **Performance Tips**

1. **MQTT QoS Levels**
   - QoS 0: Sensor data (fire and forget)
   - QoS 1: Device commands (at least once)
   - QoS 2: Critical alerts (exactly once)

2. **Database Optimization**
   - Index on timestamp columns
   - Partition sensor_readings table
   - Archive old data

3. **WebSocket Optimization**
   - Room-based subscriptions
   - Message batching
   - Connection pooling

### **Production Deployment**

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto.prod.conf:/mosquitto/config/mosquitto.conf
    environment:
      - MQTT_USERNAME=${MQTT_USERNAME}
      - MQTT_PASSWORD=${MQTT_PASSWORD}
    restart: unless-stopped
```

---

## 🎯 **NEXT STEPS**

### **Advanced Features**

1. **Machine Learning Integration**
   - Predictive analytics
   - Anomaly detection
   - Automated decision making

2. **Mobile App**
   - React Native app
   - Push notifications
   - Offline capabilities

3. **Edge Computing**
   - Local processing
   - Reduced latency
   - Offline operation

4. **Integration APIs**
   - Weather API
   - Market price API
   - Third-party sensors

---

## 📞 **SUPPORT**

### **Documentation**
- [MQTT Protocol](https://mqtt.org/)
- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [Socket.IO Documentation](https://socket.io/docs/)

### **Community**
- [MQTT Community](https://mqtt.org/community/)
- [IoT Stack Exchange](https://iot.stackexchange.com/)

---

## ✅ **CHECKLIST**

- [ ] MQTT Broker installed and configured
- [ ] Backend IoT module integrated
- [ ] Database tables created
- [ ] Frontend IoT dashboard working
- [ ] WebSocket connection established
- [ ] AI chatbot IoT intents working
- [ ] Device simulation/testing completed
- [ ] Security measures implemented
- [ ] Monitoring and logging setup
- [ ] Documentation updated

---

**🎉 Chúc mừng! Hệ thống IoT đã được triển khai thành công!**

Bây giờ bạn có thể:
- Theo dõi dữ liệu cảm biến real-time
- Điều khiển thiết bị qua chatbot
- Phân tích dữ liệu IoT
- Tự động hóa quy trình nông nghiệp
