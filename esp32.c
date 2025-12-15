#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"


// ================= DEVICE CONFIG =================
#define DEVICE_ID     "ESP_001"              // Must match serialNumber in DB
#define MQTT_SECRET   "k2m0a2c2t270c27"     // Must match MQTT_SECRET in backend .env

// ================= WIFI CONFIG =================
const char* ssid = "Trung Tam TT-TV";
const char* wifi_password = "12345679";

// ================= HIVEMQ CLOUD CONFIG =================
const char* mqtt_server = "b12f446d03134355bd6026903779fbbb.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "agri_bot";
const char* mqtt_pass = "kHongbieT31";

// ================= HARDWARE PINS =================
#define DHT_PIN           4      // DHT11/DHT22 sensor
#define SOIL_PIN          34     // Soil moisture sensor (analog)
#define LIGHT_PIN_SENSOR  35     // Light sensor LDR (analog)
#define PUMP_PIN          18     // Relay for pump
#define LIGHT_PIN_RELAY   19     // Relay for light

// ================= SENSOR SETUP =================
#define DHT_TYPE DHT11           // Change to DHT22 if using DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ================= MQTT CLIENT =================
WiFiClientSecure espClient;
PubSubClient client(espClient);

// ================= TIMING =================
unsigned long lastSensorSend = 0;
#define SEND_INTERVAL 10000      // 30 seconds

// ================= DEVICE STATE =================
bool pumpOn = false;
bool lightOn = false;

// ================= AUTO MODE CONFIG =================
struct {
  bool enabled = false;
  float threshold = 30.0;        // Soil moisture threshold (%)
  int duration = 600;            // Irrigation duration (seconds)
  int cooldown = 3600;           // Cooldown period (seconds)
  unsigned long lastIrrigationTime = 0;
} autoWater;

struct {
  bool enabled = false;
  int threshold = 300;           // Light level threshold (lux)
} autoLight;

// ================= IRRIGATION TIMER =================
bool irrigating = false;
unsigned long irrigationStart = 0;
int irrigationDuration = 0;

// ================= FUNCTION DECLARATIONS =================
void setupWiFi();
void reconnectMQTT();
void callback(char* topic, byte* payload, unsigned int length);
void publishSensorData();
void publishStatus(const char* event);
void publishJSON(DynamicJsonDocument& doc, const char* topic);
float readTemperature();
float readHumidity();
float readSoilMoisture();
int readLightLevel();

// ================= WIFI SETUP =================
void setupWiFi() {
  Serial.print("📡 WiFi connecting to: ");
  Serial.println(ssid);
  WiFi.begin(ssid, wifi_password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("🌐 IP: ");
    Serial.println(WiFi.localIP());
} else {
    Serial.println("\n❌ WiFi failed → restarting in 5s");
    delay(5000);
    ESP.restart();
  }
}

// ================= SENSOR READING =================
float readTemperature() {
  float t = dht.readTemperature();
  if (isnan(t)) {
    Serial.println("⚠️ DHT temperature read error");
    return -999;  // Error flag
  }
  return t;
}

float readHumidity() {
  float h = dht.readHumidity();
  if (isnan(h)) {
    Serial.println("⚠️ DHT humidity read error");
    return -999;  // Error flag
  }
  return h;
}

float readSoilMoisture() {
  int raw = analogRead(SOIL_PIN);
  // Map ADC value (0-4095) to percentage (0-100)
  // Adjust calibration based on your sensor: dry=4095, wet=0
  float percent = map(raw, 4095, 0, 0, 100);
  return constrain(percent, 0, 100);
}

int readLightLevel() {
  int raw = analogRead(LIGHT_PIN_SENSOR);
  // Map ADC value to lux (adjust based on your LDR calibration)
  return map(raw, 0, 4095, 0, 1000);
}

// ================= PUBLISH HELPERS =================
void publishJSON(DynamicJsonDocument& doc, const char* topic) {
  String json;
  serializeJson(doc, json);

  if (client.publish(topic, json.c_str())) {
    Serial.print("📤 Published to ");
    Serial.print(topic);
    Serial.print(": ");
    Serial.println(json);
  } else {
    Serial.println("❌ Publish failed!");
  }
}

void publishSensorData() {
  float temp = readTemperature();
  float hum = readHumidity();

  // Skip publish if sensor error
  if (temp == -999 || hum == -999) {
    Serial.println("⚠️ Skipping sensor publish due to DHT error");
    return;
  }

  String topic = "sensors/" + String(DEVICE_ID) + "/data";

  DynamicJsonDocument doc(256);
  doc["deviceId"] = DEVICE_ID;
  doc["secret"] = MQTT_SECRET;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soilMoisture"] = readSoilMoisture();
  doc["lightLevel"] = readLightLevel();
  doc["timestamp"] = millis();

  publishJSON(doc, topic.c_str());
}

void publishStatus(const char* event) {
  String topic = "sensors/" + String(DEVICE_ID) + "/status";

  DynamicJsonDocument doc(512);
  doc["deviceId"] = DEVICE_ID;
  doc["event"] = event;
  doc["pumpOn"] = pumpOn;
  doc["lightOn"] = lightOn;
  doc["autoMode"] = autoWater.enabled;
  doc["soilMoisture"] = readSoilMoisture();
  doc["timestamp"] = millis();

  publishJSON(doc, topic.c_str());
}

// ================= MQTT CALLBACK - RECEIVE COMMANDS =================
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 Command from: ");
  Serial.println(topic);

  // Parse JSON
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("❌ JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  String action = doc["action"] | "";
  String component = doc["component"] | "";

  Serial.print("🎯 Action: ");
  Serial.print(action);
  if (component != "") {
    Serial.print(" | Component: ");
Serial.print(component);
  }
  Serial.println();

  // ========== PUMP CONTROL (Manual) ==========
  if (component == "pump") {
    if (action == "turn_on") {
      pumpOn = true;
      digitalWrite(PUMP_PIN, HIGH);
      Serial.println("✅ Pump ON (manual)");
      publishStatus("pump_on");
    }
    else if (action == "turn_off") {
      pumpOn = false;
      digitalWrite(PUMP_PIN, LOW);
      Serial.println("✅ Pump OFF (manual)");
      publishStatus("pump_off");
    }
  }

  // ========== IRRIGATE WITH DURATION ==========
  if (action == "irrigate") {
    irrigationDuration = doc["duration"] | 600;
    irrigating = true;
    irrigationStart = millis();

    pumpOn = true;
    digitalWrite(PUMP_PIN, HIGH);

    Serial.print("💧 Irrigation started for ");
    Serial.print(irrigationDuration);
    Serial.println(" seconds");

    publishStatus("irrigation_started");
  }

  // ========== AUTO WATER MODE CONFIG ==========
  if (action == "set_auto_mode") {
    autoWater.enabled = doc["enabled"] | false;
    autoWater.threshold = doc["threshold"] | 30.0;
    autoWater.duration = doc["duration"] | 600;
    autoWater.cooldown = doc["cooldown"] | 3600;

    Serial.print("⚙️ Auto irrigation: ");
    Serial.println(autoWater.enabled ? "ENABLED" : "DISABLED");
    Serial.print("  Threshold: ");
    Serial.print(autoWater.threshold);
    Serial.println("%");

    publishStatus("auto_mode_updated");
  }

  // ========== LIGHT CONTROL (Manual) ==========
  if (action == "turn_on_light") {
    lightOn = true;
    digitalWrite(LIGHT_PIN_RELAY, HIGH);
    Serial.println("💡 Light ON (manual)");
    publishStatus("light_on");
  }
  else if (action == "turn_off_light") {
    lightOn = false;
    digitalWrite(LIGHT_PIN_RELAY, LOW);
    Serial.println("💡 Light OFF (manual)");
    publishStatus("light_off");
  }

  // ========== AUTO LIGHT MODE CONFIG ==========
  if (action == "set_light_auto") {
    autoLight.enabled = doc["enabled"] | false;
    autoLight.threshold = doc["threshold"] | 300;

    Serial.print("⚙️ Auto light: ");
    Serial.println(autoLight.enabled ? "ENABLED" : "DISABLED");
    Serial.print("  Threshold: ");
    Serial.print(autoLight.threshold);
    Serial.println(" lux");

    publishStatus("light_auto_updated");
  }
}

// ================= MQTT RECONNECT =================
void reconnectMQTT() {
  int attempts = 0;

  while (!client.connected() && attempts < 3) {
    Serial.print("🔌 MQTT connecting...");

    // Random client ID to avoid conflicts
    String clientId = "ESP32_" + String(DEVICE_ID) + "_" + String(random(1000, 9999));

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println(" ✅ Connected!");

      // Subscribe to command topic
      String cmdTopic = "control/" + String(DEVICE_ID) + "/command";
      client.subscribe(cmdTopic.c_str());
      Serial.print("🔔 Subscribed to: ");
      Serial.println(cmdTopic);

      // Publish online status
publishStatus("device_online");
      return;
    } else {
      Serial.print(" ❌ Failed, rc=");
      Serial.println(client.state());
      attempts++;
      delay(2000);
    }
  }

  // If MQTT failed after 3 attempts, reconnect WiFi
  if (!client.connected()) {
    Serial.println("⚠️ MQTT failed → reconnecting WiFi");
    WiFi.disconnect();
    delay(1000);
    setupWiFi();
  }
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);

  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector

  Serial.println("\n========================================");
  Serial.println("🌾 AgriBot ESP32 - " + String(DEVICE_ID));
  Serial.println("========================================");

  // Initialize random seed
  randomSeed(analogRead(0));

  // Pin setup
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LIGHT_PIN_RELAY, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);        // Pump OFF initially
  digitalWrite(LIGHT_PIN_RELAY, LOW); // Light OFF initially

  // Sensor setup
  dht.begin();

  // WiFi setup
  setupWiFi();

  // MQTT setup
  espClient.setInsecure();  // Skip SSL certificate verification (for testing)
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(512);  // Increase buffer for large JSON messages

  reconnectMQTT();

  Serial.println("✅ ESP32 READY!\n");
}

// ================= MAIN LOOP =================
void loop() {
  // ========== MAINTAIN CONNECTIONS ==========
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost → reconnecting");
    setupWiFi();
  }

  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  // ========== PERIODIC SENSOR DATA PUBLISH ==========
  if (millis() - lastSensorSend >= SEND_INTERVAL) {
    lastSensorSend = millis();
    publishSensorData();
  }

  // ========== IRRIGATION TIMER (Duration-based) ==========
  if (irrigating) {
    if (millis() - irrigationStart >= irrigationDuration * 1000UL) {
      irrigating = false;
      pumpOn = false;
      digitalWrite(PUMP_PIN, LOW);

      Serial.println("💧 Irrigation completed");
      publishStatus("irrigation_completed");

      autoWater.lastIrrigationTime = millis();
    }
  }

  // ========== AUTO IRRIGATION MODE ==========
  if (autoWater.enabled && !pumpOn) {
    float soilMoisture = readSoilMoisture();
    unsigned long timeSinceLastIrrigation = millis() - autoWater.lastIrrigationTime;

    if (soilMoisture < autoWater.threshold &&
        timeSinceLastIrrigation >= autoWater.cooldown * 1000UL) {

      Serial.println("🤖 Auto irrigation triggered!");
      Serial.print("  Soil moisture: ");
      Serial.print(soilMoisture);
      Serial.print("% < Threshold: ");
      Serial.print(autoWater.threshold);
      Serial.println("%");

      irrigating = true;
      irrigationDuration = autoWater.duration;
      irrigationStart = millis();

      pumpOn = true;
      digitalWrite(PUMP_PIN, HIGH);

      publishStatus("irrigation_started");
    }
  }
// ========== AUTO LIGHT MODE ==========
  if (autoLight.enabled) {
    int lightLevel = readLightLevel();

    if (lightLevel < autoLight.threshold && !lightOn) {
      lightOn = true;
      digitalWrite(LIGHT_PIN_RELAY, HIGH);
      Serial.println("🤖 Auto light ON (low light detected)");
      publishStatus("light_on");
    }
    else if (lightLevel >= autoLight.threshold && lightOn) {
      lightOn = false;
      digitalWrite(LIGHT_PIN_RELAY, LOW);
      Serial.println("🤖 Auto light OFF (sufficient light)");
      publishStatus("light_off");
    }
  }

  delay(100);  // Small delay to prevent watchdog issues
}