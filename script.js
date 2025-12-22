import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDpKe0M" + "WMGEIZ8w26ukKkRYwNWnzGa2S60",
    authDomain: "terrarium-v3-21ba4.firebaseapp.com",
    databaseURL: "https://terrarium-v3-21ba4-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "terrarium-v3-21ba4",
    storageBucket: "terrarium-v3-21ba4.firebasestorage.app",
    messagingSenderId: "387514732102",
    appId: "1:387514732102:web:0b5efff0510fe47b690447"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.getElementById('login-form').style.display = 'none';
document.getElementById('app-container').style.display = 'block';

// ODCZYT CZUJNIKÓW
onValue(ref(db, 'readings'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        document.getElementById('temperature').innerText = data.temperature ? data.temperature.toFixed(1) : "N/A";
        document.getElementById('humidity').innerText = data.humidity ? data.humidity.toFixed(1) : "N/A";
    }
});

// NASŁUCHIWANIE I AKTUALIZACJA PRZYCISKÓW NA STRONIE
onValue(ref(db, 'actuators'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        updateUI('heater', data.mata);
        updateUI('mist', data.mglica);
        updateUI('fan', data.wiatrak);
        updateUI('led', data.led);
    }
});

function updateUI(device, state) {
    const el = document.getElementById(`${device}-status`);
    if (el) {
        el.innerText = state ? "ON" : "OFF";
        el.className = `status-pill ${state ? 'on' : 'off'}`;
    }
}

// STEROWANIE
window.toggleDevice = (firebaseKey) => {
    const deviceRef = ref(db, `actuators/${firebaseKey}`);
    onValue(deviceRef, (snapshot) => {
        const currentState = snapshot.val();
        set(deviceRef, !currentState);
    }, { onlyOnce: true });
};

window.saveSetpoints = () => {
    const t = document.getElementById('temp-setpoint').value;
    const h = document.getElementById('hum-min-setpoint').value;
    update(ref(db, 'settings'), {
        target_t: parseFloat(t),
        target_h: parseFloat(h)
    }).then(() => alert("✅ Zapisano!"));
};

document.getElementById('save-setpoints-btn').onclick = window.saveSetpoints;
document.getElementById('heater-toggle-btn').onclick = () => window.toggleDevice('mata');
document.getElementById('mist-toggle-btn').onclick = () => window.toggleDevice('mglica');
document.getElementById('fan-toggle-btn').onclick = () => window.toggleDevice('wiatrak');
document.getElementById('led-toggle-btn').onclick = () => window.toggleDevice('led');