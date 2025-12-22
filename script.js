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
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperatura (°C)',
                    borderColor: '#ff3b30', // Czerwony
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    data: [],
                    yAxisID: 'y', // Przypisanie do lewej osi
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Wilgotność (%)',
                    borderColor: '#007aff', // Niebieski
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    data: [],
                    yAxisID: 'y1', // Przypisanie do prawej osi
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
                grid: { color: '#333', drawOnChartArea: true }, // Widoczna kratka pionowa
                ticks: { color: '#888', maxRotation: 45, minRotation: 45 }
            },
            y: { // Oś temperatury (lewa)
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Temp °C', color: '#ff3b30' },
                grid: { color: '#333' }, // Kratka pozioma
                ticks: { color: '#ff3b30' },
                min: 15, max: 40 // Stały zakres dla lepszej czytelności
            },
            y1: { // Oś wilgotności (prawa)
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Wilg %', color: '#007aff' },
                ticks: { color: '#007aff' },
                min: 30, max: 100, // Stały zakres dla wilgotności
                grid: { drawOnChartArea: false } // Wyłączamy dublowanie siatki poziomiej
            }
        },
        plugins: {
            legend: { labels: { color: '#fff' } }
        }
    }
});

    // Funkcja pobierająca dane z Firebase
    window.updateChartRange = (points) => {
        const historyRef = query(ref(db, 'history'), limitToLast(points));
        onValue(historyRef, (sn) => {
            const d = sn.val(); if (!d) return;
            chart.data.labels = []; 
            chart.data.datasets[0].data = []; 
            chart.data.datasets[1].data = [];
            
            Object.keys(d).sort().forEach(k => {
                const date = new Date(parseInt(k) * 1000);
                const timeStr = date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
                
                chart.data.labels.push(timeStr);
                chart.data.datasets[0].data.push(d[k].t);
                chart.data.datasets[1].data.push(d[k].h);
            });
            chart.update();
        });
    };

    // Domyślne załadowanie 20 punktów (5h) przy starcie
    updateChartRange(20);

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