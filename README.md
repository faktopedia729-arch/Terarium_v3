# 🦎 Terrarium IoT Pro v3.5

**Inteligentny system automatyzacji terrarium dla gekona orzęsionego** z pełną integracją chmurową, monitoringiem w czasie rzeczywistym i zaawansowanym oświetleniem LED.

![Status](https://img.shields.io/badge/status-stable-brightgreen)
![Platform](https://img.shields.io/badge/platform-ESP8266-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📖 Spis treści

- [O projekcie](#-o-projekcie)
- [Główne funkcje](#-główne-funkcje)
- [Specyfikacja sprzętowa](#️-specyfikacja-sprzętowa)
- [Schemat połączeń](#-schemat-połączeń)
- [Instalacja](#-instalacja)
- [Konfiguracja](#️-konfiguracja)
- [Interfejs WWW](#-interfejs-www)
- [Struktura projektu](#-struktura-projektu)
- [Rozwiązywanie problemów](#-rozwiązywanie-problemów)
- [Roadmap](#-roadmap)
- [Autor](#-autor)
- [Licencja](#-licencja)

---

## 🎯 O projekcie

**Terrarium IoT Pro** to kompleksowy ekosystem automatyzacji warunków w terrarium zaprojektowany specjalnie dla gekona orzęsionego (*Correlophus ciliatus*). System łączy w sobie:

- 🌡️ **Precyzyjną kontrolę klimatu** (temperatura, wilgotność)
- 🌈 **Zaawansowane oświetlenie LED** (WS2812b z efektami)
- ☁️ **Chmurową synchronizację** (Firebase Realtime Database)
- 📱 **Responsywny panel WWW** (działa na PC i mobile)
- 🤖 **Inteligentną automatykę** z cyklem dzień/noc

System składa się z **trzech warstw**:
1. **Hardware** - NodeMCU ESP8266 + czujniki + przekaźniki
2. **Backend** - Firebase (baza danych + autoryzacja)
3. **Frontend** - Single Page Application (HTML/CSS/JS)

---

## ✨ Główne funkcje

### 🌡️ Monitoring w czasie rzeczywistym
- Odczyt temperatury i wilgotności co 3 sekundy (DHT22)
- Synchronizacja z chmurą Firebase
- Historia danych z wykresami (4h / 12h / 24h)
- Tryb awaryjny przy utracie połączenia

### 🤖 Automatyka z histerezą
- **Cykl Dzień/Noc** - automatyczna zmiana parametrów według harmonogramu
- **Sterowanie z marginesem** - zapobiega "cykaniu" przekaźników
  - Temperatura: ±1.0°C
  - Wilgotność: ±7%
- **Tryb AUTO/MANUAL** - przełączanie z panelu WWW
- **Automatyczny powrót** - po 1h ręcznego sterowania wraca do AUTO

### 🌈 Oświetlenie LED WS2812b
- **Dwa niezależne segmenty:**
  - 🦎 Terrarium (80 LED)
  - 🐠 Akwarium (40 LED)
- **Tryby efektów:**
  - Stały kolor (RGB + jasność)
  - 🔥 Ognisko (animacja)
  - ⚡ Burza (błyski)
  - 🌅 Wschód słońca
- **LED AUTO Mode** - harmonogram włączania według pory dnia

### 🚨 System bezpieczeństwa
- **Watchdog** - wykrywa utratę połączenia (czerwona kropka na TFT)
- **Heartbeat ping** - sprawdza żywotność NodeMCU co 5s
- **Zdalny restart** - przycisk w panelu WWW
- **Tryb awaryjny** - przy braku WiFi utrzymuje ostatnie ustawienia

### 📊 Wyświetlacz TFT 1.8" (ST7735)
- Godzina (synchronizowana z NTP)
- Temperatura i wilgotność (z ikonkami)
- Pasek statusu LED
- Indykator połączenia (czerwona kropka przy offline)
- **Regulacja jasności** - fizyczny potencjometr

### 📱 Panel sterowania WWW
- **Responsywny design** - działa na telefonie i komputerze
- **Autoryzacja Firebase** - bezpieczny dostęp
- **Live monitoring** - odczyty w czasie rzeczywistym
- **Sterowanie urządzeniami:**
  - Mata grzewcza
  - Mgielnik ultradźwiękowy
  - Wentylator
  - LED (2 segmenty osobno)
- **Harmonogram** - ustawienia dla dnia i nocy
- **Wykresy historyczne** - Chart.js

---

## 🛠️ Specyfikacja sprzętowa

### 💻 Komponenty główne

<div class="my-4 w-full overflow-x-auto">
<table class="min-w-full border-collapse text-sm">
<thead>
<tr>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Komponent</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Model</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Parametry</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Ilość</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Uwagi</th>
</tr>
</thead>
<tbody>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>Mikrokontroler</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">NodeMCU v3 (ESP8266)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">160MHz, 4MB Flash</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">1</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">WiFi + GPIO</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>Czujnik</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">DHT22</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Temp: -40~80°C, Wilg: 0-100%</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">1</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Dokładność ±0.5°C</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>Wyświetlacz</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT 1.8" ST7735</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">128×160 px, SPI</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">1</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Kolorowy</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>LED</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Taśma WS2812b</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">60 LED/m, 5V</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">2m (120 LED)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Podzielona 80+40</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>Przekaźnik</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">1-kanałowy 5V</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">230V/10A</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">1</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Mata grzewcza</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>MOSFET</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">IRF540N / IRLZ44N</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">30V/20A</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">2</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Mgielnik + wentylator</td>
</tr>
</tbody>
</table>
</div>

### 🔌 Zasilanie

<div class="my-4 w-full overflow-x-auto">
<table class="min-w-full border-collapse text-sm">
<thead>
<tr>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Urządzenie</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Napięcie</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Prąd</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Zasilacz</th>
</tr>
</thead>
<tbody>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">NodeMCU + TFT</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">5V</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">~250mA</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Wspólny 5V 6A</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">LED WS2812b (120)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">5V</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">3-7A</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Wspólny 5V 6A</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Mgielnik ultradźwiękowy</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">5V USB</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">0.6-1A</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Wspólny 5V 6A</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>TOTAL</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>5V</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>~5A</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>5V 6A</strong> ⚠️</td>
</tr>
</tbody>
</table>
</div>

⚠️ **WAŻNE:** Zasilacz minimum 5A! Słabszy powoduje resety i gasnące LEDy.

### 📐 Wymiary terrarium
- Szerokość: **70 cm**
- Głębokość: **30 cm**
- Wysokość: **48 cm**
- Gatunek: **Geko orzęsiony** (*Correlophus ciliatus*)

---

## 🔌 Schemat połączeń

### 📍 Pinout NodeMCU

<div class="my-4 w-full overflow-x-auto">
<table class="min-w-full border-collapse text-sm">
<thead>
<tr>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Pin NodeMCU</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">GPIO</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Komponent</th>
<th class="bg-transparent whitespace-nowrap border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:px-4 sm:text-sm">Uwagi</th>
</tr>
</thead>
<tbody>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D0</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO16</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT RST</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Reset wyświetlacza</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D1</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO5</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Przekaźnik (Mata)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Sterowanie 230V</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D2</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO4</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">LED Terrarium (80)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">DIN WS2812b + rezystor 470Ω</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D3</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO0</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">DHT22</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Temperatura/wilgotność</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D4</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO2</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT DC</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Data/Command</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D5</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO14</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT SCK</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">SPI Clock</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D6</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO12</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">LED Akwarium (40)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">DIN WS2812b + rezystor 470Ω</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D7</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO13</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT MOSI</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">SPI Data</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>D8</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO15</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">TFT CS</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Chip Select</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>RX</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO3</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Wentylator (MOSFET)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">⚠️ Odłączyć przy uploadzie!</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>TX</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">GPIO1</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Mgielnik (MOSFET)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">⚠️ Odłączyć przy uploadzie!</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>A0</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">ADC</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Przyciski (keypad)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><em>Zarezerwowane</em></td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>3V3</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">-</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Potencjometr (lewa)</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Jasność TFT</td>
</tr>
<tr class="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base"><strong>GND</strong></td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">-</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Wspólna masa</td>
<td class="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 sm:px-4 sm:text-base">Połącz z zasilaczem!</td>
</tr>
</tbody>
</table>
</div>

### 🔗 Schemat blokowy

┌─────────────────────────────────────────────────────────────┐
│ Zasilacz 5V 6A │
└────┬────────────────────────────────────────────────────────┘
│
├──→ NodeMCU (VIN + GND)
│ ├─ D3 ─→ DHT22 (temperatura/wilgotność)
│ ├─ D1 ─→ Przekaźnik ─→ Mata grzewcza 230V
│ ├─ TX ─→ MOSFET ─→ Mgielnik 5V USB
│ ├─ RX ─→ MOSFET ─→ Wentylator 5V
│ ├─ D2 ──[470Ω]──→ LED Terrarium (DIN)
│ ├─ D6 ──[470Ω]──→ LED Akwarium (DIN)
│ └─ D0,D4,D5,D7,D8 ─→ TFT ST7735
│
├──→ LED Terrarium (+5V, GND) ─[Kondensator 1000µF]
├──→ LED Akwarium (+5V, GND) ──[Kondensator 1000µF]
└──→ Mgielnik przez MOSFET

Potencjometr 1kΩ:
Lewa ─→ 3V3
Środek ─→ TFT LED+
Prawa ─→ GND

### ⚠️ UWAGI BEZPIECZEŃSTWA 1. **RX/TX przy uploadzie:** - Fizycznie odłącz wentylator i mgielnik przed wgrywaniem kodu - Lub dodaj przełącznik w obwodzie 2. **Wspólna masa (GND):** - Zasilacz 5V GND **MUSI** być połączony z NodeMCU GND - Bez tego: niestabilność i uszkodzenie 3. **Kondensatory:** - Polaryzacja! **+ do +, - do -** - Źle podłączony = eksplozja 4. **Rezystory na LED:** - 470Ω na linii danych (D2, D6) - Stabilizuje sygnał, chroni pin --- ## 🚀 Instalacja ### 1️⃣ Wymagania wstępne **Software:** - [Arduino IDE](https://www.arduino.cc/en/software) (1.8.19+) - [Git](https://git-scm.com/) (opcjonalnie) **Konto Firebase:** - Załóż darmowe konto na [Firebase Console](https://console.firebase.google.com/) ### 2️⃣ Instalacja bibliotek Arduino W Arduino IDE przejdź do: **Narzędzia → Zarządzaj bibliotekami** i zainstaluj:
✅ ESP8266WiFi (wbudowana)
✅ FirebaseESP8266 by Mobizt (v4.3.0+)
✅ DHT sensor library by Adafruit (v1.4.4+)
✅ Adafruit GFX Library (v1.11.5+)
✅ Adafruit ST7735 (v1.10.0+)
✅ Adafruit NeoPixel (v1.11.0+)
✅ NTPClient by Fabrice Weinberg (v3.2.1+)
✅ ArduinoJson by Benoit Blanchon (v6.21.3+)

### 3️⃣ Dodaj obsługę ESP8266 **Arduino IDE → Preferencje → Dodatkowe adresy URL:**
http://arduino.esp8266.com/stable/package_esp8266com_index.json

**Narzędzia → Płytka → Menedżer płytek:** - Szukaj: `ESP8266` - Zainstaluj: **esp8266 by ESP8266 Community** (v3.1.2+) ### 4️⃣ Konfiguracja płytki **Narzędzia:** - Płytka: `NodeMCU 1.0 (ESP-12E Module)` - CPU Frequency: `160 MHz` - Flash Size: `4MB (FS:2MB OTA:~1019KB)` - Upload Speed: `115200` ### 5️⃣ Sklonuj repozytorium ```bash git clone https://github.com/twoj-username/terrarium-iot-pro.git cd terrarium-iot-pro
6️⃣ Wgraj firmware
Otwórz firmware/main.ino w Arduino IDE
Uzupełnij dane WiFi i Firebase (patrz Konfiguracja)
⚠️ ODŁĄCZ RX/TX przed uploadem!
Podłącz NodeMCU przez USB
Kliknij Upload (→)
⚙️ Konfiguracja
🔥 Firebase Setup
1. Utwórz projekt Firebase
Wejdź na Firebase Console
Kliknij Dodaj projekt
Nazwa: Terrarium-IoT-Pro
Wyłącz Google Analytics (opcjonalnie)
2. Realtime Database
W menu bocznym: Build → Realtime Database
Kliknij Utwórz bazę danych
Lokalizacja: europe-west1 (Frankfurt)
Tryb: Tryb testowy (zmień później na produkcyjny!)
Struktura bazy:

json

{
  "readings": {
    "temperature": 24.5,
    "humidity": 68,
    "timestamp": 1704110400,
    "last_sync": "12:34:56"
  },
  "actuators": {
    "led": true,
    "heater": false,
    "mist": false,
    "fan": false,
    "brightness": 80,
    "led_mode": "static",
    "led_r": 255,
    "led_g": 200,
    "led_b": 150
  },
  "settings": {
    "auto_enabled": true,
    "led_auto_enabled": true,
    "day_temp": 24.0,
    "night_temp": 21.0,
    "day_hum": 65,
    "night_hum": 78,
    "day_start": "08:00",
    "night_start": "20:00",
    "led_on": "08:00",
    "led_off": "20:00",
    "hum_margin": 7,
    "lcd_brightness": 800
  },
  "history": {
    "1704110400": {
      "t": 24.5,
      "h": 68
    }
  },
  "system": {
    "reset": false
  }
}
3. Authentication
Build → Authentication
Get Started
Metody logowania → Email/Password → Włącz
Zakładka Users → Add user
Email: twoj@email.pl / Hasło: twoje-haslo
4. Pobierz dane konfiguracyjne
Dla NodeMCU (firmware):

Ustawienia projektu (⚙️) → Ustawienia projektu
Skopiuj:
Database URL (np. https://twoj-projekt.europe-west1.firebasedatabase.app)
Web API Key (np. AIzaSy...)
Dla panelu WWW:

Ustawienia projektu → Aplikacje → Web
Skopiuj cały obiekt firebaseConfig
5. Zabezpiecz bazę (WAŻNE!)
Database → Rules:

json

{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
🔧 Konfiguracja firmware (main.ino)
Otwórz firmware/main.ino i uzupełnij:

cpp

// WiFi
#define WIFI_SSID     "Twoja-Siec-WiFi"
#define WIFI_PASS     "Twoje-Haslo-WiFi"

// Firebase
#define FIREBASE_HOST "twoj-projekt.europe-west1.firebasedatabase.app"
#define FIREBASE_TOKEN "AIzaSy..."  // Web API Key
🌐 Konfiguracja panelu WWW (script.js)
Otwórz web/script.js i uzupełnij:

javascript

const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "twoj-projekt.firebaseapp.com",
    databaseURL: "https://twoj-projekt.europe-west1.firebasedatabase.app",
    projectId: "twoj-projekt",
    appId: "1:123456789:web:..."
};
🚀 Wgraj panel WWW
Opcja 1: Firebase Hosting (Zalecane)

bash

npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
Opcja 2: GitHub Pages

Utwórz repo na GitHub
Settings → Pages → Source: main branch
Wypchnij pliki z folderu web/
Opcja 3: Lokalnie

Otwórz web/index.html bezpośrednio w przeglądarce
⚠️ Wymaga relaksacji CORS w Firebase
📱 Interfejs WWW
🔐 Logowanie


Email i hasło skonfigurowane w Firebase Authentication
📊 Dashboard


Sekcje:

Odczyty czujników - temperatura, wilgotność (live)
Urządzenia wykonawcze - przyciski ON/OFF
Oświetlenie LED - kolor, jasność, efekty
Automatyzacja - harmonogram dzień/noc
Wykresy - historia 4h/12h/24h
🎨 Personalizacja LED
Picker kolorów - wybór RGB
Ostatnie kolory - szybki dostęp
Efekty dynamiczne:
🔥 Ognisko
⚡ Burza
🌅 Wschód słońca
🤖 Tryb AUTO
Włączony:

Mata, mgielnik, wentylator sterowane automatycznie
LED włącza/wyłącza się według harmonogramu (jeśli LED AUTO zaznaczone)
Wyłączony:

Pełna kontrola manualna
Wszystkie przyciski aktywne
📁 Struktura projektu
terrarium-iot-pro/ ├── firmware/ │ └── main.ino # Kod dla NodeMCU (C++) │ ├── web/ │ ├── index.html # Interfejs użytkownika │ ├── style.css # Style (dark mode) │ └── script.js # Logika frontendu + Firebase │ ├── docs/ │ ├── screenshots/ # Zrzuty ekranu │ ├── wiring-diagram.png # Schemat połączeń │ └── fritzing/ # Projekt Fritzing (opcjonalnie) │ ├── .gitignore ├── LICENSE └── README.md # Ten plik
🔧 Rozwiązywanie problemów
❌ NodeMCU resetuje się losowo
Przyczyny:

Słaby zasilacz (<5A)
Brak wspólnej masy (GND)
Zbyt wysoka jasność LED
Rozwiązanie:

cpp

// Ogranicz jasność w kodzie:
if (led_brightness > 100) led_brightness = 100; // max 40%
Wymień zasilacz na 5V 6A
Sprawdź połączenie GND
🟡 Gradient białe→żółte LEDy
Przyczyna: Za słaby zasilacz lub spadek napięcia na taśmie

Rozwiązanie:

Zasilacz minimum 5V 5A
Dodaj kondensatory 1000µF przy LEDach
Użyj grubszych przewodów (0.75mm²)
👻 "Ghost pixels" (LEDy świecą gdy OFF)
Przyczyna: Resztkowy sygnał na linii danych

Rozwiązanie:

cpp

// W handleLEDEffects():
pinMode(RGB_PIN, INPUT_PULLUP);
Dodaj rezystor 470Ω na linii danych
Dodaj pull-down 10kΩ (DIN → GND)
📵 Brak połączenia z Firebase
Sprawdź:

WiFi działa (czerwona kropka na TFT)
Firebase Token poprawny
Database URL zawiera region (europe-west1)
Reguły dostępu w Firebase (.read, .write)
Debug:

cpp

Serial.begin(115200);
// Sprawdź w Serial Monitor
🌡️ Błędne odczyty DHT22
Objawy: nan, skoki wartości

Rozwiązanie:

Dodaj rezystor pull-up 10kΩ (DATA → VCC)
Wydłuż odstęp odczytów (5-10s)
Wymień czujnik (uszkodzony)
🔥 Mgielnik nie działa
Sprawdź:

Zasilanie 5V (przez MOSFET)
Połączenie Gate (TX → MOSFET)
Wspólny GND (zasilacz + ESP)
Rezystor 10kΩ pull-down na Gate
🗺️ Roadmap
v3.6 (W trakcie)
[ ] Obsługa keypad 3 przyciski (menu TFT)
[ ] Eksport danych do CSV
[ ] Powiadomienia email przy alarmach
v4.0 (Planowane)
[ ] Aplikacja mobilna (Flutter)
[ ] Kamera (ESP32-CAM) + zrzuty co 1h
[ ] Integracja z Google Home / Alexa
[ ] Podajnik pokarmu (servo)
[ ] Symulacja deszczu (dodatkowa pompka)
Pomysły
Machine Learning - predykcja temperatury
MQTT zamiast Firebase (offline-first)
Multi-terrarium support (wiele terrariów w jednym panelu)
👨‍💻 Autor
[Krzysiek]

GitHub: @twoj-username
Email: twoj@email.pl
🤝 Contributing
Pull requesty są mile widziane! Jeśli masz pomysły na ulepszenia:

Fork projektu
Utwórz branch (git checkout -b feature/super-funkcja)
Commit zmian (git commit -m 'Dodano super funkcję')
Push do brancha (git push origin feature/super-funkcja)
Otwórz Pull Request
🙏 Podziękowania
Mobizt - FirebaseESP8266 library
Adafruit - Sensor & Display libraries
Społeczność ESP8266 Arduino
📄 Licencja
Ten projekt jest licencjonowany na zasadach MIT License - szczegóły w pliku LICENSE.

MIT License Copyright (c) 2024 [Krzysiek] Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction...
⚠️ Disclaimer
Projekt jest dostarczany "AS IS" bez żadnych gwarancji
Autor nie ponosi odpowiedzialności za uszkodzenia sprzętu lub zwierząt
Przed użyciem w produkcyjnym terrarium przetestuj system przez kilka dni
Regularnie sprawdzaj warunki w terrarium (nie polegaj wyłącznie na automatyce)
Zawsze miej plan B (np. manualny termostat awaryjny)

🔗 Linki
Firebase Documentation
ESP8266 Arduino Core
WS2812b Datasheet
DHT22 Datasheet
Correlophus ciliatus Care Guide
Zrobione z ❤️ dla gadów

⬆ Powrót do góry

```
📝 Dodatkowe pliki do utworzenia
.gitignore
gitignore

# Arduino
*.elf
*.hex
*.bin

# IDE
.vscode/
.idea/

# Credentials (NIGDY nie commituj!)
firebase-config.json
secrets.h

# OS
.DS_Store
Thumbs.db

# Logs
*.log
LICENSE (MIT)
MIT License Copyright (c) 2024 [Twoje Imię] Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
