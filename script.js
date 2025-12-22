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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Logowanie
document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(e => alert("Błąd logowania!"));
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        initApp();
    }
});

function initApp() {
    onValue(ref(db, 'readings'), (sn) => {
        const d = sn.val();
        document.getElementById('temperature').innerText = d.temperature.toFixed(1);
        document.getElementById('humidity').innerText = d.humidity.toFixed(0);
    });

    onValue(ref(db, 'actuators'), (sn) => {
        const d = sn.val();
        updateUI('heater-toggle-btn', d.heater);
        updateUI('mist-toggle-btn', d.mist);
        updateUI('fan-toggle-btn', d.fan);
        updateUI('led-toggle-btn', d.led);
    });

    initChart();
}

function updateUI(id, state) {
    const btn = document.getElementById(id);
    state ? btn.classList.add('active') : btn.classList.remove('active');
}

window.toggleDevice = (key) => {
    const r = ref(db, `actuators/${key}`);
    onValue(r, (sn) => { set(r, !sn.val()); }, { onlyOnce: true });
};

document.getElementById('heater-toggle-btn').onclick = () => toggleDevice('heater');
document.getElementById('mist-toggle-btn').onclick = () => toggleDevice('mist');
document.getElementById('fan-toggle-btn').onclick = () => toggleDevice('fan');
document.getElementById('led-toggle-btn').onclick = () => toggleDevice('led');

function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Temp', borderColor: '#e74c3c', data: [] }, { label: 'Hum', borderColor: '#3498db', data: [] }] },
        options: { responsive: true, scales: { x: { display: false } } }
    });

    onValue(query(ref(db, 'history'), limitToLast(24)), (sn) => {
        const d = sn.val();
        if (!d) return;
        chart.data.labels = []; chart.data.datasets[0].data = []; chart.data.datasets[1].data = [];
        Object.keys(d).forEach(k => {
            chart.data.labels.push("");
            chart.data.datasets[0].data.push(d[k].t);
            chart.data.datasets[1].data.push(d[k].h);
        });
        chart.update();
    });
}