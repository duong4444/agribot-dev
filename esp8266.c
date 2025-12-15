#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
// ================= DEVICE CONFIG =================
#define DEVICE_ID     "ESP_001"
#define MQTT_SECRET   "k2m0a2c2t270c27"
// ================= WIFI =================
const char* ssid = "Trung Tam TT-TV";
const char* wifi_password = "12345679";
// ================= HIVEMQ CLOUD =================
const char* mqtt_server = "b12f446d03134355bd6026903779fbbb.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "agri_bot";
const char* mqtt_pass = "kHongbieT31";
// ================= MQTT =================
WiFiClientSecure espClient;
PubSubClient client(espClient);
unsigned long lastSend = 0;
// ================= CALLBACK - NHẬN LỆNH TỪ BACKEND =================
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 Message from: ");
  Serial.println(topic);
  
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.println("📦 Payload: " + msg);
  
  // TODO: Parse JSON và xử lý lệnh (turn_on, turn_off, irrigate, v.v.)
}
// ================= WIFI =================
void setupWiFi() {
  Serial.print("📡 WiFi connecting...");
  WiFi.begin(ssid, wifi_password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("🌐 IP: ");
  Serial.println(WiFi.localIP());
}
// ================= MQTT =================
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("🔌 MQTT connecting...");
    if (client.connect(DEVICE_ID, mqtt_user, mqtt_pass)) {
      Serial.println("✅ OK");
      
      // Subscribe vào topic nhận lệnh
      String cmdTopic = "control/" + String(DEVICE_ID) + "/command";
      client.subscribe(cmdTopic.c_str());
      Serial.println("🔔 Subscribed to: " + cmdTopic);
      
      // Báo online
      publishStatus("device_online");
    } else {
      Serial.print("❌ FAIL rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}
// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(500);
  
  randomSeed(analogRead(0));  // Init random
  setupWiFi();
  // TLS test mode
  espClient.setInsecure();
  client.setCallback(callback);
  client.setServer(mqtt_server, mqtt_port);
  reconnectMQTT();
}
// ================= PUBLISH SENSOR DATA =================
void publishSensorData() {
  String topic = "sensors/" + String(DEVICE_ID) + "/data";
  // Simulate sensor values
  float temp = 25.0 + random(0, 100) / 10.0;
  int humidity = 60 + random(0, 20);
  int soil = 400 + random(0, 200);
  int light = 500 + random(0, 500);
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"secret\":\"" + String(MQTT_SECRET) + "\",";
  json += "\"temperature\":" + String(temp) + ",";
  json += "\"humidity\":" + String(humidity) + ",";
  json += "\"soilMoisture\":" + String(soil) + ",";
  json += "\"lightLevel\":" + String(light);
  json += "}";
  client.publish(topic.c_str(), json.c_str());
  Serial.println("📤 PUBLISHED: " + json);
}
// ================= PUBLISH STATUS =================
void publishStatus(const char* event) {
  String topic = "sensors/" + String(DEVICE_ID) + "/status";
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"event\":\"" + String(event) + "\"";
  json += "}";
  client.publish(topic.c_str(), json.c_str(), true);
  Serial.println("📡 STATUS: " + json);
}
// ================= LOOP =================
void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();
  if (millis() - lastSend > 30000) {
    lastSend = millis();
    publishSensorData();
  }
}