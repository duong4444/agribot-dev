#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================= WIFI CONFIG ==================
const char* ssid = "khanhquan2";
const char* password = "trauvang";

// ================ MQTT CONFIG ====================
const char* mqtt_server = "broker.hivemq.com";
int mqtt_port = 1883;

const char* SUB_TOPIC = "iot/esp/command";
const char* PUB_TOPIC = "iot/esp/data";

// ============= DEVICE IDENTIFICATION =============
String DEVICE_ID = "esp01122025";
String SECRET = "k2m0a2c2t270c27";

// ============= PINS (Modify as needed) ===========
#define PUMP_PIN  18
#define LIGHT_PIN 19

// ============= SENSOR SIMULATION =================
float temperature = 0;
float humidity = 0;
float soilMoisture = 0;
int lightLevel = 0;

// ========== STATE VARIABLES ======================
bool pumpOn = false;
bool lightOn = false;
bool autoWaterMode = false;
bool autoLightMode = false;

// ======= AUTO MODE CONFIG (FROM BE) ==============
struct AutoWaterConfig {
  bool enabled = false;
  float threshold = 30;
  int duration = 600;
  int cooldown = 3600;
  unsigned long lastIrrigationTime = 0;
} autoWater;

// ====== AUTO LIGHT CONFIG ========================
struct AutoLightConfig {
  bool enabled = false;
  int threshold = 300;
} autoLight;

// ======= IRRIGATION TIMER ========================
bool irrigating = false;
unsigned long irrigationStart = 0;
int irrigationDuration = 0;

// ============= MQTT CLIENT =======================
WiFiClient espClient;
PubSubClient client(espClient);

// ==================================================
// Helper: Current timestamp
long long getTimestamp() {
  return millis();
}

// ==================================================
// PUBLISH JSON TO BACKEND
void publishJSON(DynamicJsonDocument& doc) {
  String json;
  serializeJson(doc, json);
  client.publish(PUB_TOPIC, json.c_str());
  Serial.println("[MQTT SEND] " + json);
}

// ==================================================
// SEND SENSOR DATA
void sendSensorData() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["secret"] = SECRET;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["lightLevel"] = lightLevel;
  doc["timestamp"] = getTimestamp();

  publishJSON(doc);
}

// ==================================================
// PUMP ON RESPONSE
void sendPumpOnEvent() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "pump_on";
  doc["pumpOn"] = pumpOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();

  publishJSON(doc);
}

// ==================================================
// PUMP OFF RESPONSE
void sendPumpOffEvent() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "pump_off";
  doc["pumpOn"] = pumpOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();

  publishJSON(doc);
}

// ==================================================
// IRRIGATION STARTED
void sendIrrigationStarted() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "irrigation_started";
  doc["pumpOn"] = true;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();
  doc["duration"] = irrigationDuration;

  publishJSON(doc);
}

// ==================================================
// IRRIGATION COMPLETED
void sendIrrigationCompleted() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "irrigation_completed";
  doc["pumpOn"] = false;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();
  doc["duration"] = 0;

  publishJSON(doc);
}

// ==================================================
// AUTO MODE UPDATED
void sendAutoModeUpdated() {
  DynamicJsonDocument doc(512);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "auto_mode_updated";
  doc["pumpOn"] = pumpOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();

  JsonObject cfg = doc.createNestedObject("autoConfig");
  cfg["enabled"] = autoWater.enabled;
  cfg["threshold"] = autoWater.threshold;
  cfg["duration"] = autoWater.duration;
  cfg["cooldown"] = autoWater.cooldown;
  cfg["lastIrrigationTime"] = autoWater.lastIrrigationTime;

  publishJSON(doc);
}

// ==================================================
// LIGHT UPDATED
void sendLightUpdated(const char* eventName) {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = eventName;
  doc["pumpOn"] = pumpOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();

  publishJSON(doc);
}

// ==================================================
// AUTO LIGHT UPDATED
void sendLightAutoUpdated() {
  DynamicJsonDocument doc(256);

  doc["deviceId"] = DEVICE_ID;
  doc["event"] = "light_auto_updated";
  doc["pumpOn"] = pumpOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = soilMoisture;
  doc["timestamp"] = getTimestamp();

  JsonObject cfg = doc.createNestedObject("config");
  cfg["enabled"] = autoLight.enabled;
  cfg["threshold"] = autoLight.threshold;

  publishJSON(doc);
}

// ==================================================
// MQTT CALLBACK — RECEIVE COMMANDS
void callback(char* topic, byte* message, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)message[i];
  Serial.println("[MQTT RX] " + msg);

  DynamicJsonDocument doc(512);
  deserializeJson(doc, msg);

  String action = doc["action"] | "";

  // ------------- PUMP ON ----------------
  if (action == "turn_on" && doc["component"] == "pump") {
    pumpOn = true;
    digitalWrite(PUMP_PIN, LOW);
    sendPumpOnEvent();
  }

  // ------------- PUMP OFF ----------------
  else if (action == "turn_off" && doc["component"] == "pump") {
    pumpOn = false;
    digitalWrite(PUMP_PIN, HIGH);
    sendPumpOffEvent();
  }

  // ------------- IRRIGATE DURATION -------
  else if (action == "irrigate") {
    irrigationDuration = doc["duration"];
    irrigating = true;
    irrigationStart = millis();

    pumpOn = true;
    digitalWrite(PUMP_PIN, LOW);

    sendIrrigationStarted();
  }

  // ------------- AUTO WATER MODE ----------
  else if (action == "set_auto_mode") {
    autoWater.enabled = doc["enabled"];
    autoWater.threshold = doc["threshold"];
    autoWater.duration = doc["duration"];
    autoWater.cooldown = doc["cooldown"];

    sendAutoModeUpdated();
  }

  // ------------- LIGHT ON ----------------
  else if (action == "turn_on_light") {
    lightOn = true;
    digitalWrite(LIGHT_PIN, LOW);
    sendLightUpdated("light_on");
  }

  // ------------- LIGHT OFF ---------------
  else if (action == "turn_off_light") {
    lightOn = false;
    digitalWrite(LIGHT_PIN, HIGH);
    sendLightUpdated("light_off");
  }

  // ------------- AUTO LIGHT MODE ----------
  else if (action == "set_light_auto") {
    autoLight.enabled = doc["enabled"];
    autoLight.threshold = doc["threshold"];

    sendLightAutoUpdated();
  }
}

// ==================================================
// CONNECT WIFI
void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

// ==================================================
// MQTT RECONNECT
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting MQTT...");
    if (client.connect("esp32_iot_client")) {
      Serial.println("Connected!");
      client.subscribe(SUB_TOPIC);
    } else {
      Serial.print("Failed. Retry...");
      delay(1000);
    }
  }
}

// ==================================================
// SETUP
void setup() {
  Serial.begin(9600);

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH);
  digitalWrite(LIGHT_PIN, HIGH);

  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ==================================================
// LOOP — MAIN LOGIC
unsigned long lastSensorSend = 0;

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // ---------- Send sensor data every 5 sec ----------
  if (millis() - lastSensorSend > 5000) {
    lastSensorSend = millis();

    // Simulation values
    temperature = random(250, 350) / 10.0;
    humidity = random(400, 800) / 10.0;
    soilMoisture = random(200, 600) / 10.0;
    lightLevel = random(100, 800);

    sendSensorData();
  }

  // ---------- IRRIGATION TIMER ----------
  if (irrigating) {
    if (millis() - irrigationStart >= irrigationDuration * 1000) {
      irrigating = false;
      pumpOn = false;
      digitalWrite(PUMP_PIN, HIGH);

      sendIrrigationCompleted();
    }
  }

  // ---------- AUTO WATER MODE ----------
  if (autoWater.enabled) {
    if (!pumpOn &&
        soilMoisture < autoWater.threshold &&
        millis() - autoWater.lastIrrigationTime > autoWater.cooldown * 1000) {

      irrigating = true;
      pumpOn = true;
      irrigationDuration = autoWater.duration;
      irrigationStart = millis();

      digitalWrite(PUMP_PIN, LOW);

      autoWater.lastIrrigationTime = millis();

      sendIrrigationStarted();
    }
  }

  // ---------- AUTO LIGHT MODE ----------
  if (autoLight.enabled) {
    if (lightLevel < autoLight.threshold && !lightOn) {
      lightOn = true;
      digitalWrite(LIGHT_PIN, LOW);
      sendLightUpdated("light_on");
    } else if (lightLevel >= autoLight.threshold && lightOn) {
      lightOn = false;
      digitalWrite(LIGHT_PIN, HIGH);
      sendLightUpdated("light_off");
    }
  }
}

