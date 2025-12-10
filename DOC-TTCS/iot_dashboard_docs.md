# IoT Dashboard Interation Documentation
----2.1.2.9-----
## 1. Actors
- **User (Farmer)**: Monitors and controls farm devices via the Dashboard.
- **Frontend (Web App)**: React components (`LightingControlPanel`, `IrrigationHistory`, etc.)
- **Backend API (NestJS)**: `IoTController`, `IrrigationController`, `LightingController`.
- **IoT Service**: Handles business logic and MQTT publishing.
- **MQTT Broker**: Relays commands to physical devices.
- **IoT Device (ESP32)**: Executors (Pumps, Lights) and Sensors.

## 2. Use Case Specifications

### UC-IOT-01: Get Area Sensor Data
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Get Area Sensor Data** |
| **Actor** | User |
| **Brief Description** | User views real-time sensor data (Temperature, Humidity, Soil Moisture) for a specific farm area. |
| **Pre-conditions** | User is logged in. Area has active sensor nodes. |
| **Basic Flows** | 1. User selects an Area on the Dashboard.<br>2. System requests latest sensor data for that area.<br>3. System retrieves data from Redis/Database (cached from MQTT).<br>4. System displays current metrics (e.g., Temp: 28°C, Humidity: 65%). |
| **Alternative Flows** | **A1. No Data:**<br>1. System returns empty or outdated status.<br>2. Dashboard shows "Offline" or "No Data". |
| **Fail Conditions** | API failure or MQTT Broker down. |

### UC-IOT-02: Manual Device Control (On/Off)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Manual Device Control** |
| **Actor** | User |
| **Brief Description** | User manually turns a Pump or Light ON/OFF. |
| **Pre-conditions** | device is Online and in "Manual" mode (Auto mode might override if not handled). |
| **Basic Flows** | 1. User clicks "Turn On" on a device card.<br>2. System validates ownership.<br>3. System publishes `turn_on` command to MQTT topic.<br>4. Device receives command and activates.<br>5. Device sends ACK status update.<br>6. System logs `MANUAL_ON` event.<br>7. Dashboard updates status to "ON". |
| **Alternative Flows** | **A1. Device Error:**<br>1. Device does not ACK within timeout.<br>2. System shows "Command Timed Out". |

### UC-IOT-03: Control Device with Duration
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Control Device with Duration** |
| **Actor** | User |
| **Brief Description** | User turns on a device for a specific time (e.g., Water for 10 mins). |
| **Pre-conditions** | Device is Online. |
| **Basic Flows** | 1. User clicks "Irrigate with Duration".<br>2. User selects duration (e.g., 10 minutes).<br>3. User confirms.<br>4. System creates `DURATION` event (Status: Pending).<br>5. System publishes `irrigate` command with `duration: 600` to MQTT.<br>6. Device starts and counts down.<br>7. Device turns off automatically after duration.<br>8. System logs completion. |
| **Post-conditions** | Device turns off after X minutes. |

### UC-IOT-04: Configure Auto Control (Threshold/Schedule)
| Feature | Description |
| :--- | :--- |
| **Use Case** | **Configure Auto Control** |
| **Actor** | User |
| **Brief Description** | User sets up automatic rules (e.g., Water if Soil Moisture < 30%). |
| **Pre-conditions** | User has Premium subscription (implied by `PremiumSubscriptionGuard`). |
| **Basic Flows** | 1. User navigates to Device Settings -> Auto Configuration.<br>2. User enables "Auto Mode".<br>3. User sets **Moisture Threshold** (e.g., 30%) and **Duration** (e.g., 5 mins).<br>4. User saves configuration.<br>5. System updates `DeviceAutoConfig` in DB.<br>6. System publishes `set_auto_mode` config to Device via MQTT.<br>7. Device now operates autonomously based on local sensor readings. |
| **Post-conditions** | Device operates automatically without server intervention. |

## 3. Sequence Diagrams

### 3.1 Sequence Diagram: Get Area Sensor Data

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as IoTController
    participant MQ_SVC as MqttService
    participant DB as Database

    U->>FE: View Area Dashboard
    FE->>CTL: GET /iot/sensors/latest?areaId=...
    CTL->>MQ_SVC: getLatestSensorData(userId, areaId)
    MQ_SVC->>DB: Fetch Sensor Data
    DB-->>MQ_SVC: { temp: 28, soil: 45, light: 1200 }
    MQ_SVC-->>CTL: Return Data
    CTL-->>FE: JSON Response
    FE-->>U: Display Sensor Cards
```

### 3.2 Sequence Diagram: Manual Device Control (Turn On/Off)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as IrrigationController
    participant SVC as IrrigationService
    participant DB as Database
    participant MQ as MQTT Broker
    participant DV as IoT Device (ESP32)

    U->>FE: Click "Turn On Pump"
    FE->>CTL: POST /iot/devices/:id/irrigation/on
    CTL->>SVC: turnOnPump(deviceId, userId)
    
    SVC->>DB: Validate Access & Device Status
    SVC->>DB: Create Event (MANUAL_ON, PENDING)
    SVC->>MQ: Publish { action: "turn_on" }
    
    MQ->>DV: Forward Command
    DV->>DV: Activate Relay
    DV-->>MQ: Ack { event: "pump_on" }
    
    MQ->>SVC: Handle Status Update (Async)
    SVC->>DB: Update Event (RUNNING)
    
    SVC-->>CTL: Return Event Info
    CTL-->>FE: Success Response
    FE-->>U: Update Button State "ON"
```

### 3.3 Sequence Diagram: Control with Duration

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as IrrigationController
    participant SVC as IrrigationService
    participant DB as Database
    participant MQ as MQTT Broker
    participant DV as IoT Device

    U->>FE: Set 10 mins -> Click "Irrigate"
    FE->>CTL: POST /iot/devices/:id/irrigation/duration (duration=600)
    CTL->>SVC: irrigateDuration(deviceId, 600s)
    
    SVC->>DB: Create Event (DURATION, planned: 600)
    SVC->>MQ: Publish { action: "irrigate", duration: 600 }
    
    MQ->>DV: Forward Command
    DV->>DV: Start Pump & Timer
    DV-->>MQ: Ack "irrigation_started"
    
    SVC-->>CTL: Return Success
    CTL-->>FE: Show "Irrigation Started"
    
    note right of DV: After 10 mins
    DV->>DV: Stop Pump
    DV-->>MQ: Report "irrigation_completed"
    MQ->>SVC: Update Event Status -> COMPLETED
```

### 3.4 Sequence Diagram: Configure Auto Mode

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Web App
    participant CTL as IrrigationController
    participant SVC as IrrigationService
    participant DB as Database
    participant MQ as MQTT Broker
    participant DV as IoT Device

    U->>FE: Enable Auto, Set Threshold=30%, Duration=5m
    FE->>CTL: PUT /iot/devices/:id/irrigation/auto-config
    CTL->>SVC: updateAutoConfig(dto)
    
    SVC->>DB: Update DeviceAutoConfig
    SVC->>DB: Log Event (AUTO_CONFIG_UPDATE)
    
    SVC->>MQ: Publish { action: "set_auto_mode", threshold: 30, ... }
    MQ->>DV: Receive Config
    DV->>DV: Update Local Logic
    
    SVC-->>CTL: Return Updated Config
    CTL-->>FE: Show "Config Saved"
    
    note right of DV: Device now runs autonomously
    DV->>DV: Read Sensor -> Check Threshold -> Auto Irrigate
    DV-->>MQ: Report "auto_irrigation_triggered"
```
