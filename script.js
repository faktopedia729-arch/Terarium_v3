import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// --- OBSŁUGA LOGOWANIA I STARTU ---
window.addEventListener('DOMContentLoaded', () => {
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
    // 1. Odczyty z czujników (Dashboard)
    onValue(ref(db, 'readings'), (sn) => {
        const d = sn.val();
        if (d) {
            document.getElementById('temperature').innerText = d.temperature.toFixed(1);
            document.getElementById('humidity').innerText = d.humidity.toFixed(0);
            document.getElementById('connection-status').innerText = "Ostatnia aktualizacja: " + (d.last_sync || "teraz");
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
            document.getElementById('brightness-slider').value = d.brightness || 255;
            
            if (d.led_r !== undefined) {
                document.getElementById('color-picker').value = rgbToHex(d.led_r, d.led_g, d.led_b);
            }

            document.querySelectorAll('.effect-btn').forEach(btn => {
                const mode = btn.getAttribute('data-mode');
                btn.classList.toggle('active', mode === d.led_mode);
            });
        }
    });

    // 3. Synchronizacja Ustawień (Zapobiega znikaniu danych w polach)
    onValue(ref(db, 'settings'), (sn) => {
        const s = sn.val();
        if (s) {
            document.getElementById('target-temp-input').value = s.target_temp || 28;
            document.getElementById('target-hum-input').value = s.target_hum || 60;
            document.getElementById('hum-margin-input').value = s.hum_margin || 5;
            document.getElementById('led-on-time').value = s.led_on || "08:00";
            document.getElementById('led-off-time').value = s.led_off || "20:00";
            updateToggleButton('auto-mode-toggle-btn', s.auto_enabled);
        }
    });

    initChart();
    renderRecentColors();
}

// --- FUNKCJE STERUJĄCE ---

const toggleFirebase = (path) => {
    const r = ref(db, path);
    onValue(r, (sn) => {
        set(r, !sn.val());
    }, { onlyOnce: true });
};

// Przypisanie zdarzeń do przycisków
document.getElementById('heater-toggle-btn').onclick = () => toggleFirebase('actuators/heater');
document.getElementById('mist-toggle-btn').onclick = () => toggleFirebase('actuators/mist');
document.getElementById('fan-toggle-btn').onclick = () => toggleFirebase('actuators/fan');
document.getElementById('led-toggle-btn').onclick = () => toggleFirebase('actuators/led');
document.getElementById('auto-mode-toggle-btn').onclick = () => toggleFirebase('settings/auto_enabled');

// Obsługa Kolorów
document.getElementById('apply-color-btn').onclick = () => {
    const hex = document.getElementById('color-picker').value;
    updateColor(hex);
};

window.updateColor = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    update(ref(db, 'actuators'), {
        led_r: r, led_g: g, led_b: b, 
        led_mode: 'static',
        led: true 
    });
    saveRecentColor(hex);
};

// Jasność i Tryby
document.getElementById('brightness-slider').oninput = (e) => {
    set(ref(db, 'actuators/brightness'), parseInt(e.target.value));
};

document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        update(ref(db, 'actuators'), { led_mode: mode, led: true });
    };
});

// ZAPIS WSZYSTKICH USTAWIEŃ
document.getElementById('save-settings-btn').onclick = () => {
    const updates = {
        target_temp: parseFloat(document.getElementById('target-temp-input').value),
        target_hum: parseFloat(document.getElementById('target-hum-input').value),
        hum_margin: parseFloat(document.getElementById('hum-margin-input').value),
        led_on: document.getElementById('led-on-time').value,
        led_off: document.getElementById('led-off-time').value
    };
    update(ref(db, 'settings'), updates)
        .then(() => alert("Ustawienia zapisane pomyślnie!"))
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

// --- WYKRESY (Poprawione zakresy 4h, 12h, 24h) ---
let mainChart;
function initChart() {
    const canvas = document.getElementById('mainChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Temp (°C)', borderColor: '#ff3b30', data: [], yAxisID: 'y', tension: 0.3, fill: true, backgroundColor: 'rgba(255, 59, 48, 0.1)' },
            { label: 'Wilg (%)', borderColor: '#007aff', data: [], yAxisID: 'y1', tension: 0.3, fill: true, backgroundColor: 'rgba(0, 122, 255, 0.1)' }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { 
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(255,255,255,0.05)' } }, 
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } } 
            }
        }
    });
    updateChartRange(24); // Start: ostatnie 24 punkty
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