// Importy Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpKe0MWMGEIZ8w26ukKkRYwNWnzGa2S60",
    authDomain: "terrarium-v3-21ba4.firebaseapp.com",
    databaseURL: "https://terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "terrarium-v3-21ba4",
    appId: "1:387514732102:web:0b5efff0510fe47b690447"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// --- LOGOWANIE (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = () => {
            console.log("Próba logowania...");
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;

            if (!email || !pass) {
                alert("Wpisz email i hasło!");
                return;
            }

            signInWithEmailAndPassword(auth, email, pass)
                .then((userCredential) => {
                    console.log("Zalogowano użytkownika:", userCredential.user.email);
                })
                .catch(e => {
                    console.error("Błąd Firebase Auth:", e.code);
                    alert("Błąd logowania: " + e.message);
                });
        };
    } else {
        console.error("Nie znaleziono przycisku login-btn w HTML!");
    }

    // Przypisanie zdarzeń do przycisków ON/OFF (po załadowaniu DOM)
    const heaterBtn = document.getElementById('heater-toggle-btn');
    if(heaterBtn) heaterBtn.onclick = () => toggleDevice('heater');
    
    const mistBtn = document.getElementById('mist-toggle-btn');
    if(mistBtn) mistBtn.onclick = () => toggleDevice('mist');
    
    const fanBtn = document.getElementById('fan-toggle-btn');
    if(fanBtn) fanBtn.onclick = () => toggleDevice('fan');
    
    const ledBtn = document.getElementById('led-toggle-btn');
    if(ledBtn) ledBtn.onclick = () => toggleDevice('led');
});

// Reakcja na zmianę stanu zalogowania
onAuthStateChanged(auth, (user) => {
    const loginForm = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');

    if (user) {
        console.log("Użytkownik zalogowany - przełączam widok.");
        if (loginForm) loginForm.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        initApp();
    } else {
        console.log("Użytkownik niezalogowany.");
        if (loginForm) loginForm.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
});

// --- GŁÓWNA APLIKACJA ---
function initApp() {
    console.log("Inicjalizacja pobierania danych z Firebase...");
    
    // 1. Odczyt czujników
    const readingsRef = ref(db, 'readings');
    onValue(readingsRef, (sn) => {
        const d = sn.val();
        if (d) {
            console.log("Nowe dane z NodeMCU:", d);
            const tempElem = document.getElementById('temperature');
            const humElem = document.getElementById('humidity');
            if (tempElem && d.temperature !== undefined) tempElem.innerText = d.temperature.toFixed(1);
            if (humElem && d.humidity !== undefined) humElem.innerText = d.humidity.toFixed(0);
        }
    });

    // 2. Odczyt stanów urządzeń + LED
    onValue(ref(db, 'actuators'), (sn) => {
        const d = sn.val();
        if (d) {
            updateUI('heater-toggle-btn', d.heater);
            updateUI('mist-toggle-btn', d.mist);
            updateUI('fan-toggle-btn', d.fan);
            updateUI('led-toggle-btn', d.led);

            // Aktualizacja UI LED
            if (d.led_r !== undefined && d.led_g !== undefined && d.led_b !== undefined) {
                const hex = "#" + ((1 << 24) + (d.led_r << 16) + (d.led_g << 8) + d.led_b).toString(16).slice(1);
                const colorPicker = document.getElementById('color-picker');
                if (colorPicker) colorPicker.value = hex;
            }
            if (d.brightness !== undefined) {
                const slider = document.getElementById('brightness-slider');
                if (slider) slider.value = d.brightness;
            }
        }
    });

    // 3. Uruchomienie wykresu
    initChart();
}

// Funkcje pomocnicze
function updateUI(id, state) {
    const btn = document.getElementById(id);
    if (btn) {
        state ? btn.classList.add('active') : btn.classList.remove('active');
    }
}

window.toggleDevice = (key) => {
    const r = ref(db, `actuators/${key}`);
    onValue(r, (sn) => {
        set(r, !sn.val());
    }, { onlyOnce: true });
};

// --- OBSŁUGA OŚWIETLENIA ---
window.updateColor = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    // Synchronizacja z NodeMCU (opcjonalna)
    fetch(`/setColor?r=${r}&g=${g}&b=${b}`).catch(() => {});

    // Zapis do Firebase
    set(ref(db, 'actuators/led_r'), r);
    set(ref(db, 'actuators/led_g'), g);
    set(ref(db, 'actuators/led_b'), b);
    set(ref(db, 'actuators/led_mode'), "static");
};

window.setLedMode = (mode) => {
    fetch(`/setMode?m=${mode}`).catch(() => {});
    set(ref(db, 'actuators/led_mode'), mode);
};

const brightnessSlider = document.getElementById('brightness-slider');
if (brightnessSlider) {
    brightnessSlider.oninput = (e) => {
        set(ref(db, 'actuators/brightness'), parseInt(e.target.value));
    };
}

// --- SEKCJA WYKRESU ---
function initChart() {
    const chartCtx = document.getElementById('mainChart');
    if (!chartCtx) return;
    const ctx = chartCtx.getContext('2d');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    borderColor: '#ff3b30',
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    data: [],
                    yAxisID: 'y',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Wilgotność (%)',
                    borderColor: '#007aff',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    data: [],
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#888', autoSkip: true, maxTicksLimit: 10 }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: '°C' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: '%' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: { labels: { color: '#fff' } }
            }
        }
    });

    window.updateChartRange = (points) => {
        const historyRef = query(ref(db, 'history'), limitToLast(points));
        onValue(historyRef, (sn) => {
            const d = sn.val();
            if (!d) return;

            const labels = [];
            const tempData = [];
            const humData = [];

            Object.keys(d).sort().forEach(k => {
                const date = new Date(parseInt(k) * 1000);
                const timeStr = date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
                labels.push(timeStr);
                tempData.push(d[k].t);
                humData.push(d[k].h);
            });

            chart.data.labels = labels;
            chart.data.datasets[0].data = tempData;
            chart.data.datasets[1].data = humData;
            chart.update();
        });
    };

    updateChartRange(20);
}