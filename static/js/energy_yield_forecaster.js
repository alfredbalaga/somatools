let myChart;

function toggleIrradianceInputs() {
    const irradianceType = document.getElementById('irradianceType').value;
    document.getElementById('insolationInput').style.display = irradianceType === 'insolation' ? 'block' : 'none';
    document.getElementById('irradianceInputs').style.display = irradianceType === 'irradiance' ? 'block' : 'none';
}

function forecast(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('forecastForm'));
    const irradianceType = document.getElementById('irradianceType').value;

    let insolation;

    if (irradianceType === 'insolation') {
        insolation = parseFloat(document.getElementById('insolation').value);
        if (isNaN(insolation)) {
            document.getElementById('result').innerHTML = '<p class="text-red-600">Error: Please enter a valid insolation value.</p>';
            return;
        }
    } else {
        const irradiance = parseFloat(document.getElementById('irradiance').value);
        const serviceHours = parseFloat(document.getElementById('serviceHours').value);
        if (isNaN(irradiance) || isNaN(serviceHours)) {
            document.getElementById('result').innerHTML = '<p class="text-red-600">Error: Please enter valid irradiance and service hours.</p>';
            return;
        }
        insolation = (irradiance * serviceHours) / 1000; // Convert to kWh/m²/day
    }

    formData.set('insolation', insolation);

    fetch('/energy_yield_forecaster', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('result').innerHTML = `<p class="text-red-600">Error: ${data.error}</p>`;
        } else {
            document.getElementById('result').innerHTML = `
                <h2 class="text-xl font-semibold mb-2">Results:</h2>
                <p>Estimated Daily Yield: ${data.daily_yield.toFixed(2)} kWh</p>
                <p>Estimated Monthly Yield: ${data.monthly_yield.toFixed(2)} kWh</p>
            `;
            
            updateChart(data.months, data.yearly_yields);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('result').innerHTML = '<p class="text-red-600">An error occurred. Please try again.</p>';
    });
}

function updateChart(months, yields) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Estimated Monthly Yield (kWh)',
                data: yields,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    toggleIrradianceInputs();
    document.getElementById('irradianceType').addEventListener('change', toggleIrradianceInputs);
    document.getElementById('forecastForm').addEventListener('submit', forecast);

    // Initialize tooltips
    tippy('[title]', {
        content: (reference) => reference.getAttribute('title'),
        onShow(instance) {
            instance.setContent(instance.reference.getAttribute('title'));
        }
    });
});