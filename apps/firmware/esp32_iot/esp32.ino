#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <EEPROM.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ================= DEVICE CONFIG =================
String DEVICE_ID = ""; // auto from MAC
#define MQTT_SECRET   "k2m0a2c2t270c27"

// ================= WIFI CONFIG =================
const char* ssid = "TienLoc";
const char* wifi_password = "khanhquan";

// ================= HIVEMQ CLOUD CONFIG =================
const char* mqtt_server = "b12f446d03134355bd6026903779fbbb.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "agri_bot";
const char* mqtt_pass = "kHongbieT31";

// ================= HARDWARE PINS =================
#define DHT_PIN           4
#define SOIL_PIN          34
#define LIGHT_PIN_A       32
#define LIGHT_PIN_D       33
#define PUMP_PIN          18
#define LED_PIN           19

#define DHT_TYPE DHT11
DHT dht(DHT_PIN, DHT_TYPE);

WiFiClientSecure espClient;
PubSubClient client(espClient);

// ================= MEMORY (EEPROM) =================
#define EE_ADDR_DURATION        0
#define EE_ADDR_COOLDOWN        1
#define EE_ADDR_WATER_ENABLED   2
#define EE_ADDR_WATER_THRESHOLD 3  // float: 4 bytes (3-6)
#define EE_ADDR_LIGHT_ENABLED   7
#define EE_ADDR_LIGHT_THRESHOLD 8  // int: 2 bytes (8-9)

// ================= INTERVALS =================
unsigned long lastSensorSend = 0;
#define SEND_INTERVAL 10000

bool pumpOn = false;
bool lightOn = false;
bool manualLightControl = false;  // 🔧 Track if light is under manual control
bool deviceOnlineSent = false;

// ================= AUTOMATION MODE =================
struct {
  bool enabled = false;
  float threshold = 30;
  int duration = 30;
  int cooldown = 3600;
  unsigned long lastIrrigationTime = 0;
} autoWater;

struct {
  bool enabled = false;
  int threshold = 300;
} autoLight;

// ================= IRRIGATION STATE =================
bool irrigating = false;
unsigned long irrigationStart = 0;
int irrigationDuration = 0;
unsigned long lastCountdownSend = 0;

// ===================================================
// DEVICE ID AUTO GENERATE
// ===================================================
String getDeviceID(){
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toLowerCase();
  return "esp_" + mac;
}

// ===================================================
// SENSOR READERS
// ===================================================
float readLightLux() {
  int rawValue = analogRead(LIGHT_PIN_A);
  
  // LM393 + LDR: Voltage divider output (0-3.3V → 0-4095 ADC)
  // LDR resistance is inversely proportional to light intensity (non-linear)
  // Lower ADC value = More light (voltage pulled down by LDR with low resistance)
  // Higher ADC value = Less light (LDR has high resistance)
  
  // Invert and apply exponential mapping for LDR characteristics
  // Formula: lux ≈ k * ((Vmax - V) / V)^gamma
  float normalizedValue = (4095 - rawValue) / 4095.0; // Invert: 0 (dark) → 1 (bright)
  
  // Exponential conversion with gamma ≈ 1.5 (typical for photoresistors)
  // Scale to reasonable lux range: 0-10000 lux
  float lux = pow(normalizedValue, 1.5) * 10000.0;
  
  return constrain(lux, 0, 10000);
}
float readTemperature(){ float t=dht.readTemperature(); return isnan(t)?-999:t; }
float readHumidity(){ float h=dht.readHumidity(); return isnan(h)?-999:h; }
float readSoil(){ return constrain(map(analogRead(SOIL_PIN),4095,0,0,100),0,100); }

// ===================================================
// WIFI + MQTT
// ===================================================
void setupWiFi(){
  WiFi.begin(ssid, wifi_password);
  int tries = 0;
while(WiFi.status() != WL_CONNECTED && tries < 20){ delay(500); tries++; }
  if(WiFi.status() != WL_CONNECTED) ESP.restart();
}

void publishStatus(String event){
  Serial.print("📤 publishStatus() called with event: "); Serial.println(event);
  
  DynamicJsonDocument doc(600);
  doc["deviceId"]=DEVICE_ID;
  doc["event"]=event;
  doc["pumpOn"]=pumpOn;
  doc["autoMode"]=autoWater.enabled;
  doc["soilMoisture"]=readSoil();
  doc["timestamp"]=millis();

  if(event == "auto_mode_updated"){
    JsonObject cfg = doc.createNestedObject("autoConfig");
    cfg["enabled"]=autoWater.enabled;
    cfg["threshold"]=autoWater.threshold;
    cfg["duration"]=autoWater.duration;
    cfg["cooldown"]=autoWater.cooldown;
    cfg["lastIrrigationTime"]=autoWater.lastIrrigationTime;
    Serial.println("  → Added autoConfig object");
  }

  if(event == "light_auto_updated"){
    JsonObject cfg = doc.createNestedObject("config");
    cfg["enabled"]=autoLight.enabled;
    cfg["threshold"]=autoLight.threshold;
    Serial.println("  → Added light config object");
  }

  if(event == "irrigation_started"){
    doc["duration"] = irrigationDuration;
    Serial.println("  → Added duration field");
  }

  String out; serializeJson(doc,out);
  String topic = "sensors/"+DEVICE_ID+"/status";
  
  Serial.print("Topic: "); Serial.println(topic);
  Serial.print("Payload: "); Serial.println(out);
  
  bool result = client.publish(topic.c_str(), out.c_str());
  
  if(result) {
    Serial.println("✅ MQTT publish SUCCESS!");
  } else {
    Serial.println("❌ MQTT publish FAILED!");
    Serial.print("MQTT connected: "); Serial.println(client.connected());
    Serial.print("MQTT state: "); Serial.println(client.state());
  }
}

void publishStatusWithDuration(String event, int duration){
  DynamicJsonDocument doc(600);
  doc["deviceId"]=DEVICE_ID;
  doc["event"]=event;
  doc["pumpOn"]=pumpOn;
  doc["autoMode"]=autoWater.enabled;
  doc["duration"]=duration;
  doc["soilMoisture"]=readSoil();
  doc["timestamp"]=millis();
  
  String out; serializeJson(doc,out);
  client.publish(("sensors/"+DEVICE_ID+"/status").c_str(), out.c_str());
}

void publishSensorData(){
  DynamicJsonDocument doc(400);
  doc["deviceId"]=DEVICE_ID;
  doc["secret"]=MQTT_SECRET;
  doc["temperature"]=readTemperature();
  doc["humidity"]=readHumidity();
  doc["soilMoisture"]=readSoil();
  doc["lightLevel"]=readLightLux();
  doc["timestamp"]=millis();
  String out; serializeJson(doc,out);
  client.publish(("sensors/"+DEVICE_ID+"/data").c_str(), out.c_str());
}

// ===================================================
// COMMAND HANDLING - FIX DURATION BUG!!!
// ===================================================
void handleCommand(DynamicJsonDocument &doc){
  Serial.println("========== COMMAND RECEIVED ==========");
  
  // Check secret first
  String receivedSecret = doc["secret"] | "";
  Serial.print("Received secret: "); Serial.println(receivedSecret);
  Serial.print("Expected secret: "); Serial.println(MQTT_SECRET);
  
  if(doc["secret"]!=MQTT_SECRET) {
    Serial.println("❌ SECRET MISMATCH - Command rejected!");
    return;
  }
  
  String action = doc["action"] | "";
  String component = doc["component"] | "";
  
  Serial.print("✅ Secret OK | Action: "); Serial.print(action);
  Serial.print(" | Component: "); Serial.println(component);

  // --- UPDATE AUTO MODE ---
  if(action == "set_auto_mode"){
    Serial.println("🔧 Processing set_auto_mode...");
    
    // Use containsKey to properly handle false values
    if(doc.containsKey("enabled")) autoWater.enabled = doc["enabled"].as<bool>();
    if(doc.containsKey("threshold")) autoWater.threshold = doc["threshold"].as<float>();
    if(doc.containsKey("duration")) autoWater.duration = doc["duration"].as<int>();
    if(doc.containsKey("cooldown")) autoWater.cooldown = doc["cooldown"].as<int>();
    
    Serial.print("  → enabled: "); Serial.println(autoWater.enabled);
    Serial.print("  → threshold: "); Serial.println(autoWater.threshold);
    Serial.print("  → duration: "); Serial.println(autoWater.duration);
    Serial.print("  → cooldown: "); Serial.println(autoWater.cooldown);
    
    // Save to EEPROM
    EEPROM.write(EE_ADDR_DURATION, autoWater.duration);
    EEPROM.write(EE_ADDR_COOLDOWN, autoWater.cooldown);
    EEPROM.write(EE_ADDR_WATER_ENABLED, autoWater.enabled ? 1 : 0);
    EEPROM.put(EE_ADDR_WATER_THRESHOLD, autoWater.threshold);
    EEPROM.commit();
    Serial.println("  → Saved to EEPROM");
    
    Serial.println("📤 Publishing auto_mode_updated status...");
    publishStatus("auto_mode_updated");
    Serial.println("✅ Status published!");
    return;
  }

  // --- MANUAL PUMP ON/OFF ---
  if(action=="turn_on" && component=="pump"){
    irrigating = false;
irrigationDuration = 0;  // Reset duration to prevent conflicts
    pumpOn = true;
    digitalWrite(PUMP_PIN,HIGH);
    publishStatus("pump_on");
    return;
  }

  if(action=="turn_off" && component=="pump"){
    irrigating = false;
    pumpOn = false;
    digitalWrite(PUMP_PIN,LOW);
    
    // Force cooldown to prevent auto mode from immediately re-triggering
    autoWater.lastIrrigationTime = millis();
    
    publishStatus("pump_off");
    return;
  }

  // --- IRRIGATE (DURATION FROM BE, IGNORE COOLDOWN) ---
  if(action == "irrigate"){
    if(doc.containsKey("duration")) irrigationDuration = doc["duration"];
    else irrigationDuration = autoWater.duration;

    irrigating = true;
    pumpOn = true;
    irrigationStart = millis();
    digitalWrite(PUMP_PIN,HIGH);

    publishStatus("irrigation_started");
    return;
  }

  // --- MANUAL LIGHT ---
  if(action=="turn_on_light"){ 
    manualLightControl = true;  // 🔧 Mark as manual control
    lightOn=true; 
    digitalWrite(LED_PIN,HIGH); 
    publishStatus("light_on"); 
    return; 
  }
  
  if(action=="turn_off_light"){ 
    manualLightControl = true;  // 🔧 Mark as manual control
    lightOn=false; 
    digitalWrite(LED_PIN,LOW); 
    publishStatus("light_off"); 
    return; 
  }

  // --- AUTO LIGHT ---
  if(action=="set_light_auto"){
    // Use containsKey to properly handle false values
    if(doc.containsKey("enabled")) autoLight.enabled = doc["enabled"].as<bool>();
    if(doc.containsKey("threshold")) autoLight.threshold = doc["threshold"].as<int>();
    
    // 🔧 When auto mode is enabled, release manual control
    if(autoLight.enabled) {
      manualLightControl = false;
    }
    
    // Save to EEPROM
    EEPROM.write(EE_ADDR_LIGHT_ENABLED, autoLight.enabled ? 1 : 0);
    EEPROM.put(EE_ADDR_LIGHT_THRESHOLD, autoLight.threshold);
    EEPROM.commit();
    
    publishStatus("light_auto_updated");
    return;
  }
}

// ===================================================
void callback(char* topic, byte* payload, unsigned int length){
  Serial.println("\n🔔 MQTT MESSAGE RECEIVED!");
  Serial.print("Topic: "); Serial.println(topic);
  Serial.print("Length: "); Serial.println(length);
  
  // Print raw payload
  Serial.print("Payload: ");
  for(int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
  
  DynamicJsonDocument doc(512);
  if(deserializeJson(doc,payload,length)) {
    Serial.println("❌ JSON deserialization FAILED!");
    return;
  }
  Serial.println("✅ JSON parsed successfully");
  
  handleCommand(doc);
}

void reconnectMQTT(){
  while(!client.connected()){
    if(client.connect(("ID_"+DEVICE_ID).c_str(),mqtt_user,mqtt_pass)){
      client.subscribe(("control/"+DEVICE_ID+"/command").c_str());
      if(!deviceOnlineSent){ deviceOnlineSent=true; publishStatus("device_online"); }
      return;
    }
    delay(2000);
  }
}

// ===================================================
// SETUP
// ===================================================
void setup(){
  Serial.begin(115200);
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);

  EEPROM.begin(64);
  
  // Restore Auto Water Config
  autoWater.duration = EEPROM.read(EE_ADDR_DURATION)==0xFF ? 30 : EEPROM.read(EE_ADDR_DURATION);
  autoWater.cooldown = EEPROM.read(EE_ADDR_COOLDOWN)==0xFF ? 3600 : EEPROM.read(EE_ADDR_COOLDOWN);
  
  byte waterEnabled = EEPROM.read(EE_ADDR_WATER_ENABLED);
  autoWater.enabled = (waterEnabled == 0xFF) ? false : (waterEnabled == 1);
  
  float waterThreshold;
  EEPROM.get(EE_ADDR_WATER_THRESHOLD, waterThreshold);
  autoWater.threshold = (isnan(waterThreshold) || waterThreshold == 0) ? 30.0 : waterThreshold;
  
  // Restore Auto Light Config
byte lightEnabled = EEPROM.read(EE_ADDR_LIGHT_ENABLED);
  autoLight.enabled = (lightEnabled == 0xFF) ? false : (lightEnabled == 1);
  
  int lightThreshold;
  EEPROM.get(EE_ADDR_LIGHT_THRESHOLD, lightThreshold);
  autoLight.threshold = (lightThreshold == 0 || lightThreshold == -1) ? 300 : lightThreshold;

  dht.begin();
  setupWiFi();

  DEVICE_ID = getDeviceID();
  Serial.println("DEVICE ID: " + DEVICE_ID);

  espClient.setInsecure();
  client.setServer(mqtt_server,mqtt_port);
  client.setBufferSize(512);  // 🔧 FIX: Increase buffer from default 128 to 512 bytes
  client.setCallback(callback);
  reconnectMQTT();
}

// ===================================================
// LOOP
// ===================================================
void loop(){
  if(WiFi.status()!=WL_CONNECTED) setupWiFi();
  if(!client.connected()) reconnectMQTT();
  client.loop();

  float soil = readSoil();

  // ---- IRRIGATION COUNTDOWN → FIX CHẠY ĐÚNG DURATION ----
  if(irrigating){
    int remain = irrigationDuration - (millis() - irrigationStart)/1000;
    if(remain <= 0){
      // Save duration before resetting state
      int completedDuration = irrigationDuration;
      
      irrigating = false;
      pumpOn = false;
      digitalWrite(PUMP_PIN, LOW);
      autoWater.lastIrrigationTime = millis();
      
      // Publish with actual duration
      publishStatusWithDuration("irrigation_completed", completedDuration);
    }
  }

  // ---- AUTO WATER (CHỈ HOẠT ĐỘNG KHI KHÔNG IRRIGATE TỪ BE VÀ KHÔNG BẬT THỦ CÔNG) ----
  if(autoWater.enabled && !irrigating && !pumpOn){
    bool cooldownOK = (millis()-autoWater.lastIrrigationTime) >= (autoWater.cooldown * 1000);
    if(soil < autoWater.threshold && cooldownOK){
      // Publish sensor data BEFORE turning on pump
      // This ensures backend receives the low soil moisture reading that triggered irrigation
      publishSensorData();
      
      irrigating=true;
      irrigationStart=millis();
      irrigationDuration=autoWater.duration;
      pumpOn=true;
      digitalWrite(PUMP_PIN,HIGH);
      publishStatus("irrigation_started");
    }
  }

  // ---- AUTO LIGHT (CHỈ HOẠT ĐỘNG KHI KHÔNG Ở CHẾ ĐỘ MANUAL) ----
  if(autoLight.enabled && !manualLightControl){
    float lux = readLightLux();
    if(lux < autoLight.threshold && !lightOn){ 
      lightOn=true; 
      digitalWrite(LED_PIN,HIGH); 
      publishStatus("light_on"); 
    }
    if(lux > autoLight.threshold && lightOn){ 
      lightOn=false; 
      digitalWrite(LED_PIN,LOW); 
      publishStatus("light_off"); 
    }
  }

  // ---- SEND SENSOR DATA ----
  if(millis() - lastSensorSend >= SEND_INTERVAL){
    lastSensorSend = millis();
    publishSensorData();
  }

  delay(30);
}