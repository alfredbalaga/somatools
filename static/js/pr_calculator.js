// Global variable to hold the chart instance
let prChart;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('prForm');
    const benchmarkPreset = document.getElementById('benchmarkPreset');
    const benchmarkInput = document.getElementById('benchmark');
    const resultDiv = document.getElementById('result');
    const chartDiv = document.getElementById('chart-container');

    // Initialize tooltips
    if (typeof tippy === 'function') {
        tippy('[data-tippy-content]', {
            allowHTML: true,
        });
    } else {
        console.warn('Tippy.js not loaded. Tooltips will not be initialized.');
    }

    benchmarkPreset.addEventListener('change', function() {
        if (this.value) {
            benchmarkInput.value = this.value;
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();  // Prevent the default form submission
        handleFormSubmission(this);
    });
});

function handleFormSubmission(form) {
    if (validateForm()) {
        const formData = new FormData(form);
        
        // Convert units before sending to server
        const measuredEnergy = convertToBaseUnit(formData.get('measured_energy'), formData.get('measured_energy_unit'));
        const installedCapacity = convertToBaseUnit(formData.get('installed_capacity'), formData.get('installed_capacity_unit'));
        
        formData.set('measured_energy', measuredEnergy);
        formData.set('installed_capacity', installedCapacity);
        formData.append('benchmark', document.getElementById('benchmark').value);

        // Display loading message
        document.getElementById('result').innerHTML = '<p class="text-blue-600">Calculating... Please wait.</p>';
        
        fetch('/pr_calculator', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Server response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Server response:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            displayResults(data, formData.get('measured_energy_unit'), formData.get('installed_capacity_unit'));
            if (document.getElementById('chart-container')) {
                createChart(data, formData.get('measured_energy_unit'));
            } else {
                console.warn('Chart container not found. Skipping chart creation.');
            }
        })
        .catch(error => {
            console.error('Error details:', error);
            showError(error.message);
        });
    }
}

function validateForm() {
    const fields = ['measured_energy', 'installed_capacity', 'avg_irradiance', 'temperature', 'time_period'];
    let isValid = true;

    fields.forEach(field => {
        const input = document.getElementById(field);
        const value = parseFloat(input.value);
        if (isNaN(value) || value <= 0) {
            showError(`Please enter a valid positive number for ${field.replace('_', ' ')}.`);
            isValid = false;
        }
    });

    const benchmark = parseFloat(document.getElementById('benchmark').value);
    if (!isNaN(benchmark) && (benchmark < 0 || benchmark > 100)) {
        showError('Benchmark PR must be between 0 and 100.');
        isValid = false;
    }

    return isValid;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4';
    errorDiv.innerHTML = `<strong class="font-bold">Error:</strong> <span class="block sm:inline">${message}</span>`;
    
    const result = document.getElementById('result');
    result.innerHTML = '';
    result.appendChild(errorDiv);
}

function convertToBaseUnit(value, unit) {
    const numValue = parseFloat(value);
    switch (unit) {
        case 'MWh':
        case 'MW':
            return numValue * 1000;
        default:
            return numValue;
    }
}

function convertFromBaseUnit(value, unit) {
    switch (unit) {
        case 'MWh':
        case 'MW':
            return value / 1000;
        default:
            return value;
    }
}

function displayResults(data, energyUnit, capacityUnit) {
    const resultDiv = document.getElementById('result');
    const benchmarkComparisonDiv = document.getElementById('benchmarkComparison');
    
    const measuredEnergy = convertFromBaseUnit(data.measured_energy, energyUnit);
    const theoreticalEnergy = convertFromBaseUnit(data.theoretical_energy, energyUnit);
    const installedCapacity = convertFromBaseUnit(data.installed_capacity, capacityUnit);

    resultDiv.innerHTML = `
        <h2 class="text-xl font-semibold mb-2">Results:</h2>
        <p>Performance Ratio: ${data.performance_ratio.toFixed(2)}%</p>
        <p>Reference Yield: ${data.reference_yield.toFixed(4)} hours</p>
        <p>Temperature Correction Factor: ${data.temperature_correction.toFixed(4)}</p>
        <p>Measured Energy: ${measuredEnergy.toFixed(2)} ${energyUnit}</p>
        <p>Theoretical Energy: ${theoreticalEnergy.toFixed(2)} ${energyUnit}</p>
        <p>Installed Capacity: ${installedCapacity.toFixed(2)} ${capacityUnit}</p>
    `;

    // Display benchmark comparison if available
    if (data.benchmark_comparison) {
        const { benchmark, difference, status } = data.benchmark_comparison;
        const comparisonText = status === 'above' 
            ? `${difference.toFixed(2)}% above benchmark` 
            : `${Math.abs(difference).toFixed(2)}% below benchmark`;
        
        benchmarkComparisonDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Benchmark Comparison:</h3>
            <p>Benchmark PR: ${benchmark.toFixed(2)}%</p>
            <p>Your PR is ${comparisonText}</p>
        `;
    } else {
        benchmarkComparisonDiv.innerHTML = '';
    }
}

function createChart(data, energyUnit) {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
        console.error('Chart container not found');
        return;
    }

    // Clear previous chart and error messages
    chartContainer.innerHTML = '<canvas id="prChart"></canvas>';

    const ctx = document.getElementById('prChart').getContext('2d');
    if (!ctx) {
        console.error('Unable to get 2D context for chart');
        return;
    }
    
    // Destroy existing chart if it exists
    if (prChart) {
        prChart.destroy();
    }

    try {
        prChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Measured Energy', 'Theoretical Energy', 'Performance Ratio'],
                datasets: [{
                    label: 'Values',
                    data: [
                        convertFromBaseUnit(data.measured_energy, energyUnit),
                        convertFromBaseUnit(data.theoretical_energy, energyUnit),
                        data.performance_ratio
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(255, 206, 86, 0.6)'
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Energy (${energyUnit}) / Performance Ratio (%)`
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Ratio Analysis'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(2);
                                    if (context.dataIndex < 2) {
                                        label += ` ${energyUnit}`;
                                    } else {
                                        label += '%';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        chartContainer.innerHTML = '<p class="text-red-500">Error creating chart. Please try again.</p>';
    }
}

// Make the chart responsive
window.addEventListener('resize', function() {
    if (prChart) {
        prChart.resize();
    }
});