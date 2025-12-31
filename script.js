import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// DODAŁEM 'get' DO IMPORTÓW PONIŻEJ:
import { getDatabase, ref, onValue, set, update, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDpKe0MWMGEIZ8w26ukKkRYwNWnzGa2S60",
    authDomain: "terrarium-v3-21ba4.firebaseapp.com",
    databaseURL: "https://terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "terrarium-v3-21ba4",
    appId: "1:387514732102:web:0b5efff0510fe47b690447"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- ZMIENNE POMOCNICZE ---
let lastHeartbeat = 0; // Kiedy ostatnio przyszły dane (timestamp)
let isOfflineDismissed = false; // Czy użytkownik zamknął okno błędu
const OFFLINE_THRESHOLD = 30000; // 30 sekund bez danych = OFFLINE

// --- OBSŁUGA LOGOWANIA I STARTU ---
window.addEventListener('DOMContentLoaded', () => {
    // Timer sprawdzający połączenie co 5 sekund
    setInterval(checkConnectionHealth, 5000);

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            signInWithEmailAndPassword(auth, email, pass)
                .then(() => console.log("Zalogowano pomyślnie!"))
                .catch(error => alert("Błąd logowania: " + error.message));
        });
    }

    // Obsługa zamknięcia okna offline
    document.getElementById('dismiss-offline-btn').addEventListener('click', () => {
        document.getElementById('offline-overlay').style.display = 'none';
        isOfflineDismissed = true;
        // Ustawiamy kreski, żeby nie mylić użytkownika
        document.getElementById('temperature').innerText = "--.-";
        document.getElementById('humidity').innerText = "--";
    });
});

onAuthStateChanged(auth, (user) => {
    const loginForm = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');
    if (user) {
        if(loginForm) loginForm.style.display = 'none';
        if(appContainer) appContainer.style.display = 'block';
        initApp();
    } else {
        if(loginForm) loginForm.style.display = 'flex';
        if(appContainer) appContainer.style.display = 'none';
    }
});

// --- GŁÓWNA LOGIKA APLIKACJI ---
function initApp() {
    // 1. Odczyty z czujników (Dashboard) + HEARTBEAT
    onValue(ref(db, 'readings'), (sn) => {
        const d = sn.val();
        if (d) {
            const dataTimestamp = d.timestamp ? d.timestamp * 1000 : 0;
            lastHeartbeat = dataTimestamp; 
            
            const timeDiff = Date.now() - lastHeartbeat;
            const isFresh = timeDiff < OFFLINE_THRESHOLD;

            if (isFresh) {
                // DANE ŚWIEŻE -> Wyświetlamy
                if(isOfflineDismissed) isOfflineDismissed = false;
                document.getElementById('offline-overlay').style.display = 'none';
                
                document.getElementById('temperature').innerText = d.temperature ? d.temperature.toFixed(1) : "--.-";
                document.getElementById('humidity').innerText = d.humidity ? d.humidity.toFixed(0) : "--";
                
                const nodeTime = new Date(dataTimestamp).toLocaleTimeString();
                document.getElementById('connection-status').innerText = "Ostatnia aktualizacja: " + nodeTime;
                document.getElementById('connection-status').style.color = "#95a5a6";
            } else {
                // DANE STARE
                if (!isOfflineDismissed) {
                    document.getElementById('offline-overlay').style.display = 'flex';
                }

                document.getElementById('temperature').innerText = "--.-";
                document.getElementById('humidity').innerText = "--";
                
                document.getElementById('connection-status').innerText = "Status: OFFLINE ⚠️ (Brak nowych danych)";
                document.getElementById('connection-status').style.color = "#e74c3c";
            }
        }
    });

    // 2. Stan urządzeń i LED
    onValue(ref(db, 'actuators'), (sn) => {
        const d = sn.val();
        if (d) {
            updateToggleButton('heater-toggle-btn', d.heater);
            updateToggleButton('mist-toggle-btn', d.mist);
            updateToggleButton('fan-toggle-btn', d.fan);
            updateToggleButton('led-toggle-btn', d.led);
            
            // Suwak jasności taśmy LED
            if (d.brightness !== undefined) {
                document.getElementById('brightness-slider').value = d.brightness;
            }
            
            if (d.led_r !== undefined) {
                document.getElementById('color-picker').value = rgbToHex(d.led_r, d.led_g, d.led_b);
            }

            document.querySelectorAll('.effect-btn').forEach(btn => {
                const mode = btn.getAttribute('data-mode');
                btn.classList.toggle('active', mode === d.led_mode);
            });
        }
    });

    // 3. Synchronizacja Ustawień (W TYM JASNOŚĆ EKRANU TFT)
    onValue(ref(db, 'settings'), (sn) => {
        const s = sn.val();
        if (s) {
            // Dzień
            document.getElementById('day-temp-input').value = s.day_temp || 28.0;
            document.getElementById('day-hum-input').value = s.day_hum || 60;
            document.getElementById('day-start-time').value = s.day_start || "08:00";
            
            // Noc
            document.getElementById('night-temp-input').value = s.night_temp || 22.0;
            document.getElementById('night-hum-input').value = s.night_hum || 80;
            document.getElementById('night-start-time').value = s.night_start || "20:00";

            updateToggleButton('auto-mode-toggle-btn', s.auto_enabled);

            // Synchronizacja suwaka jasności ekranu z bazą
            if (s.lcd_brightness !== undefined) {
                document.getElementById('screen-brightness-slider').value = s.lcd_brightness;
            }
        }
    });

    initChart();
    renderRecentColors();
}

// --- FUNKCJA WATCHDOG ---
function checkConnectionHealth() {
    if(!auth.currentUser) return;

    const now = Date.now();
    const isDataOld = (now - lastHeartbeat > OFFLINE_THRESHOLD);

    if (isDataOld) {
        if (!isOfflineDismissed) {
            document.getElementById('offline-overlay').style.display = 'flex';
        }
        
        document.getElementById('temperature').innerText = "--.-";
        document.getElementById('humidity').innerText = "--";

        document.getElementById('connection-status').innerText = "Status: OFFLINE ⚠️ (Brak nowych danych)";
        document.getElementById('connection-status').style.color = "#e74c3c";
    } else {
         document.getElementById('connection-status').style.color = "#95a5a6";
    }
}

// --- FUNKCJE STERUJĄCE (POPRAWIONE) ---

// Nowa, inteligentna funkcja przełączania
const toggleDevice = (device) => {
    const dbRef = ref(db);
    
    // 1. Pobierz aktualny stan urządzenia
    get(ref(db, `actuators/${device}`)).then((snapshot) => {
        const currentVal = snapshot.val();
        const newVal = !currentVal;
        
        const updates = {};
        // Ustaw nową wartość urządzenia
        updates[`actuators/${device}`] = newVal;

        // WAŻNE FIX: Jeśli sterujemy Matą, Wiatrakiem lub Mgłą -> WYŁĄCZAMY TRYB AUTO
        // Dzięki temu NodeMCU nie nadpisuje naszej decyzji
        if (['heater', 'mist', 'fan'].includes(device)) {
            updates['settings/auto_enabled'] = false;
        }

        // Wyślij wszystko w jednej paczce do Firebase
        update(dbRef, updates)
            .then(() => console.log(`Przełączono ${device} na ${newVal} (Auto wyłączone)`))
            .catch((error) => alert("Błąd przełączania: " + error.message));
    });
};

// Przypisanie zdarzeń do przycisków (Używamy nowej funkcji toggleDevice)
document.getElementById('heater-toggle-btn').onclick = () => toggleDevice('heater');
document.getElementById('mist-toggle-btn').onclick = () => toggleDevice('mist');
document.getElementById('fan-toggle-btn').onclick = () => toggleDevice('fan');
document.getElementById('led-toggle-btn').onclick = () => toggleDevice('led');

// Przycisk Auto Mode - tu wystarczy zwykłe przełączenie samej flagi
document.getElementById('auto-mode-toggle-btn').onclick = () => {
    const autoRef = ref(db, 'settings/auto_enabled');
    get(autoRef).then((sn) => set(autoRef, !sn.val()));
};

// ZDALNY RESET
document.getElementById('reset-device-btn').onclick = () => {
    if(confirm("Czy na pewno chcesz zrestartować NodeMCU?")) {
        set(ref(db, 'system/reset'), true)
        .then(() => alert("Wysłano komendę resetu."))
        .catch((e) => alert("Błąd: " + e.message));
    }
};

// Obsługa Kolorów
document.getElementById('apply-color-btn').onclick = () => {
    const hex = document.getElementById('color-picker').value;
    updateColor(hex);
};

window.updateColor = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    // led: true włącza pasek przy zmianie koloru
    update(ref(db, 'actuators'), {
        led_r: r, led_g: g, led_b: b, 
        led_mode: 'static',
        led: true 
    });
    saveRecentColor(hex);
};

// Jasność Taśmy LED (Używamy onchange żeby nie spamować bazy)
document.getElementById('brightness-slider').onchange = (e) => {
    set(ref(db, 'actuators/brightness'), parseInt(e.target.value));
};

// Jasność Ekranu TFT
const screenSlider = document.getElementById('screen-brightness-slider');
if (screenSlider) {
    screenSlider.onchange = (e) => {
        update(ref(db, 'settings'), { lcd_brightness: parseInt(e.target.value) });
    };
}

// Tryby Efektów
document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        update(ref(db, 'actuators'), { led_mode: mode, led: true });
    };
});

// ZAPIS NOWYCH USTAWIEŃ (Harmonogram)
document.getElementById('save-settings-btn').onclick = () => {
    const updates = {
        // Dzień
        day_temp: parseFloat(document.getElementById('day-temp-input').value),
        day_hum: parseInt(document.getElementById('day-hum-input').value),
        day_start: document.getElementById('day-start-time').value,
        
        // Noc
        night_temp: parseFloat(document.getElementById('night-temp-input').value),
        night_hum: parseInt(document.getElementById('night-hum-input').value),
        night_start: document.getElementById('night-start-time').value
    };
    
    update(ref(db, 'settings'), updates)
        .then(() => alert("Harmonogram zapisany!"))
        .catch(err => alert("Błąd zapisu: " + err.message));
};

// --- FUNKCJE POMOCNICZE ---
function updateToggleButton(id, state) {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', state === true);
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function saveRecentColor(hex) {
    let colors = JSON.parse(localStorage.getItem('recentColors') || '[]');
    if (!colors.includes(hex)) {
        colors.unshift(hex);
        if (colors.length > 3) colors.pop();
        localStorage.setItem('recentColors', JSON.stringify(colors));
        renderRecentColors();
    }
}

function renderRecentColors() {
    const container = document.getElementById('recent-colors-container');
    const colors = JSON.parse(localStorage.getItem('recentColors') || '[]');
    if(!container) return;
    container.innerHTML = '';
    colors.forEach(hex => {
        const div = document.createElement('div');
        div.className = 'color-circle';
        div.style.backgroundColor = hex;
        div.onclick = () => updateColor(hex);
        container.appendChild(div);
    });
}

// --- WYKRESY ---
let mainChart;
function initChart() {
    const canvas = document.getElementById('mainChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Temp (°C)', borderColor: '#e74c3c', data: [], yAxisID: 'y', tension: 0.4 },
            { label: 'Wilg (%)', borderColor: '#3498db', data: [], yAxisID: 'y1', tension: 0.4 }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { type: 'linear', position: 'left' }, 
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } } 
            }
        }
    });
    updateChartRange(24);
}

window.updateChartRange = (points) => {
    const historyRef = query(ref(db, 'history'), limitToLast(points));
    onValue(historyRef, (sn) => {
        const d = sn.val();
        if (!d) return;
        const labels = [], tData = [], hData = [];
        Object.keys(d).sort().forEach(k => {
            const time = new Date(parseInt(k) * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            labels.push(time);
            tData.push(d[k].t);
            hData.push(d[k].h);
        });
        mainChart.data.labels = labels;
        mainChart.data.datasets[0].data = tData;
        mainChart.data.datasets[1].data = hData;
        mainChart.update();
    });
};

document.querySelectorAll('.range-btn').forEach(btn => {
    btn.onclick = () => updateChartRange(parseInt(btn.getAttribute('data-points')));
});
