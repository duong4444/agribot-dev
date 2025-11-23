const mqtt = require('mqtt');

// Configuration
const BROKER_URL = 'mqtt://localhost:1883';
const DEVICE_ID = 'esp32_mock_01';
const TOPIC = `sensors/${DEVICE_ID}/data`;

// Connect to MQTT Broker
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log(`Connected to MQTT Broker at ${BROKER_URL}`);
  console.log(`Simulating device: ${DEVICE_ID}`);
  console.log(`Publishing to topic: ${TOPIC}`);
  
  // Start publishing loop
  setInterval(publishMockData, 15000); // Every 15 seconds
});

client.on('error', (err) => {
  console.error('MQTT Error:', err);
});

function publishMockData() {
  // Generate random sensor data
  const data = {
    deviceId: DEVICE_ID,
    temperature: +(25 + Math.random() * 10).toFixed(1), // 25-35°C
    humidity: +(60 + Math.random() * 20).toFixed(1),    // 60-80%
    soilMoisture: +(40 + Math.random() * 30).toFixed(1), // 40-70%
    lightLevel: Math.floor(1000 + Math.random() * 5000), // 1000-6000 Lux
    timestamp: new Date().toISOString()
  };

  const payload = JSON.stringify(data);
  client.publish(TOPIC, payload);
  
  console.log(`[${new Date().toLocaleTimeString()}] Published:`, payload);
}
