document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    const form = document.getElementById('calculatorForm');
    if (form) {
        console.log('Form found');
        form.addEventListener('submit', function(e) {
            console.log('Form submitted');
            e.preventDefault();
            calculateFinancialPerformance();
        });
    } else {
        console.error('Calculator form not found');
    }
    initializeTooltips();
});

function validateInputs() {
    const projectCost = parseFloat(document.getElementById('projectCost').value);
    const annualSavings = parseFloat(document.getElementById('annualSavings').value);
    const projectLife = parseInt(document.getElementById('projectLife').value);
    const inflationRate = parseFloat(document.getElementById('inflationRate').value);
    const discountRate = parseFloat(document.getElementById('discountRate').value);
    const annualOperatingCost = parseFloat(document.getElementById('annualOperatingCost').value);
    const taxRate = parseFloat(document.getElementById('taxRate').value);
    const salvageValue = parseFloat(document.getElementById('salvageValue').value);

    if (isNaN(projectCost) || projectCost <= 0) {
        alert('Please enter a valid positive number for Project Cost.');
        return false;
    }
    if (isNaN(annualSavings) || annualSavings <= 0) {
        alert('Please enter a valid positive number for Annual Savings.');
        return false;
    }
    if (isNaN(projectLife) || projectLife <= 0 || !Number.isInteger(projectLife)) {
        alert('Please enter a valid positive integer for Project Life.');
        return false;
    }
    if (isNaN(inflationRate) || inflationRate < 0 || inflationRate > 100) {
        alert('Please enter a valid percentage (0-100) for Inflation Rate.');
        return false;
    }
    if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
        alert('Please enter a valid percentage (0-100) for Discount Rate.');
        return false;
    }
    if (isNaN(annualOperatingCost) || annualOperatingCost < 0) {
        alert('Please enter a valid non-negative number for Annual Operating Cost.');
        return false;
    }
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        alert('Please enter a valid percentage (0-100) for Tax Rate.');
        return false;
    }
    if (isNaN(salvageValue) || salvageValue < 0) {
        alert('Please enter a valid non-negative number for Salvage Value.');
        return false;
    }

    return true;
}

function calculateFinancialPerformance() {
    if (!validateInputs()) {
        return;
    }
    console.log('Calculating financial performance');
    try {
        const inputIds = ['projectCost', 'annualSavings', 'projectLife', 'inflationRate', 'discountRate', 'annualOperatingCost', 'taxRate', 'salvageValue'];
        const scaleIds = ['projectCostScale', 'annualSavingsScale', 'annualOperatingCostScale', 'salvageValueScale'];

        const inputs = {};

        inputIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Element with id '${id}' not found`);
            }
            console.log(`${id} value:`, element.value);
        });

        scaleIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                throw new Error(`Scale element with id '${id}' not found`);
            }
            console.log(`${id} value:`, element.value);
        });

        inputs.projectCost = parseFloat(document.getElementById('projectCost').value) * getScaleFactor('projectCostScale');
        inputs.annualSavings = parseFloat(document.getElementById('annualSavings').value) * getScaleFactor('annualSavingsScale');
        inputs.projectLife = parseInt(document.getElementById('projectLife').value);
        inputs.inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
        inputs.discountRate = parseFloat(document.getElementById('discountRate').value) / 100;
        inputs.annualOperatingCost = parseFloat(document.getElementById('annualOperatingCost').value) * getScaleFactor('annualOperatingCostScale');
        inputs.taxRate = parseFloat(document.getElementById('taxRate').value) / 100;
        inputs.salvageValue = parseFloat(document.getElementById('salvageValue').value) * getScaleFactor('salvageValueScale');

        console.log('Inputs parsed:', inputs);

        let npv = -inputs.projectCost;
        let cumulativeCashFlow = -inputs.projectCost;
        const cashFlows = [-inputs.projectCost];
        const yearlyData = [];

        for (let year = 1; year <= inputs.projectLife; year++) {
            const inflationFactor = Math.pow(1 + inputs.inflationRate, year);
            const yearlyRevenue = inputs.annualSavings * inflationFactor;
            const yearlyOperatingCost = inputs.annualOperatingCost * inflationFactor;
            const yearlyProfit = yearlyRevenue - yearlyOperatingCost;
            const taxAmount = (yearlyProfit > 0) ? yearlyProfit * inputs.taxRate : 0;
            let yearlyNetCashFlow = yearlyProfit - taxAmount;

            if (year === inputs.projectLife) {
                yearlyNetCashFlow += inputs.salvageValue;
            }

            cumulativeCashFlow += yearlyNetCashFlow;
            npv += yearlyNetCashFlow / Math.pow(1 + inputs.discountRate, year);
            cashFlows.push(yearlyNetCashFlow);

            yearlyData.push({
                year,
                revenue: yearlyRevenue,
                operatingCost: yearlyOperatingCost,
                netCashFlow: yearlyNetCashFlow,
                cumulativeCashFlow
            });
        }

        const irr = calculateIRR(cashFlows);
        const paybackPeriod = calculatePaybackPeriod(cashFlows);
        const roi = ((cumulativeCashFlow + inputs.projectCost) / inputs.projectCost) * 100;

        console.log('Calculations completed');

        displayResults(npv, irr, paybackPeriod, roi);
        createCashFlowChart(yearlyData);
        
        document.getElementById('results').classList.remove('hidden');
        document.getElementById('charts').classList.remove('hidden');

        performSensitivityAnalysis(inputs);

    } catch (error) {
        console.error('Error in calculations:', error);
        alert('An error occurred during calculations. Please check the console for details.');
    }
}

function getScaleFactor(scaleId) {
    const scaleElement = document.getElementById(scaleId);
    if (!scaleElement) {
        console.error(`Scale element with id '${scaleId}' not found`);
        return 1; // Default to 1 if scale element is not found
    }
    const scaleValue = scaleElement.value;
    console.log(`Scale factor for ${scaleId}:`, scaleValue);
    switch (scaleValue) {
        case 'thousands':
            return 1000;
        case 'millions':
            return 1000000;
        default:
            return 1;
    }
}

function calculateIRR(cashFlows) {
    const maxIterations = 1000;
    const tolerance = 0.000001;

    let guess = 0.1;
    for (let i = 0; i < maxIterations; i++) {
        const npv = cashFlows.reduce((sum, cashFlow, index) => 
            sum + cashFlow / Math.pow(1 + guess, index), 0);
        
        if (Math.abs(npv) < tolerance) {
            return guess * 100;  // Convert to percentage
        }

        const derivativeNpv = cashFlows.reduce((sum, cashFlow, index) => 
            sum - index * cashFlow / Math.pow(1 + guess, index + 1), 0);
        
        guess = guess - npv / derivativeNpv;
    }

    return null;  // IRR not found
}

function calculatePaybackPeriod(cashFlows) {
    let cumulativeCashFlow = cashFlows[0];
    for (let i = 1; i < cashFlows.length; i++) {
        cumulativeCashFlow += cashFlows[i];
        if (cumulativeCashFlow >= 0) {
            return i + (cumulativeCashFlow - cashFlows[i]) / cashFlows[i];
        }
    }
    return null;  // Payback period not reached
}

function displayResults(npv, irr, paybackPeriod, roi) {
    document.getElementById('npvResult').textContent = `Net Present Value (NPV): ${formatCurrency(npv)}`;
    document.getElementById('irrResult').textContent = `Internal Rate of Return (IRR): ${irr ? irr.toFixed(2) + '%' : 'N/A'}`;
    document.getElementById('paybackResult').textContent = `Payback Period: ${paybackPeriod ? paybackPeriod.toFixed(2) + ' years' : 'N/A'}`;
    document.getElementById('roiResult').textContent = `Return on Investment (ROI): ${roi.toFixed(2)}%`;
}

function createCashFlowChart(yearlyData) {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    if (window.cashFlowChart instanceof Chart) {
        window.cashFlowChart.destroy();
    }

    window.cashFlowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: yearlyData.map(data => `Year ${data.year}`),
            datasets: [
                {
                    label: 'Revenue',
                    data: yearlyData.map(data => data.revenue),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Operating Cost',
                    data: yearlyData.map(data => data.operatingCost),
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'Net Cash Flow',
                    data: yearlyData.map(data => data.netCashFlow),
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                },
                {
                    label: 'Cumulative Cash Flow',
                    data: yearlyData.map(data => data.cumulativeCashFlow),
                    borderColor: 'rgb(255, 159, 64)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Cash Flow Over Project Lifetime'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Project Year'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Amount (PHP)'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}


function initializeTooltips() {
    tippy('#projectCost', {
        content: 'The total initial investment required for the project.',
    });
    tippy('#annualSavings', {
        content: 'The expected yearly savings or revenue generated by the project.',
    });
    tippy('#projectLife', {
        content: 'The expected duration of the project in years.',
    });
    tippy('#inflationRate', {
        content: 'The expected annual rate of increase in prices.',
    });
    tippy('#discountRate', {
        content: 'The rate used to discount future cash flows to present value.',
    });
    tippy('#annualOperatingCost', {
        content: 'The yearly expenses associated with running the project.',
    });
    tippy('#taxRate', {
        content: 'The applicable tax rate on profits.',
    });
    tippy('#salvageValue', {
        content: 'The expected value of the project\'s assets at the end of its life.',
    });
}

function performSensitivityAnalysis(baseInputs) {
    const discountRates = [0.02, 0.04, 0.06, 0.08, 0.10];
    const npvs = discountRates.map(rate => {
        const inputs = {...baseInputs, discountRate: rate};
        return calculateNPV(inputs);
    });

    createSensitivityChart(discountRates, npvs);
    document.getElementById('sensitivityAnalysis').classList.remove('hidden');
}

function calculateNPV(inputs) {
    let npv = -inputs.projectCost;
    for (let year = 1; year <= inputs.projectLife; year++) {
        const inflationFactor = Math.pow(1 + inputs.inflationRate, year);
        const yearlyRevenue = inputs.annualSavings * inflationFactor;
        const yearlyOperatingCost = inputs.annualOperatingCost * inflationFactor;
        const yearlyProfit = yearlyRevenue - yearlyOperatingCost;
        const taxAmount = (yearlyProfit > 0) ? yearlyProfit * inputs.taxRate : 0;
        let yearlyNetCashFlow = yearlyProfit - taxAmount;

        if (year === inputs.projectLife) {
            yearlyNetCashFlow += inputs.salvageValue;
        }

        npv += yearlyNetCashFlow / Math.pow(1 + inputs.discountRate, year);
    }
    return npv;
}

function createSensitivityChart(discountRates, npvs) {
    const ctx = document.getElementById('sensitivityChart').getContext('2d');
    
    if (window.sensitivityChart instanceof Chart) {
        window.sensitivityChart.destroy();
    }

    window.sensitivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: discountRates.map(rate => (rate * 100).toFixed(0) + '%'),
            datasets: [{
                label: 'NPV',
                data: npvs,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'NPV Sensitivity to Discount Rate'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Discount Rate'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'NPV (PHP)'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

console.log('Financial calculator script loaded');