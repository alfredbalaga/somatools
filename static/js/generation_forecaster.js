document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forecastForm');
    const rainfallInputs = document.getElementById('rainfallInputs');
    const results = document.getElementById('results');
    const forecastTable = document.getElementById('forecastTable');
    const insightsDiv = document.getElementById('insights');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4 hidden';
    form.parentNode.insertBefore(errorDiv, form.nextSibling);
    const loadingIndicator = document.getElementById('loadingIndicator');
    let forecastChart;

    form.addEventListener('submit', handleSubmit);
    document.getElementById('startDate').addEventListener('change', updateRainfallInputs);
    document.getElementById('forecastMonths').addEventListener('change', updateRainfallInputs);

    function updateRainfallInputs() {
        const startDate = new Date(document.getElementById('startDate').value);
        const months = parseInt(document.getElementById('forecastMonths').value);
        
        rainfallInputs.innerHTML = '';
        
        for (let i = 0; i < months; i++) {
            const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            const div = document.createElement('div');
            div.innerHTML = `
                <label for="rainfall-${i}" class="block text-sm font-medium text-gray-700">${monthYear} Rainfall Category:</label>
                <select id="rainfall-${i}" name="rainfall-${i}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm">
                    <option value="Way Below Normal">Way Below Normal</option>
                    <option value="Below Normal">Below Normal</option>
                    <option value="Near Normal">Near Normal</option>
                    <option value="Above Normal">Above Normal</option>
                </select>
            `;
            rainfallInputs.appendChild(div);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        errorDiv.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        results.classList.add('hidden');
        
        const formData = new FormData(form);
        try {
            const response = await fetch('/generate_forecast', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            alert(`An error occurred: ${error.message}`);
            errorDiv.textContent = `An error occurred: ${error.message}`;
            errorDiv.classList.remove('hidden');
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function displayResults(data) {
        results.classList.remove('hidden');
        forecastTable.innerHTML = '';
        
        data.forecast.forEach(month => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 px-4 border">${month.month}</td>
                <td class="py-2 px-4 border">${month.random_forest.toLocaleString()}</td>
                <td class="py-2 px-4 border">${month.xgboost.toLocaleString()}</td>
                <td class="py-2 px-4 border">${month.arima !== null ? month.arima.toLocaleString() : 'N/A'}</td>
                <td class="py-2 px-4 border">${month.ensemble.toLocaleString()}</td>
            `;
            forecastTable.appendChild(row);
        });
        
        updateChart(data.forecast);
        displayInsights(data.insights);
        if (data.feature_importances) {
            displayFeatureImportances(data.feature_importances);
        }
    }

    function updateChart(forecast) {
        const ctx = document.getElementById('forecastChart').getContext('2d');
        
        if (forecastChart) {
            forecastChart.destroy();
        }
        
        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: forecast.map(month => month.month),
                datasets: [
                    {
                        label: 'Random Forest',
                        data: forecast.map(month => month.random_forest),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'XGBoost',
                        data: forecast.map(month => month.xgboost),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'ARIMA',
                        data: forecast.map(month => month.arima),
                        borderColor: 'rgb(255, 205, 86)',
                        tension: 0.1
                    },
                    {
                        label: 'Ensemble',
                        data: forecast.map(month => month.ensemble),
                        borderColor: 'rgb(153, 102, 255)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Generation Forecast'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Generation (kWh)'
                        }
                    }
                }
            }
        });
    }

    function displayInsights(insights) {
        if (insightsDiv) {
            insightsDiv.innerHTML = `
                <h3 class="text-lg font-semibold mb-2">Insights:</h3>
                <ul class="list-disc pl-5">
                    ${insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            `;
        }
    }

    function displayFeatureImportances(importances) {
        const importancesDiv = document.getElementById('featureImportances');
        if (importancesDiv) {
            importancesDiv.innerHTML = '<h3 class="text-lg font-semibold mb-2">Feature Importances:</h3>';
            
            for (const [model, features] of Object.entries(importances)) {
                importancesDiv.innerHTML += `<h4 class="font-medium mt-2">${model}:</h4><ul class="list-disc pl-5">`;
                for (const [feature, importance] of Object.entries(features)) {
                    importancesDiv.innerHTML += `<li>${feature}: ${(importance * 100).toFixed(2)}%</li>`;
                }
                importancesDiv.innerHTML += '</ul>';
            }
        }
    }

    // Initialize the form with the current month and 3-month forecast
    const today = new Date();
    document.getElementById('startDate').value = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    document.getElementById('forecastMonths').value = '3';
    updateRainfallInputs();
});