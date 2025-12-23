import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Funkcja, która uruchomi się dopiero gdy strona się wczyta
window.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    
    if (loginBtn) {
        console.log("System gotowy, przycisk logowania znaleziony.");

        loginBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Zapobiega przeładowaniu strony
            
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;

            console.log("Próba logowania dla:", email);

            signInWithEmailAndPassword(auth, email, pass)
                .then((userCredential) => {
                    console.log("Zalogowano pomyślnie!");
                })
                .catch((error) => {
                    console.error("Błąd Firebase:", error.code, error.message);
                    alert("Błąd: " + error.message);
                });
        });
    } else {
        console.error("Nie znaleziono przycisku o ID 'login-btn'!");
    }
});
// --- KONFIGURACJA ---
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

// --- OBSŁUGA LOGOWANIA ---
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Błąd: " + e.message));
    };
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initApp();
    } else {
        document.getElementById('login-form').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

// --- GŁÓWNA LOGIKA APLIKACJI ---
function initApp() {
    // 1. Nasłuchiwanie czujników (Dashboard)
    onValue(ref(db, 'readings'), (sn) => {
        const d = sn.val();
        if (d) {
            document.getElementById('temperature').innerText = d.temperature.toFixed(1);
            document.getElementById('humidity').innerText = d.humidity.toFixed(0);
            document.getElementById('connection-status').innerText = "Ostatnia aktualizacja: " + (d.last_sync || "teraz");
        }
    });

    // 2. Nasłuchiwanie stanów urządzeń (Synchronizacja przycisków i suwaków)
    onValue(ref(db, 'actuators'), (sn) => {
        const d = sn.val();
        if (d) {
            updateToggleButton('heater-toggle-btn', d.heater);
            updateToggleButton('mist-toggle-btn', d.mist);
            updateToggleButton('fan-toggle-btn', d.fan);
            updateToggleButton('led-toggle-btn', d.led);
            
            // Kolor i jasność
            if (d.led_r !== undefined) {
                const hex = rgbToHex(d.led_r, d.led_g, d.led_b);
                document.getElementById('color-picker').value = hex;
            }
            if (d.brightness !== undefined) {
                document.getElementById('brightness-slider').value = d.brightness;
            }
            
            // Zaznaczenie aktywnego trybu LED
            document.querySelectorAll('.effect-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-mode') === d.led_mode);
            });
        }
    });

    initChart();
    renderRecentColors();
}

// --- FUNKCJE STERUJĄCE ---

// Przełączanie urządzeń (On/Off)
const toggleDevice = (key) => {
    const r = ref(db, `actuators/${key}`);
    // Pobieramy aktualny stan raz i wysyłamy przeciwny
    onValue(r, (sn) => {
        set(r, !sn.val());
    }, { onlyOnce: true });
};

// Obsługa przycisków w gridzie
document.getElementById('heater-toggle-btn').onclick = () => toggleDevice('heater');
document.getElementById('mist-toggle-btn').onclick = () => toggleDevice('mist');
document.getElementById('fan-toggle-btn').onclick = () => toggleDevice('fan');
document.getElementById('led-toggle-btn').onclick = () => toggleDevice('led');

// Zmiana koloru LED
window.updateColor = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    update(ref(db, 'actuators'), {
        led_r: r,
        led_g: g,
        led_b: b,
        led_mode: 'static'
    });
    saveRecentColor(hex);
};

// Zmiana trybu LED
document.querySelectorAll('.effect-btn').forEach(btn => {
    btn.onclick = () => {
        const mode = btn.getAttribute('data-mode');
        update(ref(db, 'actuators'), { led_mode: mode });
    };
});

// Suwak jasności
document.getElementById('brightness-slider').oninput = (e) => {
    set(ref(db, 'actuators/brightness'), parseInt(e.target.value));
};

// --- POMOCNICZE ---

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
        if (colors.length > 5) colors.pop();
        localStorage.setItem('recentColors', JSON.stringify(colors));
        renderRecentColors();
    }
}

function renderRecentColors() {
    const container = document.getElementById('recent-colors-container');
    const colors = JSON.parse(localStorage.getItem('recentColors') || '[]');
    container.innerHTML = '';
    colors.forEach(hex => {
        const div = document.createElement('div');
        div.className = 'color-circle';
        div.style.backgroundColor = hex;
        div.onclick = () => updateColor(hex);
        container.appendChild(div);
    });
}

// --- WYKRESY (Chart.js) ---
let mainChart;
function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Temp (°C)', borderColor: '#ff3b30', data: [], yAxisID: 'y', tension: 0.4 },
            { label: 'Wilg (%)', borderColor: '#007aff', data: [], yAxisID: 'y1', tension: 0.4 }
        ]},
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', position: 'left' },
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
    updateChartRange(20);
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

// Obsługa przycisków zakresu wykresu
document.querySelectorAll('.range-btn').forEach(btn => {
    btn.onclick = () => updateChartRange(parseInt(btn.getAttribute('data-points')));
});

// Obsługa przycisku AUTO
document.getElementById('auto-mode-toggle-btn').onclick = () => {
    const r = ref(db, 'settings/auto_enabled');
    onValue(r, (sn) => {
        set(r, !sn.val());
    }, { onlyOnce: true });
};

// Obsługa przycisku Zapisz
document.getElementById('save-settings-btn').onclick = () => {
    const updates = {
        target_temp: parseFloat(document.getElementById('target-temp-input').value),
        target_hum: parseFloat(document.getElementById('target-hum-input').value),
        hum_margin: parseFloat(document.getElementById('hum-margin-input').value)
    };
    update(ref(db, 'settings'), updates).then(() => alert("Zapisano!"));
};