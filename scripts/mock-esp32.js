/**
 * Mock ESP32 Device Simulator
 * 
 * Simulates an ESP32 IoT device for testing irrigation control system
 * 
 * Features:
 * - Subscribe to control commands from backend
 * - Publish sensor data periodically
 * - Publish status updates
 * - Simulate auto irrigation based on threshold
 * - Handle manual control (ON/OFF, duration)
 * 
 * Usage:
 *   node scripts/mock-esp32.js ESP32-001
 */

const mqtt = require('mqtt');
require('dotenv').config();

// Configuration
const DEVICE_SERIAL = process.argv[2] || 'ESP32-001';
console.log("DEVICE_SERIAL: ",DEVICE_SERIAL);

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_SECRET = process.env.MQTT_SECRET || 'your-secret-key';
console.log("MQTT_secret: ",MQTT_SECRET);

// Device State
// ktao state
const state = {
  pumpOn: false,
  irrigationStartTime: null,
  irrigationDuration: 0,
  
  // Auto mode configuration
  autoConfig: {
    enabled: false,
    threshold: 30.0,
    duration: 600,
    cooldown: 3600,
    lastIrrigationTime: 0,
  },
  
  // Sensor readings (simulated)
  sensors: {
    temperature: 25.0,
    humidity: 60.0,
    soilMoisture: 35.0,
    lightLevel: 500,
  },
};

// MQTT Client , tạo mqtt client kết nối đến broker mqtt://localhost:1883
const client = mqtt.connect(MQTT_BROKER_URL);

// Topics
const CONTROL_TOPIC = `control/${DEVICE_SERIAL}/command`;
console.log("CONTROL_TOPIC: ",CONTROL_TOPIC);

const DATA_TOPIC = `sensors/${DEVICE_SERIAL}/data`;
console.log("DATA_TOPIC: ",DATA_TOPIC);

const STATUS_TOPIC = `sensors/${DEVICE_SERIAL}/status`;
console.log("STATUS_TOPIC: ",STATUS_TOPIC);

console.log(`🤖 Mock ESP32 Device: ${DEVICE_SERIAL}`);
console.log(`📡 Connecting to MQTT Broker: ${MQTT_BROKER_URL}`);

// ============================================================================
// MQTT Event Handlers
// ============================================================================
// đăng ký event listeners (chưa chạy, chỉ đăng ký)

// == phase 2 kết nối thành công event connect đc trigger
client.on('connect', () => {
  console.log('✅ Connected to MQTT Broker');
  
  // Subscribe to control commands
  client.subscribe(CONTROL_TOPIC, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe:', err);
    } else {
      console.log(`📥 Subscribed to: ${CONTROL_TOPIC}`);
    }
  });
  
  // Start periodic tasks
  startPeriodicTasks(); // trong này chứa publish sensor_data
// |     - Mỗi 5s:  updateSensorReadings()   → Cập nhật cảm biến     │
// │     - Mỗi 60s: publishSensorData()      → Gửi data lên broker   │
// │     - Mỗi 1s:  checkIrrigationTimer()   → Kiểm tra hết giờ tưới │
// │     - Mỗi 10s: checkAndAutoIrrigate()   → Kiểm tra tưới tự động │
  
  // Publish initial status 
  // Published status: device_online
  publishStatus('device_online');
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

client.on('message', (topic, message) => {
  if (topic === CONTROL_TOPIC) {
    handleControlCommand(message.toString());
  }
});

// ============================================================================
// Command Handler
// ============================================================================

function handleControlCommand(message) {
  try {
    const command = JSON.parse(message);
    console.log(`📨 Received command:`, command);
    
    // Validate secret
    if (command.secret && command.secret !== MQTT_SECRET) {
      console.warn('⚠️  Invalid secret, ignoring command');
      return;
    }
    
    const { action } = command;
    
    switch (action) {
      case 'turn_on':
        turnOnPump();
        publishStatus('pump_on');
        break;
        
      case 'turn_off':
        turnOffPump();
        publishStatus('pump_off');
        break;
        
      case 'irrigate':
        startIrrigation(command.duration);
        publishStatus('irrigation_started', { duration: command.duration });
        break;
        
      case 'set_auto_mode':
        updateAutoConfig(command);
        publishStatus('auto_mode_updated', { autoConfig: state.autoConfig });
        break;
        
      default:
        console.warn(`⚠️  Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Error handling command:', error);
  }
}

// ============================================================================
// Pump Control Functions
// ============================================================================

function turnOnPump() {
  console.log('💧 Turning pump ON (manual)');
  state.pumpOn = true;
  state.irrigationDuration = 0; // Indefinite
  state.irrigationStartTime = Date.now();
}

function turnOffPump() {
  console.log('🛑 Turning pump OFF');
  state.pumpOn = false;
  state.irrigationDuration = 0;
  state.irrigationStartTime = null;
}

function startIrrigation(duration) {
  console.log(`💧 Starting irrigation for ${duration} seconds`);
  state.pumpOn = true;
  state.irrigationDuration = duration;
  state.irrigationStartTime = Date.now();
}

function updateAutoConfig(config) {
  console.log('⚙️  Updating auto configuration:', config);
  
  if (config.enabled !== undefined) {
    state.autoConfig.enabled = config.enabled;
  }
  if (config.threshold !== undefined) {
    state.autoConfig.threshold = config.threshold;
  }
  if (config.duration !== undefined) {
    state.autoConfig.duration = config.duration;
  }
  if (config.cooldown !== undefined) {
    state.autoConfig.cooldown = config.cooldown;
  }
  
  console.log('✅ Auto config updated:', state.autoConfig);
}

// ============================================================================
// Auto Irrigation Logic
// ============================================================================

function checkAndAutoIrrigate() {
  if (!state.autoConfig.enabled) return;
  
  const { soilMoisture } = state.sensors;
  const { threshold, duration, cooldown, lastIrrigationTime } = state.autoConfig;
  
  const needsWater = soilMoisture < threshold;
  const notInCooldown = (Date.now() - lastIrrigationTime) > (cooldown * 1000);
  const notIrrigating = !state.pumpOn;
  
  if (needsWater && notInCooldown && notIrrigating) {
    console.log(`🌱 Auto irrigation triggered (moisture: ${soilMoisture}% < ${threshold}%)`);
    startIrrigation(duration);
    state.autoConfig.lastIrrigationTime = Date.now();
    publishStatus('auto_irrigation_triggered', {
      soilMoisture,
      threshold,
      duration,
    });
  }
}

// ============================================================================
// Timer Management
// ============================================================================

function checkIrrigationTimer() {
  if (!state.pumpOn || state.irrigationDuration === 0) return;
  
  const elapsed = (Date.now() - state.irrigationStartTime) / 1000;
  
  if (elapsed >= state.irrigationDuration) {
    console.log(`⏱️  Irrigation duration completed (${state.irrigationDuration}s)`);
    turnOffPump();
    publishStatus('irrigation_completed', {
      duration: state.irrigationDuration,
      soilMoisture: state.sensors.soilMoisture,
    });
  }
}

// ============================================================================
// Sensor Simulation
// ============================================================================

function updateSensorReadings() {
  // Simulate realistic sensor changes
  
  // Temperature: 20-35°C with slow variation
  state.sensors.temperature += (Math.random() - 0.5) * 0.5;
  state.sensors.temperature = Math.max(20, Math.min(35, state.sensors.temperature));
  
  // Humidity: 40-80% with slow variation
  state.sensors.humidity += (Math.random() - 0.5) * 2;
  state.sensors.humidity = Math.max(40, Math.min(80, state.sensors.humidity));
  
  // Soil Moisture: Decreases over time, increases when irrigating
  if (state.pumpOn) {
    // Increase moisture when irrigating
    state.sensors.soilMoisture += 0.5;
    state.sensors.soilMoisture = Math.min(100, state.sensors.soilMoisture);
  } else {
    // Decrease moisture slowly when not irrigating
    state.sensors.soilMoisture -= 0.1;
    state.sensors.soilMoisture = Math.max(0, state.sensors.soilMoisture);
  }
  
  // Light Level: 0-1000 lux
  state.sensors.lightLevel += (Math.random() - 0.5) * 50;
  state.sensors.lightLevel = Math.max(0, Math.min(1000, state.sensors.lightLevel));
}

// ============================================================================
// MQTT Publishing
// ============================================================================

function publishSensorData() {
  const payload = {
    deviceId: DEVICE_SERIAL,
    secret: MQTT_SECRET,
    temperature: parseFloat(state.sensors.temperature.toFixed(1)),
    humidity: parseFloat(state.sensors.humidity.toFixed(1)),
    soilMoisture: parseFloat(state.sensors.soilMoisture.toFixed(1)),
    lightLevel: Math.round(state.sensors.lightLevel),
    timestamp: Date.now(),
  };

  console.log("payload phía esp_ sensorData: ",payload);
  
  client.publish(DATA_TOPIC, JSON.stringify(payload));
  console.log(`📤 Published sensor data: Temp=${payload.temperature}°C, Moisture=${payload.soilMoisture}%`);
}

function publishStatus(event, metadata = {}) {
  console.log("Log trong PUBstatus !!!!!");
  console.log("log xem event là gì?:  ",event);
  console.log("log xem metadata là gì? : ",metadata);
  
  const payload = {
    deviceId: DEVICE_SERIAL,
    event,
    pumpOn: state.pumpOn,
    autoMode: state.autoConfig.enabled,
    soilMoisture: parseFloat(state.sensors.soilMoisture.toFixed(1)),
    timestamp: Date.now(),
    ...metadata,
  };
  
  console.log("log trong publishStatus----PAYLOAD: ",payload);
  
  
  client.publish(STATUS_TOPIC, JSON.stringify(payload));
  console.log(`📤 Published status: ${event}`);
}

// ============================================================================
// Periodic Tasks
// ============================================================================

function startPeriodicTasks() {
  // Update sensors every 5 seconds
  setInterval(() => {
    updateSensorReadings();
  }, 5000);
  
  // Publish sensor data every 60 seconds
  setInterval(() => {
    publishSensorData();
  }, 60000);
  
  // Check irrigation timer every second
  setInterval(() => {
    checkIrrigationTimer();
  }, 1000);
  
  // Check auto irrigation every 10 seconds
  setInterval(() => {
    checkAndAutoIrrigate();
  }, 10000);
  
  // Publish initial sensor data
  console.log("!!!!!! PUBLISH INIT SENSOR DATA");
  publishSensorData();
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down mock ESP32...');
  publishStatus('device_offline');
  
  setTimeout(() => {
    client.end();
    process.exit(0);
  }, 500);
});

console.log('\n📊 Device State:');
console.log('  - Serial:', DEVICE_SERIAL);
console.log('  - Auto Mode:', state.autoConfig.enabled ? 'Enabled' : 'Disabled');
console.log('  - Threshold:', state.autoConfig.threshold + '%');
console.log('\n🎮 Ready to receive commands!\n');
