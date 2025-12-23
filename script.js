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

// --- LOGOWANIE ---
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
    loginBtn.onclick = () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, pass)
            .catch(e => alert("Błąd logowania: " + e.message));
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

function initApp() {
    // Odczyt czujników
    onValue(ref(db, 'readings'), (sn) => {
        const d = sn.val();
        if (d) {
            document.getElementById('temperature').innerText = d.temperature.toFixed(1);
            document.getElementById('humidity').innerText = d.humidity.toFixed(0);
        }
    });

    // Odczyt stanów urządzeń
    onValue(ref(db, 'actuators'), (sn) => {
        const d = sn.val();
        if (d) {
            updateUI('heater-toggle-btn', d.heater);
            updateUI('mist-toggle-btn', d.mist);
            updateUI('fan-toggle-btn', d.fan);
            updateUI('led-toggle-btn', d.led);
        }
    });

    initChart();
}

function updateUI(id, state) {
    const btn = document.getElementById(id);
    if (btn) {
        state ? btn.classList.add('active') : btn.classList.remove('active');
    }
}

// Funkcja przełączania
window.toggleDevice = (key) => {
    const r = ref(db, `actuators/${key}`);
    onValue(r, (sn) => {
        set(r, !sn.val());
    }, { onlyOnce: true });
};

// Przypisanie zdarzeń do przycisków
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
                    display: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#888', autoSkip: true, maxTicksLimit: 10 }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '°C' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
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

    // Dynamiczna aktualizacja zakresu
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

    updateChartRange(20); // Start z 5h
}
function updateColor(hex) {
    // Zamiana formatu #RRGGBB na liczby dziesiętne R, G, B
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);

    console.log("Wysyłam kolor:", r, g, b); // Debugowanie w konsoli przeglądarki

    // Wysyłanie żądania do serwera na NodeMCU
    fetch(`/setColor?r=${r}&g=${g}&b=${b}`)
        .then(response => console.log("Serwer odpowiedział"))
        .catch(err => console.error("Błąd wysyłania:", err));
}