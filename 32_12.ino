#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <Adafruit_NeoPixel.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// --- KONFIGURACJA LOGIKI PRZEKAŹNIKÓW ---
#define RELAY_ON LOW
#define RELAY_OFF HIGH
#define MOSFET_ON HIGH
#define MOSFET_OFF LOW

// --- BITMAPY IKON ---
const unsigned char icon_temp_bitmap[] PROGMEM = {
  0x18, 0x3C, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 
  0x24, 0x24, 0x5A, 0x99, 0x81, 0x81, 0x42, 0x3C
}; 
const unsigned char icon_hum_bitmap[] PROGMEM = {
  0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0xFF, 0x7E, 0x3C
}; 

// --- KONFIGURACJA PINÓW ---
// UWAGA: Utrzymujemy zamianę (DHT na D3, LED na D2), bo to najlepsza opcja
#define DHTPIN D3
#define DHTTYPE DHT22
#define RELAY_MATA D1      
#define MOS_WIATRACZEK 3   // RX
#define MOS_MGLA 1         // TX
#define RGB_PIN D2         // PIN CZYSTY (bez pull-up)
#define NUM_LEDS 120

#define TFT_CS D8
#define TFT_DC D4
#define TFT_RST D0
#define TFT_LITE D6        
#define BUTTON_PIN A0

const float TEMP_MARGIN = 0.5;
const int HUM_MARGIN = 5;

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);
Adafruit_NeoPixel strip(NUM_LEDS, RGB_PIN, NEO_GRB + NEO_KHZ800);

FirebaseData fbdo;
FirebaseData fbdoStream;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

StaticJsonDocument<1024> doc;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "europe.pool.ntp.org", 3600); 

// ZMIENNE STANU
float temp = 0.0, hum = 0.0;
bool st_led = false, st_mgla = false, st_fan = false, st_mata = false;
bool auto_mode = true; 

int r_val = 255, g_val = 255, b_val = 255; 
// Bezpieczna jasność startowa
int led_brightness = 30;  
int screen_brightness = 800;   
String led_mode = "static"; 

float day_temp = 28.0, night_temp = 22.0;
int day_hum = 60, night_hum = 80;
String day_start = "08:00";
String night_start = "20:00";

float target_temp = 28.0;
int target_hum = 60;
bool is_day_mode = true; 

bool in_menu = false;
int menu_pos = 0; 
bool is_editing = false;
unsigned long last_interaction = 0;
unsigned long last_blink = 0;
bool blink_state = true; 
unsigned long last_effect_time = 0;
unsigned long last_history_upload = 0;

// --- FLAGI AKTUALIZACJI ---
volatile bool update_leds_needed = true;
volatile bool update_screen_needed = true;
bool is_led_actually_on = false; // Pomocnicza flaga stanu fizycznego

// Deklaracje funkcji
void streamCallback(StreamData data);
void streamTimeoutCallback(bool timeout);
void handleAutomation();
int timeStringToMinutes(String timeStr);
void updateActuators();
void toggleDevice(int pos);
void checkReset();
void drawMainScreen();
void drawMenu();
void handleLEDEffects();
void handleSensorsAndFirebase();
void handleButtons();

void setup() {
  // [WAŻNE] Zwiększenie taktowania CPU do 160MHz
  system_update_cpu_freq(160);

  // Serial.begin(115200); // USUNIĘTE: Konflikt z MOS_WIATRACZEK i MOS_MGLA
  
  pinMode(MOS_WIATRACZEK, FUNCTION_3); 
  pinMode(MOS_MGLA, FUNCTION_3); 
  pinMode(RELAY_MATA, OUTPUT);
  pinMode(MOS_WIATRACZEK, OUTPUT);
  pinMode(MOS_MGLA, OUTPUT);
  pinMode(TFT_LITE, OUTPUT);
  
  analogWrite(TFT_LITE, screen_brightness); 

  digitalWrite(RELAY_MATA, RELAY_OFF);
  digitalWrite(MOS_MGLA, RELAY_OFF); 
  digitalWrite(MOS_WIATRACZEK, MOSFET_OFF);

  dht.begin();
  strip.begin();
  strip.setBrightness(led_brightness);
  strip.clear();
  strip.show(); 

  tft.initR(INITR_BLACKTAB); 
  tft.setRotation(3);
  tft.fillScreen(ST77XX_BLACK);
  
  tft.setCursor(10, 50);
  tft.setTextColor(ST77XX_GREEN);
  tft.print("Laczenie WiFi...");

  WiFi.begin("Ancymony1", "kompromisacja");
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  fbConfig.host = "terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app";
  fbConfig.signer.tokens.legacy_token = "Rocy0No78yp0PKTwfvBVrqi8qXBY2PUNbPsKb6xw";
  
  fbdoStream.setBSSLBufferSize(2048, 1024);
  fbdoStream.setResponseSize(2048);

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  timeClient.begin();

  if (!Firebase.beginStream(fbdoStream, "/")) {
     // Serial wyłączony - nie drukujemy błędów
  }
  Firebase.setStreamCallback(fbdoStream, streamCallback, streamTimeoutCallback);
  
  tft.fillScreen(ST77XX_BLACK);
}

void loop() {
  timeClient.update();
  
  // 1. Obsługa flag sprzętowych
  if (update_screen_needed) {
    analogWrite(TFT_LITE, screen_brightness);
    update_screen_needed = false;
  }

  // 2. Logika
  handleSensorsAndFirebase(); 
  handleButtons();
  handleLEDEffects(); 
  
  if (auto_mode) {
      handleAutomation();
  }

  if (in_menu && (millis() - last_interaction > 15000)) {
    in_menu = false; is_editing = false; tft.fillScreen(ST77XX_BLACK);
  }

  if (in_menu) drawMenu();
  else drawMainScreen();
  
  checkReset();
  
  delay(1); 
}

void handleAutomation() {
    int current_minutes = timeClient.getHours() * 60 + timeClient.getMinutes();
    int start_day_min = timeStringToMinutes(day_start);
    int start_night_min = timeStringToMinutes(night_start);
    
    if (current_minutes >= start_day_min && current_minutes < start_night_min) {
        if (!is_day_mode) is_day_mode = true;
        target_temp = day_temp;
        target_hum = day_hum;
    } else {
        if (is_day_mode) is_day_mode = false;
        target_temp = night_temp;
        target_hum = night_hum;
    }
    
    if (temp < (target_temp - TEMP_MARGIN)) st_mata = true;
    else if (temp >= target_temp) st_mata = false;

    if (hum < (target_hum - HUM_MARGIN)) st_mgla = true;
    else if (hum >= target_hum) st_mgla = false;

    if (temp > (target_temp + TEMP_MARGIN) || hum > (target_hum + 10)) st_fan = true;
    else if (temp <= target_temp && hum <= target_hum) st_fan = false;
}

int timeStringToMinutes(String timeStr) {
    int separatorIndex = timeStr.indexOf(':');
    if (separatorIndex == -1) return 0;
    int h = timeStr.substring(0, separatorIndex).toInt();
    int m = timeStr.substring(separatorIndex + 1).toInt();
    return h * 60 + m;
}

void streamCallback(StreamData data) {
  String path = data.dataPath();
  
  if (path == "/actuators/led") {
      bool newVal = data.boolData();
      if(st_led != newVal) { st_led = newVal; update_leds_needed = true; }
      return; 
  }
  if (path == "/actuators/brightness") {
      int newVal = data.intData();
      if(led_brightness != newVal) { led_brightness = newVal; strip.setBrightness(led_brightness); update_leds_needed = true; }
      return;
  }
  if (path == "/actuators/heater") { if (!auto_mode) st_mata = data.boolData(); return; }
  if (path == "/actuators/mist") { if (!auto_mode) st_mgla = data.boolData(); return; }
  if (path == "/actuators/fan") { if (!auto_mode) st_fan = data.boolData(); return; }
  
  if (path == "/actuators/led_mode") {
      String newVal = data.stringData();
      if(led_mode != newVal) { led_mode = newVal; update_leds_needed = true; }
      return;
  }
  if (path == "/settings/auto_enabled") {
      auto_mode = data.boolData();
      return;
  }
  if (path == "/settings/lcd_brightness") {
      int newVal = data.intData();
      if(screen_brightness != newVal) { screen_brightness = newVal; update_screen_needed = true; }
      return;
  }

  if (path == "/" || path == "/actuators" || path == "/settings") {
    String json = data.jsonString();
    if (json.length() > 0) {
      DeserializationError error = deserializeJson(doc, json);
      if (!error) {
         JsonObject root = doc.as<JsonObject>();
         if (doc.containsKey("actuators")) root = doc["actuators"];
         
         bool changeDetected = false;

         if (root.containsKey("led_r")) { int n = root["led_r"]; if(r_val != n) { r_val = n; changeDetected = true; } }
         if (root.containsKey("led_g")) { int n = root["led_g"]; if(g_val != n) { g_val = n; changeDetected = true; } }
         if (root.containsKey("led_b")) { int n = root["led_b"]; if(b_val != n) { b_val = n; changeDetected = true; } }
         if (root.containsKey("led_mode")) { String n = root["led_mode"].as<String>(); if(led_mode != n) { led_mode = n; changeDetected = true; } }
         if (root.containsKey("led")) { bool n = root["led"]; if(st_led != n) { st_led = n; changeDetected = true; } }
         
         if (root.containsKey("brightness")) { 
            int n = root["brightness"];
            if(led_brightness != n) { 
                led_brightness = n; 
                strip.setBrightness(led_brightness); 
                changeDetected = true; 
            }
         }
         
         if (changeDetected) {
             update_leds_needed = true;
         }
         
         if (!auto_mode) {
             if (root.containsKey("fan")) st_fan = root["fan"];
             if (root.containsKey("mist")) st_mgla = root["mist"];
             if (root.containsKey("heater")) st_mata = root["heater"];
         }
         
         JsonObject setRoot = doc.as<JsonObject>();
         if (doc.containsKey("settings")) setRoot = doc["settings"];
         
         if (setRoot.containsKey("auto_enabled")) auto_mode = setRoot["auto_enabled"];
         if (setRoot.containsKey("lcd_brightness")) {
             int n = setRoot["lcd_brightness"];
             if(screen_brightness != n) { screen_brightness = n; update_screen_needed = true; }
         }
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) { }

// --- NAPRAWIONA FUNKCJA LED - TRYB INPUT ---
void handleLEDEffects() {
  // 1. WYŁĄCZANIE (OFF)
  if (!st_led) {
    if (update_leds_needed || is_led_actually_on) { 
       
       // a) Wyślij czarny kolor
       for(int i=0; i<NUM_LEDS; i++) {
           strip.setPixelColor(i, 0, 0, 0);
       }
       strip.show();
       
       // b) Czekaj na stabilizację
       delay(50); 
       
       // c) Wyślij ponownie
       strip.show();
       delay(2);

       // d) FIX OSTATECZNY: Ustaw pin jako INPUT (wysoka impedancja)
       // To odcina pin elektronicznie, jakbyś uciął kabel
       pinMode(RGB_PIN, INPUT); 

       update_leds_needed = false;
       is_led_actually_on = false; 
    }
    
    // Upewnij się, że pin jest cały czas odłączony, gdy LED off
    pinMode(RGB_PIN, INPUT); 
    
    return;
  }
  
  // 2. WŁĄCZANIE (ON)
  // Jeśli włączamy, musimy przywrócić pin jako OUTPUT
  if (!is_led_actually_on) {
      pinMode(RGB_PIN, OUTPUT);
      // Opcjonalnie: krótki delay żeby pin wstał
      delay(1);
  }

  is_led_actually_on = true;

  if (led_brightness < 5) led_brightness = 5; 

  // --- EFEKTY ---
  if (led_mode == "static") {
    if (update_leds_needed) {
       strip.setBrightness(led_brightness);
       strip.fill(strip.Color(r_val, g_val, b_val));
       strip.show();
       update_leds_needed = false;
    }
  } 
  else if (led_mode == "fire") {
    if (millis() - last_effect_time > 80) { 
      last_effect_time = millis();
      strip.setBrightness(led_brightness);
      for(int i=0; i<NUM_LEDS; i++) {
        int flicker = random(0, 50);
        int r = r_val; int g = r_val/3; 
        strip.setPixelColor(i, max(0, r-flicker), max(0, g-flicker), 0);
      }
      strip.show();
    }
  }
  else if (led_mode == "storm") {
    static unsigned long lastStormFrame = 0;
    if (millis() - lastStormFrame > 50) {
        lastStormFrame = millis();
        if (random(0, 100) > 97) { 
            strip.setBrightness(255); 
            strip.fill(strip.Color(255, 255, 255)); 
            strip.show(); 
            delay(30); 
            strip.setBrightness(led_brightness);
            strip.fill(strip.Color(10, 10, 30)); 
            strip.show(); 
        } 
        else { 
            static unsigned long lastBgRefresh = 0;
            if (millis() - lastBgRefresh > 2000) {
               lastBgRefresh = millis();
               strip.setBrightness(led_brightness);
               strip.fill(strip.Color(10, 10, 30)); 
               strip.show(); 
            }
        }
    }
  }
  else if (led_mode == "sunrise") {
    if (update_leds_needed) {
        strip.setBrightness(led_brightness);
        strip.fill(strip.Color(255, 140, 30)); 
        strip.show();
        update_leds_needed = false;
    }
  }
}

void handleSensorsAndFirebase() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate < 3000) return;
  lastUpdate = millis();

  float newT = dht.readTemperature();
  float newH = dht.readHumidity();
  if (!isnan(newT)) temp = newT;
  if (!isnan(newH)) hum = newH;

  digitalWrite(RELAY_MATA, st_mata ? RELAY_ON : RELAY_OFF);
  digitalWrite(MOS_MGLA, st_mgla ? RELAY_ON : RELAY_OFF); 
  digitalWrite(MOS_WIATRACZEK, st_fan ? MOSFET_ON : MOSFET_OFF);

  FirebaseJson json;
  json.set("temperature", temp);
  json.set("humidity", hum);
  json.set("timestamp", timeClient.getEpochTime() - 3600); 
  json.set("last_sync", timeClient.getFormattedTime());
  Firebase.updateNode(fbdo, "/readings", json);
  
  FirebaseJson actJson;
  actJson.set("led", st_led); 
  if (auto_mode) {
      actJson.set("heater", st_mata);
      actJson.set("mist", st_mgla);
      actJson.set("fan", st_fan);
  }
  Firebase.updateNode(fbdo, "/actuators", actJson);

  if (millis() - last_history_upload > 900000) { 
      last_history_upload = millis();
      FirebaseJson histJson;
      histJson.set("t", temp);
      histJson.set("h", hum);
      String timestampStr = String(timeClient.getEpochTime() - 3600); 
      Firebase.updateNode(fbdo, "/history/" + timestampStr, histJson);
  }
}

void handleButtons() {
  int val = analogRead(BUTTON_PIN);
  if (val < 20) return;
  static unsigned long lastB = 0;
  if (millis() - lastB < 200) return; 
  lastB = millis(); last_interaction = millis();

  if (!in_menu) {
    if (val < 150 || val > 300) { in_menu = true; tft.fillScreen(ST77XX_BLACK); }
    else if (val >= 160 && val <= 280) { 
        st_led = !st_led; 
        update_leds_needed = true; 
        updateActuators(); 
    }
  } else {
      if (is_editing) {
          if (val < 150) { 
             if(menu_pos == 0) target_temp -= 0.5;
             if(menu_pos == 1) target_hum -= 1.0;
             if(menu_pos == 2) { 
                 screen_brightness -= 50; 
                 if(screen_brightness<0) screen_brightness=0; 
                 update_screen_needed = true; 
             }
          } else if (val > 300) { 
             if(menu_pos == 0) target_temp += 0.5;
             if(menu_pos == 1) target_hum += 1.0;
             if(menu_pos == 2) { 
                 screen_brightness += 50; 
                 if(screen_brightness>1023) screen_brightness=1023; 
                 update_screen_needed = true; 
             }
          } else if (val >= 160 && val <= 280) { is_editing = false; }
      } else {
        if (val < 150) menu_pos = (menu_pos <= 0) ? 5 : menu_pos - 1;
        else if (val > 300) menu_pos = (menu_pos >= 5) ? 0 : menu_pos + 1;
        else if (val >= 160 && val <= 280) {
           if (menu_pos < 3) is_editing = true;
           else { toggleDevice(menu_pos); updateActuators(); }
        }
      }
  }
}

void toggleDevice(int pos) {
  if (pos == 3) { st_led = !st_led; update_leds_needed = true; }
  if (pos == 4) st_mata = !st_mata;
  if (pos == 5) st_fan = !st_fan;
}

void updateActuators() {
  Firebase.setBool(fbdo, "/actuators/led", st_led);
  if(!auto_mode) {
      Firebase.setBool(fbdo, "/actuators/heater", st_mata);
      Firebase.setBool(fbdo, "/actuators/mist", st_mgla);
      Firebase.setBool(fbdo, "/actuators/fan", st_fan);
  }
}

void checkReset() {
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 10000) {
        lastCheck = millis();
        if (Firebase.getBool(fbdo, "/system/reset")) {
            if (fbdo.boolData() == true) {
                Firebase.setBool(fbdo, "/system/reset", false);
                delay(1000);
                ESP.restart();
            }
        }
    }
}

void drawMainScreen() {
  static unsigned long last_screen_update = 0;
  if (millis() - last_screen_update < 1000) return;
  last_screen_update = millis();

  tft.setCursor(35, 10); 
  tft.setTextSize(3); 
  tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
  tft.print(timeClient.getFormattedTime().substring(0,5));

  tft.drawBitmap(10, 60, icon_temp_bitmap, 8, 16, ST77XX_RED);
  tft.setCursor(35, 60); 
  tft.setTextSize(2); 
  tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
  tft.print(temp,1); tft.print("C");
  
  tft.drawBitmap(10, 95, icon_hum_bitmap, 8, 8, ST77XX_BLUE);
  tft.setCursor(35, 95); 
  tft.print(hum,0); tft.print("%");
  
  tft.fillRect(55, 122, 50, 2, st_led ? ST77XX_GREEN : ST77XX_RED);
}

void drawMenu() {
  if (millis() - last_blink > 400) { last_blink = millis(); blink_state = !blink_state; }
  const char* labels[] = {"CEL T", "CEL H", "JAS EKR", "LED", "MATA", "FAN"};
  
  for (int i = 0; i < 6; i++) {
    int col = i / 2; int row = i % 2;
    int x = 5 + (col * 52); int y = 5 + (row * 58);
    uint16_t rectCol = (menu_pos == i) ? (is_editing && !blink_state ? ST77XX_BLACK : ST77XX_YELLOW) : ST77XX_WHITE;
    tft.drawRect(x, y, 48, 54, rectCol);
    tft.setTextSize(1); tft.setCursor(x+4, y+5); tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
    tft.print(labels[i]);
    
    if (i == 0) { tft.setCursor(x+5, y+25); tft.print(target_temp,1); }
    if (i == 1) { tft.setCursor(x+5, y+25); tft.print(target_hum,0); }
    if (i == 2) { tft.setCursor(x+5, y+25); tft.print(screen_brightness/10); tft.print("%"); }
    
    if (i >= 3) {
      bool act = (i==3?st_led : (i==4?st_mata : (i==5?st_fan : false)));
      tft.fillRect(x+10, y+45, 28, 2, act ? ST77XX_GREEN : ST77XX_RED);
    }
  }
}
