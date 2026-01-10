/*
  ===============================================================
  🦎 TERRARIUM IoT PRO v3.5 - dla Gekona Orzęsionego
  ===============================================================
  ✅ ZMIANY:
  - Margines temperatury: 1.0°C (było 0.5°C)
  - Margines wilgotności: 7% (było 5%)
  - Wiatrak włącza się przy temp > cel + 2°C
  - Wiatrak włącza się przy wilg > cel + 15%
  - Pasek LED skrócony i wycentrowany (jak godzina)
  ===============================================================
*/

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
#define DHTPIN D3
#define DHTTYPE DHT22
#define RELAY_MATA D1      
#define MOS_WIATRACZEK 3   // RX
#define MOS_MGLA 1         // TX
#define RGB_PIN D2
#define NUM_LEDS 120

#define TFT_CS D8
#define TFT_DC D4
#define TFT_RST D0
#define TFT_LITE D6        
#define BUTTON_PIN A0

// ✅ POPRAWIONE MARGINESY DLA GEKONA ORZĘSIONEGO
float TEMP_MARGIN = 1.0;   // ±1°C (było 0.5)
int HUM_MARGIN = 7;        // ±7% (było 5)

DHT dht(DHTPIN, DHTTYPE);
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);
Adafruit_NeoPixel strip(NUM_LEDS, RGB_PIN, NEO_GRB + NEO_KHZ800);

FirebaseData fbdo;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "europe.pool.ntp.org", 3600); 

// ZMIENNE STANU
float temp = 0.0, hum = 0.0;
bool st_led = false, st_mgla = false, st_fan = false, st_mata = false;
bool auto_mode = true; 
bool led_auto_mode = true;

int r_val = 255, g_val = 255, b_val = 255; 
int led_brightness = 30;  
int screen_brightness = 800;   
String led_mode = "static"; 

float day_temp = 24.0, night_temp = 21.0;  // ✅ Wartości domyślne dla gekona
int day_hum = 65, night_hum = 78;          // ✅ Optymalne dla gekona
String day_start = "08:00";
String night_start = "20:00";
String led_on = "08:00";
String led_off = "20:00";

float target_temp = 24.0;
int target_hum = 65;
bool is_day_mode = true; 

unsigned long last_firebase_success = 0;
bool firebase_connected = true;

unsigned long sync_count = 0;
bool firebase_ok = false;

unsigned long last_effect_time = 0;
unsigned long last_history_upload = 0;
unsigned long last_firebase_read = 0;

volatile bool update_leds_needed = true;
volatile bool update_screen_needed = true;
bool is_led_actually_on = false;

void handleAutomation();
int timeStringToMinutes(String timeStr);
void checkReset();
void drawMainScreen();
void handleLEDEffects();
void handleSensorsAndFirebase();
void readFromFirebase();

void setup() {
  Serial.begin(115200);
  system_update_cpu_freq(160);
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  
  pinMode(MOS_WIATRACZEK, FUNCTION_3); 
  pinMode(MOS_MGLA, FUNCTION_3); 
  pinMode(RELAY_MATA, OUTPUT);
  pinMode(MOS_WIATRACZEK, OUTPUT);
  pinMode(MOS_MGLA, OUTPUT);
  pinMode(TFT_LITE, OUTPUT);
  
  analogWrite(TFT_LITE, screen_brightness); 

  digitalWrite(RELAY_MATA, RELAY_OFF);
  digitalWrite(MOS_MGLA, MOSFET_ON);
  digitalWrite(MOS_WIATRACZEK, MOSFET_OFF);

  dht.begin();
  strip.begin();
  strip.setBrightness(led_brightness);
  strip.clear();
  strip.show(); 

  tft.initR(INITR_BLACKTAB); 
  tft.setRotation(3);
  tft.fillScreen(ST77XX_BLACK);
  
  tft.setCursor(10, 40);
  tft.setTextSize(1);
  tft.setTextColor(ST77XX_GREEN);
  tft.print("Laczenie WiFi...");

  WiFi.begin("Ancymony1", "kompromisacja");
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  tft.setCursor(10, 55);
  tft.print("WiFi OK");

  fbConfig.host = "terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app";
  fbConfig.signer.tokens.legacy_token = "Rocy0No78yp0PKTwfvBVrqi8qXBY2PUNbPsKb6xw";

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  timeClient.begin();

  tft.setCursor(10, 70);
  tft.print("Sync z Firebase...");
  
  readFromFirebase(); 
  
  tft.setCursor(10, 85);
  tft.setTextColor(ST77XX_CYAN);
  tft.print("Gotowe!");
  
  delay(2000);
  tft.fillScreen(ST77XX_BLACK);
  
  last_firebase_success = millis();
  
  Serial.println("=== TERRARIUM IoT PRO v3.5 ===");
  Serial.println("Optymalizacja dla Gekona Orzęsionego");
  Serial.print("Margines temp: ±");
  Serial.print(TEMP_MARGIN);
  Serial.println("°C");
  Serial.print("Margines wilg: ±");
  Serial.print(HUM_MARGIN);
  Serial.println("%");
}

void loop() {
  timeClient.update();
  
  if (update_screen_needed) {
    analogWrite(TFT_LITE, screen_brightness);
    update_screen_needed = false;
  }

  if (millis() - last_firebase_success > 10000) {
    firebase_connected = false;
  } else {
    firebase_connected = true;
  }

  if (millis() - last_firebase_read > 2000) {
    last_firebase_read = millis();
    readFromFirebase();
  }

  // AUTOMATYKA ma priorytet
  if (auto_mode) {
      handleAutomation();
  }

  handleSensorsAndFirebase(); 
  handleLEDEffects(); 
  drawMainScreen();
  checkReset();
  
  delay(10); 
}

// ============================================
// 🔥 ODCZYT USTAWIEŃ Z FIREBASE
// ============================================
void readFromFirebase() {
  digitalWrite(LED_BUILTIN, LOW);
  
  firebase_ok = false;
  
  // LED (odczytywany gdy nie w trybie AUTO)
  if (!auto_mode || !led_auto_mode) {
    if (Firebase.getBool(fbdo, "/actuators/led")) {
      bool new_led = fbdo.boolData();
      if (new_led != st_led) {
        st_led = new_led;
        update_leds_needed = true;
      }
      last_firebase_success = millis();
    }
  }
  
  // URZĄDZENIA - odczytuj TYLKO gdy AUTO WYŁĄCZONE
  if (!auto_mode) {
    if (Firebase.getBool(fbdo, "/actuators/heater")) { 
      st_mata = fbdo.boolData();
      last_firebase_success = millis();
    }
    if (Firebase.getBool(fbdo, "/actuators/mist")) { 
      st_mgla = fbdo.boolData();
      last_firebase_success = millis();
    }
    if (Firebase.getBool(fbdo, "/actuators/fan")) { 
      st_fan = fbdo.boolData();
      last_firebase_success = millis();
    }
  }
  
  // Parametry LED
  if (Firebase.getInt(fbdo, "/actuators/brightness")) {
    int new_bright = fbdo.intData();
    if (new_bright != led_brightness) {
      led_brightness = new_bright;
      strip.setBrightness(led_brightness);
      update_leds_needed = true;
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getString(fbdo, "/actuators/led_mode")) {
    String new_mode = fbdo.stringData();
    if (new_mode != led_mode) {
      led_mode = new_mode;
      update_leds_needed = true;
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getInt(fbdo, "/actuators/led_r")) {
    int new_r = fbdo.intData();
    if (new_r != r_val) {
      r_val = new_r;
      update_leds_needed = true;
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getInt(fbdo, "/actuators/led_g")) {
    int new_g = fbdo.intData();
    if (new_g != g_val) {
      g_val = new_g;
      update_leds_needed = true;
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getInt(fbdo, "/actuators/led_b")) {
    int new_b = fbdo.intData();
    if (new_b != b_val) {
      b_val = new_b;
      update_leds_needed = true;
    }
    last_firebase_success = millis();
  }
  
  // SETTINGS
  if (Firebase.getBool(fbdo, "/settings/auto_enabled")) { 
    bool new_auto = fbdo.boolData();
    if (new_auto != auto_mode) {
      auto_mode = new_auto;
      Serial.print("AUTO MODE: ");
      Serial.println(auto_mode ? "WŁĄCZONY" : "WYŁĄCZONY");
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getBool(fbdo, "/settings/led_auto_enabled")) { 
    bool new_led_auto = fbdo.boolData();
    if (new_led_auto != led_auto_mode) {
      led_auto_mode = new_led_auto;
      Serial.print("LED AUTO MODE: ");
      Serial.println(led_auto_mode ? "WŁĄCZONY" : "WYŁĄCZONY");
    }
    last_firebase_success = millis();
  }
  
  if (Firebase.getFloat(fbdo, "/settings/day_temp")) { 
    day_temp = fbdo.floatData();
    last_firebase_success = millis();
  }
  if (Firebase.getFloat(fbdo, "/settings/night_temp")) { 
    night_temp = fbdo.floatData();
    last_firebase_success = millis();
  }
  if (Firebase.getInt(fbdo, "/settings/day_hum")) { 
    day_hum = fbdo.intData();
    last_firebase_success = millis();
  }
  if (Firebase.getInt(fbdo, "/settings/night_hum")) { 
    night_hum = fbdo.intData();
    last_firebase_success = millis();
  }
  if (Firebase.getString(fbdo, "/settings/day_start")) { 
    day_start = fbdo.stringData();
    last_firebase_success = millis();
  }
  if (Firebase.getString(fbdo, "/settings/night_start")) { 
    night_start = fbdo.stringData();
    last_firebase_success = millis();
  }
  
  if (Firebase.getString(fbdo, "/settings/led_on")) { 
    led_on = fbdo.stringData();
    last_firebase_success = millis();
  }
  if (Firebase.getString(fbdo, "/settings/led_off")) { 
    led_off = fbdo.stringData();
    last_firebase_success = millis();
  }
  
  if (Firebase.getInt(fbdo, "/settings/hum_margin")) { 
    HUM_MARGIN = fbdo.intData();
    last_firebase_success = millis();
  }
  
  if (Firebase.getInt(fbdo, "/settings/lcd_brightness")) {
    int new_scr = fbdo.intData();
    if (new_scr != screen_brightness) {
      screen_brightness = new_scr;
      update_screen_needed = true;
    }
    last_firebase_success = millis();
  }
  
  sync_count++;
  firebase_ok = true;
  digitalWrite(LED_BUILTIN, HIGH);
}

// ============================================
// 🤖 AUTOMATYKA - ✅ POPRAWIONA LOGIKA
// ============================================
void handleAutomation() {
    int current_minutes = timeClient.getHours() * 60 + timeClient.getMinutes();
    int start_day_min = timeStringToMinutes(day_start);
    int start_night_min = timeStringToMinutes(night_start);
    int led_on_min = timeStringToMinutes(led_on);
    int led_off_min = timeStringToMinutes(led_off);
    
    // Określ tryb dzień/noc
    if (current_minutes >= start_day_min && current_minutes < start_night_min) {
        is_day_mode = true;
        target_temp = day_temp;
        target_hum = day_hum;
    } else {
        is_day_mode = false;
        target_temp = night_temp;
        target_hum = night_hum;
    }
    
    // ✅ MATA GRZEWCZA (włącza przy temp < cel - margines)
    st_mata = temp < (target_temp - TEMP_MARGIN);
    
    // ✅ MGIEŁKA (włącza przy wilg < cel - margines)
    st_mgla = hum < (target_hum - HUM_MARGIN);
    
    // ✅ WIATRAK - nowa logika (temp > cel + 2°C LUB wilg > cel + 15%)
    st_fan = (temp > target_temp + 2.0) || (hum > target_hum + 15);
    
    // ✅ LED (tylko jeśli LED AUTO włączone)
    if (led_auto_mode) {
        bool should_led_on = (current_minutes >= led_on_min && current_minutes < led_off_min);
        
        // Tryb awaryjny
        if (!firebase_connected) {
            should_led_on = false;
        }
        
        st_led = should_led_on;
    }
    
    // Wyślij stany do Firebase (co 5s)
    static unsigned long lastSync = 0;
    if (millis() - lastSync > 5000) {
        lastSync = millis();
        FirebaseJson a;
        a.set("led", st_led);
        a.set("heater", st_mata);
        a.set("mist", st_mgla);
        a.set("fan", st_fan);
        Firebase.updateNode(fbdo, "/actuators", a);
        
        // Logi diagnostyczne
        Serial.print("AUTO | T:");
        Serial.print(temp, 1);
        Serial.print("/");
        Serial.print(target_temp, 1);
        Serial.print(" H:");
        Serial.print(hum, 0);
        Serial.print("/");
        Serial.print(target_hum);
        Serial.print(" | M:");
        Serial.print(st_mata ? "ON" : "OFF");
        Serial.print(" G:");
        Serial.print(st_mgla ? "ON" : "OFF");
        Serial.print(" W:");
        Serial.print(st_fan ? "ON" : "OFF");
        Serial.print(" L:");
        Serial.println(st_led ? "ON" : "OFF");
    }
}

int timeStringToMinutes(String timeStr) {
    int separatorIndex = timeStr.indexOf(':');
    if (separatorIndex == -1) return 0;
    int h = timeStr.substring(0, separatorIndex).toInt();
    int m = timeStr.substring(separatorIndex + 1).toInt();
    return h * 60 + m;
}

void handleLEDEffects() {
  if (!st_led) {
    if (update_leds_needed || is_led_actually_on) { 
       for(int i=0; i<NUM_LEDS; i++) {
           strip.setPixelColor(i, 0, 0, 0);
       }
       strip.show();
       delay(50); 
       strip.show();
       delay(2);
       pinMode(RGB_PIN, INPUT_PULLUP); 
       update_leds_needed = false;
       is_led_actually_on = false; 
    }
    pinMode(RGB_PIN, INPUT_PULLUP); 
    return;
  }
  
  if (!is_led_actually_on) {
      pinMode(RGB_PIN, OUTPUT);
      delay(1);
  }

  is_led_actually_on = true;
  if (led_brightness < 5) led_brightness = 5; 

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

  // Fizyczne sterowanie GPIO
  digitalWrite(RELAY_MATA, st_mata ? RELAY_ON : RELAY_OFF);
  digitalWrite(MOS_MGLA, st_mgla ? MOSFET_OFF : MOSFET_ON);
  digitalWrite(MOS_WIATRACZEK, st_fan ? MOSFET_ON : MOSFET_OFF);

  FirebaseJson json;
  json.set("temperature", temp);
  json.set("humidity", hum);
  json.set("timestamp", timeClient.getEpochTime()); 
  json.set("last_sync", timeClient.getFormattedTime());
  Firebase.updateNode(fbdo, "/readings", json);

  if (millis() - last_history_upload > 900000) { 
      last_history_upload = millis();
      FirebaseJson histJson;
      histJson.set("t", temp);
      histJson.set("h", hum);
      String timestampStr = String(timeClient.getEpochTime()); 
      Firebase.updateNode(fbdo, "/history/" + timestampStr, histJson);
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

// ============================================
// 🖥️ EKRAN TFT - ✅ POPRAWIONY PASEK LED
// ============================================
void drawMainScreen() {
  static unsigned long last_screen_update = 0;
  if (millis() - last_screen_update < 1000) return;
  last_screen_update = millis();

  // Godzina (wycentrowana)
  tft.setCursor(35, 15); 
  tft.setTextSize(3); 
  tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
  tft.print(timeClient.getFormattedTime().substring(0,5));

  // Czerwona kropka (prawy górny róg)
  if (!firebase_connected) {
    tft.fillCircle(148, 22, 5, ST77XX_RED);
  } else {
    tft.fillCircle(148, 22, 5, ST77XX_BLACK);
  }

  // Temperatura
  tft.drawBitmap(10, 55, icon_temp_bitmap, 8, 16, ST77XX_RED);
  tft.setCursor(25, 55); 
  tft.setTextSize(2); 
  tft.setTextColor(ST77XX_WHITE, ST77XX_BLACK);
  tft.print(temp,1); tft.print("C ");

  // Wilgotność
  tft.drawBitmap(10, 85, icon_hum_bitmap, 8, 8, ST77XX_BLUE);
  tft.setCursor(25, 85); 
  tft.print(hum,0); tft.print("%  ");
  
  // ✅ POPRAWIONY PASEK LED - taka sama długość jak godzina, wycentrowany
  // Godzina zajmuje ~70px (5 znaków × 3 rozmiar czcionki × ~4.5px)
  // Pozycja X godziny: 35, więc pasek też od X=35
  tft.fillRect(35, 118, 85, 5, st_led ? ST77XX_GREEN : ST77XX_RED);
}
