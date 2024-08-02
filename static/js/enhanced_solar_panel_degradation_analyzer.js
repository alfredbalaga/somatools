// Enhanced Solar Panel Degradation Analyzer

let degradationChart, predictionChart;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('degradationForm');
    const addPerformanceDataBtn = document.getElementById('addPerformanceData');
    const performanceDataContainer = document.getElementById('performanceData');
    let performanceDataCount = 0;

    addPerformanceDataBtn.addEventListener('click', addPerformanceDataInput);
    form.addEventListener('submit', analyzeDegradation);

    // Add initial performance data inputs
    for (let i = 0; i < 3; i++) {
        addPerformanceDataInput();
    }

    function addPerformanceDataInput() {
        performanceDataCount++;
        const dataInput = document.createElement('div');
        dataInput.classList.add('grid', 'grid-cols-3', 'gap-4', 'mb-2');
        dataInput.innerHTML = `
            <div>
                <label class="block text-sm font-medium text-gray-700" for="date${performanceDataCount}">
                    Date:
                </label>
                <input class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" id="date${performanceDataCount}" name="date${performanceDataCount}" type="date" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700" for="performance${performanceDataCount}">
                    Performance Ratio (%):
                </label>
                <input class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" id="performance${performanceDataCount}" name="performance${performanceDataCount}" type="number" step="0.01" min="0" max="100" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700" for="prType${performanceDataCount}">
                    PR Type:
                </label>
                <select class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" id="prType${performanceDataCount}" name="prType${performanceDataCount}" required>
                    <option value="daily">Daily PR</option>
                    <option value="monthly" selected>Monthly Average PR</option>
                </select>
            </div>
        `;
        performanceDataContainer.appendChild(dataInput);
    }

    async function analyzeDegradation(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const degradationModel = formData.get('degradationModel');
        const performanceData = getPerformanceData();
        const userDegradationRate = parseFloat(formData.get('guaranteedDegradation')) || 0;
        const panelType = formData.get('panelType'); // Get the panel type from the form
    
        if (performanceData.length < 3) {
            alert('Please enter at least three monthly average performance data points.');
            return;
        }
    
        try {
            const analysisResults = performDegradationAnalysis(
                degradationModel, 
                performanceData, 
                userDegradationRate, 
                panelType  // Pass the panel type to the analysis function
            );
            displayResults(analysisResults);
            createCharts(analysisResults);
        } catch (error) {
            console.error('Error in degradation analysis:', error);
            alert('An error occurred during the analysis: ' + error.message);
        }
    }

    document.getElementById('degradationForm').addEventListener('submit', analyzeDegradation);

    function getPerformanceData() {
        const performanceData = [];
        for (let i = 1; i <= performanceDataCount; i++) {
            const date = document.getElementById(`date${i}`).value;
            const performance = parseFloat(document.getElementById(`performance${i}`).value);
            const prType = document.getElementById(`prType${i}`).value;
            if (date && !isNaN(performance) && prType === 'monthly') {
                performanceData.push({ date, performance });
            }
        }
        return performanceData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }


    function performDegradationAnalysis(model, performanceData, userDegradationRate, panelType) {
        if (performanceData.length < 3) {
            throw new Error('Insufficient data for analysis');
        }
    
        const initialPerformance = performanceData[0].performance;
        const timeElapsed = (new Date(performanceData[performanceData.length - 1].date) - new Date(performanceData[0].date)) / (1000 * 60 * 60 * 24 * 365.25);
        
        let calculatedDegradationRate;
        let predictedPerformance;
    
        switch (model) {
            case 'linear':
                calculatedDegradationRate = calculateLinearDegradation(performanceData);
                predictedPerformance = predictLinearPerformance(initialPerformance, userDegradationRate, timeElapsed + 5, panelType);
                break;
            case 'exponential':
                calculatedDegradationRate = calculateExponentialDegradation(performanceData);
                predictedPerformance = predictExponentialPerformance(initialPerformance, userDegradationRate, timeElapsed + 5, panelType);
                break;
            case 'stepwise':
                calculatedDegradationRate = calculateStepwiseDegradation(performanceData);
                predictedPerformance = predictStepwisePerformance(initialPerformance, userDegradationRate, timeElapsed + 5, panelType);
                break;
            default:
                throw new Error('Invalid degradation model selected');
        }
    
        if (isNaN(calculatedDegradationRate)) {
            throw new Error('Unable to calculate degradation rate. Please check your input data.');
        }
    
        const remainingUsefulLife = estimateRemainingUsefulLife(initialPerformance, performanceData[performanceData.length - 1].performance, userDegradationRate);
    
        return {
            calculatedDegradationRate,
            userDegradationRate,
            predictedPerformance,
            remainingUsefulLife,
            performanceData,
            model,
            panelType
        };
    }
    
    function predictLinearPerformance(initialPerformance, degradationRate, years) {
        return initialPerformance * (1 - degradationRate / 100 * years);
    }
    
    function predictExponentialPerformance(initialPerformance, degradationRate, years) {
        return initialPerformance * Math.exp(-degradationRate / 100 * years);
    }
    
    function predictStepwisePerformance(initialPerformance, degradationRate, years) {
        const stepsPerYear = 4; // Assuming quarterly steps
        let performance = initialPerformance;
        for (let i = 0; i < years * stepsPerYear; i++) {
            performance *= (1 - degradationRate / 100 / stepsPerYear);
        }
        return performance;
    }
    
    function estimateRemainingUsefulLife(initialPerformance, currentPerformance, degradationRate) {
        const performanceThreshold = 0.8 * initialPerformance;
        const yearsElapsed = Math.log(currentPerformance / initialPerformance) / Math.log(1 - degradationRate / 100);
        const yearsToThreshold = Math.log(performanceThreshold / initialPerformance) / Math.log(1 - degradationRate / 100);
        return Math.max(0, yearsToThreshold - yearsElapsed);
    }

    function displayResults(results) {
        const resultsDiv = document.getElementById('results');
        const resultContent = document.getElementById('resultContent');

        resultContent.innerHTML = `
            <p><strong>Calculated Degradation Rate:</strong> ${results.calculatedDegradationRate.toFixed(2)}% per year</p>
            <p><strong>User-Input Degradation Rate:</strong> ${results.userDegradationRate.toFixed(2)}% per year</p>
            <p><strong>Predicted Performance (5 years):</strong> ${results.predictedPerformance.toFixed(2)}%</p>
            <p><strong>Estimated Remaining Useful Life:</strong> ${results.remainingUsefulLife.toFixed(1)} years</p>
        `;

        resultsDiv.classList.remove('hidden');
    }

    function createCharts(results) {
        const chartsDiv = document.getElementById('charts');
        chartsDiv.classList.remove('hidden');

        createDegradationChart(results);
        createPredictionChart(results);
    }

    function performDegradationAnalysis(model, performanceData, userDegradationRate) {
        if (performanceData.length < 3) {
            throw new Error('Insufficient data for analysis');
        }
    
        const initialPerformance = performanceData[0].performance;
        const timeElapsed = (new Date(performanceData[performanceData.length - 1].date) - new Date(performanceData[0].date)) / (1000 * 60 * 60 * 24 * 365.25);
        
        let calculatedDegradationRate;
        let predictedPerformance;
    
        switch (model) {
            case 'linear':
                calculatedDegradationRate = calculateLinearDegradation(performanceData);
                predictedPerformance = predictLinearPerformance(initialPerformance, userDegradationRate, timeElapsed + 5);
                break;
            case 'exponential':
                calculatedDegradationRate = calculateExponentialDegradation(performanceData);
                predictedPerformance = predictExponentialPerformance(initialPerformance, userDegradationRate, timeElapsed + 5);
                break;
            case 'stepwise':
                calculatedDegradationRate = calculateStepwiseDegradation(performanceData);
                predictedPerformance = predictStepwisePerformance(initialPerformance, userDegradationRate, timeElapsed + 5);
                break;
            default:
                throw new Error('Invalid degradation model selected');
        }
    
        if (isNaN(calculatedDegradationRate)) {
            throw new Error('Unable to calculate degradation rate. Please check your input data.');
        }
    
        const remainingUsefulLife = estimateRemainingUsefulLife(initialPerformance, performanceData[performanceData.length - 1].performance, userDegradationRate);
    
        return {
            calculatedDegradationRate,
            userDegradationRate,
            predictedPerformance,
            remainingUsefulLife,
            performanceData,
            model
        };
    }
    
    function createPredictionChart(results) {
        const ctx = document.getElementById('predictionChart').getContext('2d');
        const lastDate = new Date(results.performanceData[results.performanceData.length - 1].date);
        const initialPerformance = results.performanceData[0].performance;
        const futureDates = Array.from({ length: 6 }, (_, i) => new Date(lastDate.getFullYear() + i, lastDate.getMonth(), lastDate.getDate()));
        
        let predictFunction;
        switch (results.model) {
            case 'linear':
                predictFunction = predictLinearPerformance;
                break;
            case 'exponential':
                predictFunction = predictExponentialPerformance;
                break;
            case 'stepwise':
                predictFunction = predictStepwisePerformance;
                break;
            default:
                predictFunction = predictLinearPerformance; // Default to linear if model is unknown
        }
        
        const predictedData = futureDates.map((date, i) => ({
            x: date,
            y: predictFunction(initialPerformance, results.userDegradationRate, i)
        }));
    
        if (predictionChart) {
            predictionChart.destroy();
        }
    
        predictionChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Historical Data',
                    data: results.performanceData.map(d => ({ x: d.date, y: d.performance })),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }, {
                    label: 'Predicted Performance',
                    data: predictedData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                    borderDash: [5, 5]
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'year',
                            displayFormats: {
                                year: 'yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Performance Ratio (%)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Solar Panel Performance Prediction'
                    }
                }
            }
        });
    }

    function createDegradationChart(results) {
        const ctx = document.getElementById('degradationChart').getContext('2d');
        
        if (degradationChart) {
            degradationChart.destroy();
        }
    
        degradationChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Performance Data',
                    data: results.performanceData.map(d => ({ x: d.date, y: d.performance })),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Performance Ratio (%)'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Solar Panel Degradation Over Time'
                    }
                }
            }
        });
    }
    function calculateLinearDegradation(performanceData) {
        const n = performanceData.length;
        const sumX = performanceData.reduce((sum, _, i) => sum + i, 0);
        const sumY = performanceData.reduce((sum, data) => sum + data.performance, 0);
        const sumXY = performanceData.reduce((sum, data, i) => sum + i * data.performance, 0);
        const sumXX = performanceData.reduce((sum, _, i) => sum + i * i, 0);
    
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return -slope / performanceData[0].performance * 100; // Convert to percentage per year
    }
    
    function calculateExponentialDegradation(performanceData) {
        const n = performanceData.length;
        const sumX = performanceData.reduce((sum, _, i) => sum + i, 0);
        const sumLnY = performanceData.reduce((sum, data) => sum + Math.log(data.performance), 0);
        const sumXLnY = performanceData.reduce((sum, data, i) => sum + i * Math.log(data.performance), 0);
        const sumXX = performanceData.reduce((sum, _, i) => sum + i * i, 0);
    
        const b = (n * sumXLnY - sumX * sumLnY) / (n * sumXX - sumX * sumX);
        return -(1 - Math.exp(b)) * 100; // Convert to percentage per year
    }
    
    function calculateStepwiseDegradation(performanceData) {
        const steps = Math.min(3, Math.floor(performanceData.length / 2));
        const stepSize = Math.floor(performanceData.length / steps);
        const stepDegradations = [];
    
        for (let i = 0; i < steps; i++) {
            const start = i * stepSize;
            const end = (i === steps - 1) ? performanceData.length : (i + 1) * stepSize;
            const stepData = performanceData.slice(start, end);
            stepDegradations.push(calculateLinearDegradation(stepData));
        }
    
        return stepDegradations.reduce((sum, deg) => sum + deg, 0) / steps;
    }

    function adjustDegradationRate(baseRate, panelType) {
        switch (panelType) {
            case 'monocrystalline':
                return baseRate * 0.9; // Monocrystalline panels tend to degrade slower
            case 'polycrystalline':
                return baseRate * 1.0; // Use base rate for polycrystalline
            case 'thinFilm':
                return baseRate * 1.1; // Thin film panels tend to degrade faster
            default:
                return baseRate; // Default to base rate if panel type is unknown
        }
    }
    
    function predictLinearPerformance(initialPerformance, degradationRate, years, panelType) {
        const adjustedRate = adjustDegradationRate(degradationRate, panelType);
        return initialPerformance * (1 - adjustedRate / 100 * years);
    }
    
    function predictExponentialPerformance(initialPerformance, degradationRate, years, panelType) {
        const adjustedRate = adjustDegradationRate(degradationRate, panelType);
        return initialPerformance * Math.exp(-adjustedRate / 100 * years);
    }
    
    function predictStepwisePerformance(initialPerformance, degradationRate, years, panelType) {
        const adjustedRate = adjustDegradationRate(degradationRate, panelType);
        const stepsPerYear = 4; // Assuming quarterly steps
        let performance = initialPerformance;
        for (let i = 0; i < years * stepsPerYear; i++) {
            performance *= (1 - adjustedRate / 100 / stepsPerYear);
        }
        return performance;
    }
});