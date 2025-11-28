# Mock ESP32 Device Simulator

## Overview

This script simulates an ESP32 IoT device for testing the irrigation control system without physical hardware.

## Features

✅ **MQTT Communication**
- Subscribe to control commands: `control/{serialNumber}/command`
- Publish sensor data: `sensors/{serialNumber}/data` 
- Publish status updates: `sensors/{serialNumber}/status`

✅ **Sensor Simulation**
- Temperature (20-35°C)
- Humidity (40-80%)
- Soil Moisture (0-100%, decreases over time, increases when irrigating)
- Light Level (0-1000 lux)

✅ **Manual Control**
- Turn pump ON/OFF
- Duration-based irrigation (auto-off after duration)

✅ **Auto Irrigation**
- Threshold-based automatic irrigation
- Configurable threshold, duration, and cooldown
- Enable/disable remotely

## Usage

### 1. Start MQTT Broker

Make sure Mosquitto is running:
```bash
docker-compose up -d mosquitto
```

### 2. Run Mock Device

```bash
# Default device (ESP32-001)
node scripts/mock-esp32.js

# Custom device serial
node scripts/mock-esp32.js ESP32-ABC123
```

### 3. Simulate Multiple Devices

Open multiple terminals:
```bash
# Terminal 1
node scripts/mock-esp32.js ESP32-001

# Terminal 2
node scripts/mock-esp32.js ESP32-002

# Terminal 3
node scripts/mock-esp32.js ESP32-003
```

## Testing Commands

### Manual Control

Use MQTT client or backend API to send commands:

```bash
# Turn pump ON
mosquitto_pub -h localhost -t "control/ESP32-001/command" -m '{"action":"turn_on","component":"pump","secret":"your-secret-key"}'

# Turn pump OFF
mosquitto_pub -h localhost -t "control/ESP32-001/command" -m '{"action":"turn_off","component":"pump","secret":"your-secret-key"}'

# Irrigate for 5 minutes (300 seconds)
mosquitto_pub -h localhost -t "control/ESP32-001/command" -m '{"action":"irrigate","duration":300,"secret":"your-secret-key"}'
```

### Auto Mode Configuration

```bash
# Enable auto mode with threshold 30%
mosquitto_pub -h localhost -t "control/ESP32-001/command" -m '{
  "action": "set_auto_mode",
  "enabled": true,
  "threshold": 30,
  "duration": 600,
  "cooldown": 3600,
  "secret": "your-secret-key"
}'

# Disable auto mode
mosquitto_pub -h localhost -t "control/ESP32-001/command" -m '{
  "action": "set_auto_mode",
  "enabled": false,
  "secret": "your-secret-key"
}'
```

## Monitor Messages

### Subscribe to Sensor Data

```bash
mosquitto_sub -h localhost -t "sensors/ESP32-001/data" -v
```

### Subscribe to Status Updates

```bash
mosquitto_sub -h localhost -t "sensors/ESP32-001/status" -v
```

### Subscribe to All Topics

```bash
mosquitto_sub -h localhost -t "#" -v
```

## Behavior

### Sensor Data Publishing
- Publishes every **60 seconds**
- Includes: temperature, humidity, soilMoisture, lightLevel

### Soil Moisture Simulation
- **Decreases** by 0.1% every 5 seconds (evaporation)
- **Increases** by 0.5% every 5 seconds when pump is ON
- Range: 0-100%

### Auto Irrigation Trigger
- Checks every **10 seconds**
- Triggers when:
  - Auto mode is enabled
  - Soil moisture < threshold
  - Not in cooldown period
  - Pump is not already running

### Duration-based Irrigation
- Checks timer every **1 second**
- Auto-turns off pump when duration expires
- Publishes `irrigation_completed` status

## Status Events

The mock device publishes these status events:

- `device_online` - Device connected to MQTT
- `device_offline` - Device disconnected
- `pump_on` - Pump turned on manually
- `pump_off` - Pump turned off
- `irrigation_started` - Duration-based irrigation started
- `irrigation_completed` - Duration-based irrigation finished
- `auto_irrigation_triggered` - Auto irrigation activated
- `auto_mode_updated` - Auto configuration changed

## Environment Variables

Set in `.env` file:

```env
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_SECRET=your-secret-key
```

## Troubleshooting

### Device not connecting
- Check if Mosquitto is running: `docker ps`
- Verify MQTT_BROKER_URL is correct

### Commands not working
- Check MQTT_SECRET matches between device and backend
- Verify topic format: `control/{serialNumber}/command`

### No sensor data
- Device publishes every 60 seconds, wait for first publish
- Check subscription: `mosquitto_sub -h localhost -t "sensors/#"`

## Integration with Backend

Once backend is implemented, the mock device will:
1. Receive commands from backend API
2. Publish sensor data that backend saves to database
3. Publish status updates that backend logs as events

## Next Steps

After testing with mock device:
1. Implement backend irrigation control API
2. Create frontend control panel
3. Test end-to-end flow
4. Replace mock with real ESP32 firmware
