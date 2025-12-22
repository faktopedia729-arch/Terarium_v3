/* script.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Dane Twojego projektu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDpKe0M" + "WMGEIZ8w26ukKkRYwNWnzGa2S60", // Rozbite API Key
    authDomain: "terrarium-v3-21ba4.firebaseapp.com",
    databaseURL: "https://terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "terrarium-v3-21ba4",
    storageBucket: "terrarium-v3-21ba4.firebasestorage.app",
    messagingSenderId: "387514732102",
    appId: "1:387514732102:web:0b5efff0510fe47b690447"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Po załadowaniu skryptu, pokaż panel i ukryj komunikat logowania
document.getElementById('login-form').style.display = 'none';
document.getElementById('app-container').style.display = 'block';

// --- ODCZYT DANYCH Z CZUJNIKÓW (DHT22) ---
onValue(ref(db, 'readings'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        document.getElementById('temperature').innerText = data.temperature.toFixed(1);
        document.getElementById('humidity').innerText = data.humidity.toFixed(1);
    }
});

// --- NASŁUCHIWANIE STANU URZĄDZEŃ ---
onValue(ref(db, 'actuators'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        updateDeviceStatus('heater', data.heater);
        updateDeviceStatus('mist', data.mist);
        updateDeviceStatus('fan', data.fan);
        updateDeviceStatus('led', data.led);
    }
});

// Funkcja aktualizująca wygląd przycisków na stronie
function updateDeviceStatus(device, state) {
    const statusEl = document.getElementById(`${device}-status`);
    if (statusEl) {
        statusEl.innerText = state ? "ON" : "OFF";
        statusEl.className = `status-pill ${state ? 'on' : 'off'}`;
    }
}

// --- FUNKCJE STEROWANIA (Wysyłanie do Firebase) ---
window.toggleDevice = (device) => {
    const deviceRef = ref(db, `actuators/${device}`);
    // Pobierz obecny stan i zmień na przeciwny (tylko raz)
    onValue(deviceRef, (snapshot) => {
        const currentState = snapshot.val();
        set(deviceRef, !currentState);
    }, { onlyOnce: true });
};

// --- ZAPISYWANIE USTAWIEŃ AUTO ---
window.saveSetpoints = () => {
    const t = document.getElementById('temp-setpoint').value;
    const hMin = document.getElementById('hum-min-setpoint').value;
    const hMax = document.getElementById('hum-max-setpoint').value;

    update(ref(db, 'config'), {
        target_temp: parseFloat(t),
        hum_min: parseFloat(hMin),
        hum_max: parseFloat(hMax)
    }).then(() => alert("✅ Ustawienia zapisane!"));
};

// Przypisanie funkcji do przycisków w HTML
document.getElementById('save-setpoints-btn').onclick = window.saveSetpoints;
document.getElementById('heater-toggle-btn').onclick = () => window.toggleDevice('heater');
document.getElementById('mist-toggle-btn').onclick = () => window.toggleDevice('mist');
document.getElementById('fan-toggle-btn').onclick = () => window.toggleDevice('fan');
document.getElementById('led-toggle-btn').onclick = () => window.toggleDevice('led');