const API_BASE = 'http://localhost:8080/v1/telemetry';
let currentSensor = 'sensor-A1';
const charts = {};

// Initialize Charts
function initChart(id, color) {
    const ctx = document.getElementById(id).getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, color + '44');
    gradient.addColorStop(1, color + '00');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(10).fill(''),
            datasets: [{
                data: Array(10).fill(null),
                borderColor: color,
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Setup
document.addEventListener('DOMContentLoaded', () => {
    charts.temp = initChart('tempChart', '#00f2ff');
    charts.humidity = initChart('humidityChart', '#10b981');
    charts.pressure = initChart('pressureChart', '#7000ff');

    document.getElementById('sensorSelect').addEventListener('change', (e) => {
        currentSensor = e.target.value;
        // Reset charts on sensor change
        Object.values(charts).forEach(chart => {
            chart.data.datasets[0].data = Array(10).fill(null);
            chart.update();
        });
        updateDashboard();
    });

    // Start polling
    setInterval(updateDashboard, 5000);
    updateDashboard();
});

async function updateDashboard() {
    try {
        const response = await fetch(`${API_BASE}/${currentSensor}/latest`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const latest = data[0];
            updateUI(latest);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateUI(reading) {
    // Update Numeric Values
    animateValue('tempValue', reading.temperature, 1);
    animateValue('humidityValue', reading.humidity, 1);
    animateValue('pressureValue', reading.pressure, 0);
    animateValue('batteryValue', reading.batteryLevel, 0, '%');

    // Update Battery Fill
    const fill = document.getElementById('batteryFill');
    fill.style.width = `${reading.batteryLevel}%`;
    fill.style.background = reading.batteryLevel < 20 ? '#ef4444' : '#10b981';

    // Update Timestamp
    document.getElementById('lastUpdateTime').innerText = new Date(reading.recordedAt).toLocaleTimeString();

    // Update Charts
    updateChartData(charts.temp, reading.temperature);
    updateChartData(charts.humidity, reading.humidity);
    updateChartData(charts.pressure, reading.pressure);
}

function updateChartData(chart, newValue) {
    chart.data.datasets[0].data.shift();
    chart.data.datasets[0].data.push(newValue);
    chart.update('none'); // Update without animation for performance
}

function animateValue(id, target, decimals, suffix = '') {
    const el = document.getElementById(id);
    const current = parseFloat(el.innerText.replace(suffix, '')) || 0;
    const step = (target - current) / 10;
    let count = 0;

    const interval = setInterval(() => {
        count++;
        const val = current + (step * count);
        el.innerText = val.toFixed(decimals) + suffix;
        if (count >= 10) {
            el.innerText = target.toFixed(decimals) + suffix;
            clearInterval(interval);
        }
    }, 30);
}
