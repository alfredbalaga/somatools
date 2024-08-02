document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reliabilityForm');
    const resultsDiv = document.getElementById('results');
    const chartDiv = document.getElementById('chart');
    let reliabilityChart;

    // Add event listeners
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateInputs()) {
            calculateReliabilityFactors();
        }
    });

    document.getElementById('affectedUnit').addEventListener('change', function() {
        const unitsAffectedInput = document.getElementById('unitsAffected');
        if (this.value === 'plant') {
            unitsAffectedInput.value = '1';
            unitsAffectedInput.disabled = true;
        } else {
            unitsAffectedInput.disabled = false;
        }
    });

    document.getElementById('periodType').addEventListener('change', function() {
        updateOutageHoursLimit();
    });

    function updateOutageHoursLimit() {
        const periodType = document.getElementById('periodType').value;
        const outageHoursInput = document.getElementById('outageHours');
        let maxHours;

        switch (periodType) {
            case 'daily':
                maxHours = 24;
                break;
            case 'monthly':
                maxHours = 24 * 31; // Maximum days in a month
                break;
            case 'yearly':
                maxHours = 24 * 365; // Non-leap year
                break;
        }

        outageHoursInput.max = maxHours;
        outageHoursInput.title = `Enter the number of hours the unit was out of service (max ${maxHours} hours for ${periodType} period)`;
    }

    function validateInputs() {
        const affectedUnit = document.getElementById('affectedUnit').value;
        const unitsAffected = parseInt(document.getElementById('unitsAffected').value);
        const totalUnits = getTotalUnits(affectedUnit);
        const outageHours = parseFloat(document.getElementById('outageHours').value);
        const periodType = document.getElementById('periodType').value;

        if (unitsAffected > totalUnits) {
            alert(`The number of affected units (${unitsAffected}) cannot be greater than the total number of ${affectedUnit}s (${totalUnits}).`);
            return false;
        }

        let maxHours;
        switch (periodType) {
            case 'daily':
                maxHours = 24;
                break;
            case 'monthly':
                maxHours = 24 * 31; // Maximum days in a month
                break;
            case 'yearly':
                maxHours = 24 * 365; // Non-leap year
                break;
        }

        if (outageHours > maxHours) {
            alert(`Outage hours (${outageHours}) cannot exceed the maximum hours for the selected period (${maxHours}).`);
            return false;
        }

        return true;
    }

    function getTotalUnits(unitType) {
        switch (unitType) {
            case 'plant':
                return 1;
            case 'feeder':
                return parseInt(document.getElementById('feeders').value);
            case 'mvStation':
                return parseInt(document.getElementById('mvStations').value);
            case 'inverter':
                return parseInt(document.getElementById('inverters').value);
            default:
                return 0;
        }
    }

    function calculateReliabilityFactors() {
        const capacity = parseFloat(document.getElementById('capacity').value);
        const affectedUnit = document.getElementById('affectedUnit').value;
        const outageHours = parseFloat(document.getElementById('outageHours').value);
        const unitsAffected = parseInt(document.getElementById('unitsAffected').value);
        const derationPercentage = parseFloat(document.getElementById('derationPercentage').value) / 100;
        const periodType = document.getElementById('periodType').value;
        const yearlyAllowance = parseFloat(document.getElementById('yearlyAllowance').value) || 0;
        const historicalOutageFactor = parseFloat(document.getElementById('historicalOutageFactor').value) || 0;
    
        const totalUnits = getTotalUnits(affectedUnit);
        const outageImpact = (unitsAffected / totalUnits) * (1 - derationPercentage);
    
        let periodHours;
        switch (periodType) {
            case 'daily':
                periodHours = 24;
                break;
            case 'monthly':
                periodHours = 24 * 30; // Assuming 30-day month for simplicity
                break;
            case 'yearly':
                periodHours = 24 * 365; // Non-leap year
                break;
        }
    
        const equivalentOutageHours = outageHours * outageImpact;
        const factors = calculateFactors(equivalentOutageHours, periodHours);
    
        // Calculate projections
        const dailyFactors = calculateFactors(equivalentOutageHours, 24);
        const monthlyFactors = calculateFactors(equivalentOutageHours, 24 * 30);
        const yearlyFactors = calculateFactors(equivalentOutageHours, 24 * 365);
    
        const delta = yearlyAllowance - yearlyFactors.forcedOutageFactor;
        const deltaHours = (delta / 100) * (24 * 365); // Convert percentage to hours
    
        const inverters = parseInt(document.getElementById('inverters').value);
        const feeders = parseInt(document.getElementById('feeders').value);
        const mvStations = parseInt(document.getElementById('mvStations').value);
    
        const inverterHours = deltaHours / inverters;
        const feederHours = deltaHours / feeders;
        const mvStationHours = deltaHours / mvStations;
        const plantHours = deltaHours;
    
        const deltaInsights = {
            delta,
            inverterHours,
            feederHours,
            mvStationHours,
            plantHours
        };
    
        displayResults(factors, dailyFactors, monthlyFactors, yearlyFactors, periodType, yearlyAllowance, deltaInsights);
        createEnhancedChart(yearlyFactors, historicalOutageFactor, yearlyAllowance, periodType);
    }
    
    function calculateFactors(equivalentOutageHours, periodHours) {
        const availabilityFactor = Math.max(((periodHours - equivalentOutageHours) / periodHours) * 100, 0);
        const forcedOutageFactor = Math.min((equivalentOutageHours / periodHours) * 100, 100);
        const equivalentAvailabilityFactor = availabilityFactor;
    
        return {
            availabilityFactor,
            forcedOutageFactor,
            equivalentAvailabilityFactor
        };
    }
    
    function createEnhancedChart(factors, historicalOutageFactor, yearlyAllowance, periodType) {
        const ctx = document.getElementById('reliabilityChart').getContext('2d');
    
        if (reliabilityChart) {
            reliabilityChart.destroy();
        }
    
        const labels = ['Historical', 'Current', 'Projected (Yearly)'];
        const outageFactor = [historicalOutageFactor, factors.forcedOutageFactor, factors.forcedOutageFactor];
        const allowanceData = [yearlyAllowance, yearlyAllowance, yearlyAllowance];
    
        reliabilityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Outage Factor (%)',
                        data: outageFactor,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Yearly Allowance (%)',
                        data: allowanceData,
                        type: 'line',
                        fill: false,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Outage Factor (%)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Outage Factor Comparison'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y.toFixed(4);
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            }
        });
    
        document.getElementById('chart').classList.remove('hidden');
    }
    
    function displayResults(factors, dailyFactors, monthlyFactors, yearlyFactors, periodType, yearlyAllowance, deltaInsights) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = ''; // Clear previous results
    
        function createResultHTML(factors, period) {
            return `
                <h3 class="font-semibold">${period} Factors:</h3>
                <p>Availability Factor: ${factors.availabilityFactor.toFixed(4)}%</p>
                <p>Forced Outage Factor: ${factors.forcedOutageFactor.toFixed(4)}%</p>
                <p>Equivalent Availability Factor: ${factors.equivalentAvailabilityFactor.toFixed(4)}%</p>
            `;
        }
    
        resultsDiv.innerHTML += createResultHTML(factors, 'Current Period');
    
        if (periodType === 'daily') {
            resultsDiv.innerHTML += createResultHTML(monthlyFactors, 'Monthly (Projected)');
            resultsDiv.innerHTML += createResultHTML(yearlyFactors, 'Yearly (Projected)');
        } else if (periodType === 'monthly') {
            resultsDiv.innerHTML += createResultHTML(yearlyFactors, 'Yearly (Projected)');
        }
    
        // Add allowance comparison
        const allowanceComparison = document.createElement('div');
        allowanceComparison.innerHTML = `
            <h3 class="font-semibold mt-4">Allowance Analysis:</h3>
            <p>Yearly Outage Factor Allowance: ${yearlyAllowance.toFixed(4)}%</p>
            <p>Projected Yearly Outage Factor: ${yearlyFactors.forcedOutageFactor.toFixed(4)}%</p>
            <p class="${yearlyFactors.forcedOutageFactor > yearlyAllowance ? 'text-red-600' : 'text-green-600'}">
                ${yearlyFactors.forcedOutageFactor > yearlyAllowance ? 'Warning: Projected outage factor exceeds allowance!' : 'Projected outage factor is within allowance.'}
            </p>
        `;
        resultsDiv.appendChild(allowanceComparison);
    
        // Add delta insights
        const deltaInsightsDiv = document.createElement('div');
        deltaInsightsDiv.innerHTML = `
            <h3 class="font-semibold mt-4">Delta Insights:</h3>
            <p>Delta between Allowance and Projected Outage Factor: ${deltaInsights.delta.toFixed(4)}%</p>
            <p>This delta translates to:</p>
            <ul class="list-disc list-inside">
                <li>${Math.abs(deltaInsights.inverterHours).toFixed(2)} hours per inverter</li>
                <li>${Math.abs(deltaInsights.feederHours).toFixed(2)} hours per feeder</li>
                <li>${Math.abs(deltaInsights.mvStationHours).toFixed(2)} hours per MV station</li>
                <li>${Math.abs(deltaInsights.plantHours).toFixed(2)} hours for the entire plant</li>
            </ul>
            <p class="mt-2">
                ${deltaInsights.delta >= 0 
                    ? 'You have additional hours available for maintenance or unexpected outages.' 
                    : 'You need to improve reliability or reduce outages to meet the allowance.'}
            </p>
        `;
        resultsDiv.appendChild(deltaInsightsDiv);
    
        resultsDiv.classList.remove('hidden');
    }

    // Initialize the form
    updateOutageHoursLimit();
    document.getElementById('affectedUnit').dispatchEvent(new Event('change'));
});