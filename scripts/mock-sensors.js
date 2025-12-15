const mqtt = require('mqtt');
const dotenv = require('dotenv');
dotenv.config();

// Configuration - Use HiveMQ Cloud
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtts://b12f446d03134355bd6026903779fbbb.s1.eu.hivemq.cloud:8883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'agri_bot';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'kHongbieT31';
const DEVICE_ID = 'esp32_mock_01';
const TOPIC = `sensors/${DEVICE_ID}/data`;  // Backend expects sensors/{serial}/data
const SECRET = process.env.MQTT_SECRET || 'default-secret';

// MQTT Connection Options
const options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: true, // Verify SSL certificate
  clientId: `mock_${Math.random().toString(16).slice(3)}`,
};

// Connect to MQTT Broker
const client = mqtt.connect(BROKER_URL, options);

client.on('connect', () => {
  console.log(`✅ Connected to HiveMQ Cloud at ${BROKER_URL}`);
  console.log(`📡 Simulating device: ${DEVICE_ID}`);
  console.log(`📤 Publishing to topic: ${TOPIC}`);
  
  // Start publishing loop
  setInterval(publishMockData, 10000); // Every 10 seconds
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
});

function publishMockData() {
  // Generate random sensor data
  const data = {
    deviceId: DEVICE_ID,
    temperature: +(25 + Math.random() * 10).toFixed(1), // 25-35°C
    humidity: +(60 + Math.random() * 20).toFixed(1),    // 60-80%
    soilMoisture: +(40 + Math.random() * 30).toFixed(1), // 40-70%
    lightLevel: Math.floor(1000 + Math.random() * 5000), // 1000-6000 Lux
    timestamp: new Date().toISOString(),
    secret: SECRET,
  };

  const payload = JSON.stringify(data);
  client.publish(TOPIC, payload);
  
  console.log(`[${new Date().toLocaleTimeString()}] 📊 Published:`, payload);
}
