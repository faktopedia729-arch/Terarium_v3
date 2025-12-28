# 🦎 Terrarium IoT Pro v3

**Zaawansowany system sterowania terrarium oparty na ESP8266 (NodeMCU), Firebase oraz interfejsie webowym.**

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-ESP8266-blue)
![Backend](https://img.shields.io/badge/Backend-Firebase-orange)

## 📋 Opis Projektu

Terrarium IoT Pro to kompletny ekosystem do automatyzacji warunków w terrarium. System składa się ze sterownika sprzętowego (NodeMCU), który komunikuje się z chmurą (Firebase), oraz responsywnej aplikacji webowej (SPA), która służy jako panel sterowania.

System zapewnia idealne warunki dla zwierząt dzięki automatycznemu cyklowi Dzień/Noc, histerezie temperatury i wilgotności oraz symulacji zjawisk pogodowych oświetleniem LED.

## ✨ Główne Funkcje

* **🌡️ Monitoring w czasie rzeczywistym:** Odczyt temperatury i wilgotności co kilka sekund.
* **☀️/🌙 Cykl Dzień i Noc:** Automatyczna zmiana parametrów docelowych (Temp/Wilg) w zależności od godziny.
* **🤖 Automatyka z Histerezą:** Precyzyjne sterowanie grzaniem i nawilżaniem (zapobiega częstemu "cykaniu" przekaźników).
* **🚨 System Watchdog & Heartbeat:**
    * Wykrywanie utraty połączenia na stronie WWW (ekran "BRAK POŁĄCZENIA").
    * Zdalny restart płytki NodeMCU z poziomu panelu www.
* **🌈 Oświetlenie RGB (WS2812b):**
    * Tryby: Statyczny, Ognisko, Burza, Wschód słońca.
    * Regulacja jasności i koloru.
* **📊 Historia Danych:** Wykresy historyczne (4h / 12h / 24h) oparte na Chart.js.
* **📱 Responsywny Web Panel:** Działa na komputerach i smartfonach (PWA ready).

## 🛠️ Specyfikacja Sprzętowa (Hardware)

### Komponenty
1.  **MCU:** NodeMCU v3 (ESP8266)
2.  **Sensory:** DHT22 (Temperatura i Wilgotność)
3.  **Wyświetlacz:** TFT 1.8" ST7735 (SPI)
4.  **Elementy wykonawcze:**
    * Mata grzewcza (Sterowana przekaźnikiem)
    * Mgiełka/Fogger (Sterowany tranzystorem MOSFET)
    * Wentylator (Sterowany tranzystorem MOSFET)
    * Pasek LED WS2812b

### 🔌 Pinout (Połączenia)

| Komponent | Pin NodeMCU | Pin GPIO | Uwagi |
| :--- | :--- | :--- | :--- |
| **DHT22** | D2 | GPIO 4 | Sensor danych |
| **Mata (Przekaźnik)** | D1 | GPIO 5 | Sterowanie 230V |
| **Wiatrak (MOSFET)** | **RX** | **GPIO 3** | Uwaga: Odłączyć przy wgrywaniu kodu! |
| **Mgiełka (MOSFET)** | **TX** | **GPIO 1** | Uwaga: Odłączyć przy wgrywaniu kodu! |
| **LED WS2812b** | D3 | GPIO 0 | Linia danych (DIN) |
| **TFT CS** | D8 | GPIO 15 | Chip Select |
| **TFT DC** | D4 | GPIO 2 | Data/Command |
| **TFT RST** | D0 | GPIO 16 | Reset |
| **Przyciski (Drabinka)**| A0 | ADC0 | Analogowe sterowanie menu |

> **⚠️ UWAGA:** Piny `RX` i `TX` są wykorzystywane do sterowania urządzeniami. Należy je **fizycznie odłączyć** na czas wgrywania oprogramowania przez USB, w przeciwnym razie upload zakończy się błędem.

## 💻 Instalacja i Konfiguracja

### 1. Firebase (Backend)
1.  Utwórz projekt na [Firebase Console](https://console.firebase.google.com/).
2.  Włącz **Realtime Database**.
3.  Włącz **Authentication** (Email/Password).
4.  Pobierz `API KEY` oraz `Database URL`.

### 2. Firmware (NodeMCU)
1.  Zainstaluj **Arduino IDE**.
2.  Dodaj obsługę płytek ESP8266 w menedżerze płytek.
3.  Zainstaluj wymagane biblioteki:
    * `FirebaseESP8266`
    * `DHT sensor library`
    * `Adafruit GFX` & `Adafruit ST7735`
    * `Adafruit NeoPixel`
    * `NTPClient`
4.  Otwórz plik `.ino`, uzupełnij dane WiFi i Firebase Config.
5.  Wgraj na płytkę (pamiętaj o odłączeniu RX/TX!).

### 3. Frontend (Web)
1.  Edytuj plik `script.js` i uzupełnij obiekt `firebaseConfig` swoimi danymi.
2.  Wgraj pliki (`index.html`, `style.css`, `script.js`) na hosting (np. GitHub Pages, Netlify lub Firebase Hosting).

## 📂 Struktura Plików

```text
/
├── firmware/
│   └── main.ino          # Kod źródłowy dla NodeMCU (C++)
├── web/
│   ├── index.html        # Struktura panelu sterowania
│   ├── style.css         # Style (Dark Mode, Responsywność)
│   └── script.js         # Logika klienta, komunikacja z Firebase, Wykresy
└── README.md             # Dokumentacja projektu
