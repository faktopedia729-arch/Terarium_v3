// Importy Firebase (Wersja v9/v10 Modularna)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// KONFIGURACJA (Wklej swoje prawdziwe dane tutaj)
// Zaimportuj potrzebne funkcje z zestawów SDK, których potrzebujesz
import { initializeApp } z "firebase/app" ;   
import { getAnalytics } z "firebase/analytics" ;   
// TODO: Dodaj zestawy SDK dla produktów Firebase, których chcesz używać
// https://firebase.google.com/docs/web/setup#available-libraries

// Konfiguracja Firebase Twojej aplikacji internetowej
// W przypadku Firebase JS SDK w wersji 7.20.0 i nowszych parametr measurementId jest opcjonalny
const firebaseConfig = { 
  apiKey : "AIzaSyDpKe0MWMGEIZ8w26ukKkRYwNWnzGa2S60" , 
  authDomain : "terrarium-v3-21ba4.firebaseapp.com" , 
  databaseURL : "https://terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app" , 
  identyfikator projektu : "terrarium-v3-21ba4" , 
  storageBucket : "terrarium-v3-21ba4.firebasestorage.app" , 
  messagingSenderId : "387514732102" , 
  Identyfikator aplikacji : "1:387514732102:web:0b5efff0510fe47b690447" , 
  MeasurementId : "G-GSY4D9Z3EB" 
};

// Zainicjuj Firebase
//const app = initializeApp ( firebaseConfig );
const analytics = getAnalytics ( aplikacja );

// Inicjalizacja
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Zmienna globalna dla wykresu
let myChart = null;

// --- OBSŁUGA UI I LOGOWANIA ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Logowanie
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = () => {
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;

            if (!email || !pass) { alert("Podaj email i hasło"); return; }

            signInWithEmailAndPassword(auth, email, pass)
                .then(() => console.log("Zalogowano"))
                .catch(e => {
                    document.getElementById('auth-error').innerText = "Błąd: " + e.message;
                    document.getElementById('auth-error').style.display = 'block';
                });
        };
    }

    // Wylogowanie (opcjonalnie, jeśli dodasz przycisk w HTML)
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.onclick = () => signOut(auth);
});

// --- STANY UŻYTKOWNIKA ---
onAuthStateChanged(auth, (user) => {
    const loginForm = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');

    if (user) {
        if (loginForm) loginForm.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        initApp(); // Start nasłuchiwania danych
    } else {
        if (loginForm) loginForm.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
    }
});

// --- GŁÓWNA LOGIKA DANYCH ---
function initApp() {
    console.log("Start aplikacji...");

    // 1. ODCZYT SENSORÓW (Realtime)
    onValue(ref(db, 'readings'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateText('val-temp', data.temperature ? data.temperature.toFixed(1) : '--');
            updateText('val-hum', data.humidity ? data.humidity.toFixed(0) : '--');
            
            const now = new Date();
            updateText('last-update', now.toLocaleTimeString());
        }
    });

    // 2. SYNCHRONIZACJA PRZYCISKÓW I SUWAKÓW
    onValue(ref(db, 'actuators'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateBtnState('btn-heater', data.heater);
            updateBtnState('btn-mist', data.mist);
            updateBtnState('btn-fan', data.fan);
            updateBtnState('btn-led', data.led);

            // Synchronizacja suwaka jasności (jeśli ktoś zmienił go na innym urządzeniu)
            const slider = document.getElementById('brightness-slider');
            if (slider && document.activeElement !== slider) { // Nie zmieniaj jeśli użytkownik właśnie przesuwa
                slider.value = data.brightness || 255;
            }

            // Tryb AUTO
            const autoTxt = document.getElementById('auto-status-text');
            const autoIcon = document.getElementById('auto-icon');
            if(autoTxt && autoIcon) {
                if(data.auto_mode) {
                    autoTxt.innerText = "ON"; autoTxt.style.color = "#00e676";
                    autoIcon.style.color = "#00e676";
                } else {
                    autoTxt.innerText = "OFF"; autoTxt.style.color = "#666";
                    autoIcon.style.color = "#666";
                }
            }
        }
    });

    // 3. INICJALIZACJA WYKRESU
    initChart();
}

// --- FUNKCJE POMOCNICZE UI ---
function updateText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}

function updateBtnState(id, isActive) {
    const btn = document.getElementById(id);
    if(btn) {
        if(isActive) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}

// --- FUNKCJE STERUJĄCE (Eksportowane do window dla HTML onclick) ---

// Przełączanie ON/OFF
window.toggleDevice = (deviceKey) => {
    // Pobieramy aktualny stan, aby go odwrócić
    // (Można też trzymać stan lokalnie w zmiennej, ale pobranie jest pewniejsze)
    const deviceRef = ref(db, `actuators/${deviceKey}`);
    
    // onValue z {onlyOnce: true} działa jak jednorazowy get()
    onValue(deviceRef, (snapshot) => {
        const current = snapshot.val();
        const updates = {};
        updates[`actuators/${deviceKey}`] = !current;
        
        // Opcjonalnie: Wyłącz tryb AUTO jeśli sterujemy ręcznie
        // updates['actuators/auto_mode'] = false; 
        
        update(ref(db), updates);
    }, { onlyOnce: true });
};

// Zmiana koloru (HEX -> RGB)
window.handleColorChange = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    // Zapisujemy od razu do bazy. ESP wykryje zmianę.
    update(ref(db, 'actuators'), {
        led_r: r,
        led_g: g,
        led_b: b,
        led_mode: 'static',
        led: true
    });
};

// Zmiana trybu LED (Fire, Storm etc.)
window.setLedMode = (mode) => {
    update(ref(db, 'actuators'), {
        led_mode: mode,
        led: true
    });
};

// Obsługa suwaka jasności
const brightSlider = document.getElementById('brightness-slider');
if(brightSlider) {
    brightSlider.addEventListener('change', (e) => {
        set(ref(db, 'actuators/brightness'), parseInt(e.target.value));
    });
}

// --- LOGIKA WYKRESU ---
function initChart() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return; // Jeśli nie ma elementu canvas, przerwij (np. strona logowania)

    // Konfiguracja wykresu
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatura (°C)',
                borderColor: '#ff5252',
                backgroundColor: 'rgba(255, 82, 82, 0.1)',
                data: [],
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Wilgotność (%)',
                borderColor: '#40c4ff',
                backgroundColor: 'rgba(64, 196, 255, 0.1)',
                data: [],
                fill: true,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: '#333' }, ticks: { color: '#888' } },
                y: { type: 'linear', position: 'left', grid: { color: '#333' }, ticks: { color: '#ccc' } },
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#ccc' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });

    // Pobieranie ostatnich 20 wpisów historii
    const historyQuery = query(ref(db, 'history'), limitToLast(20));
    
    onValue(historyQuery, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const labels = [];
        const temps = [];
        const hums = [];

        // Firebase zwraca obiekt, musimy go posortować po kluczach (timestampach)
        Object.keys(data).sort().forEach(timestamp => {
            const entry = data[timestamp];
            const date = new Date(parseInt(timestamp) * 1000); // Konwersja sekund na ms
            const timeStr = date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
            
            labels.push(timeStr);
            temps.push(entry.t); // t = temperatura (skrót dla oszczędności bazy)
            hums.push(entry.h);  // h = wilgotność
        });

        myChart.data.labels = labels;
        myChart.data.datasets[0].data = temps;
        myChart.data.datasets[1].data = hums;
        myChart.update();
    });
}