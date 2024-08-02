document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed');
  const form = document.getElementById('calculatorForm');
  if (form) {
      console.log('Form found');
      form.addEventListener('submit', function(e) {
          console.log('Form submitted');
          e.preventDefault();
          try {
              calculateFinancialPerformance();
          } catch (error) {
              console.error('Error in calculateFinancialPerformance:', error);
          }
      });
  } else {
      console.error('Calculator form not found');
  }

  const sensitivityButton = document.getElementById('runSensitivityAnalysis');
  if (sensitivityButton) {
      sensitivityButton.addEventListener('click', performSensitivityAnalysis);
  }

  const monteCarloButton = document.getElementById('runMonteCarloSimulation');
    if (monteCarloButton) {
        console.log('Monte Carlo button found');
        monteCarloButton.addEventListener('click', function() {
            console.log('Monte Carlo button clicked');
            runMonteCarloSimulation();
        });
    } else {
        console.error('Monte Carlo button not found');
    }
});

function calculateFinancialPerformance(returnResults = false, inputs = null) {
  console.log('Calculating financial performance');
  try {
      // Use provided inputs or get from form
      const systemCost = inputs ? inputs.systemCost : parseFloat(document.getElementById('systemCost').value) * parseFloat(document.getElementById('systemCostScale').value);
      const annualProduction = inputs ? inputs.annualProduction : parseFloat(document.getElementById('annualProduction').value) * parseFloat(document.getElementById('annualProductionScale').value);
      const electricityRate = inputs ? inputs.electricityRate : parseFloat(document.getElementById('electricityRate').value);
      const annualExpenses = inputs ? inputs.annualExpenses : parseFloat(document.getElementById('annualExpenses').value) * parseFloat(document.getElementById('annualExpensesScale').value);
      const annualDegradation = inputs ? inputs.annualDegradation : parseFloat(document.getElementById('annualDegradation').value) / 100;
      const inflationRate = inputs ? inputs.inflationRate : parseFloat(document.getElementById('inflationRate').value) / 100;
      const discountRate = inputs ? inputs.discountRate : parseFloat(document.getElementById('discountRate').value) / 100;
      const projectLifetime = inputs ? inputs.projectLifetime : parseInt(document.getElementById('projectLifetime').value);

      console.log('Parsed values:', { systemCost, annualProduction, electricityRate, annualExpenses, annualDegradation, inflationRate, discountRate, projectLifetime });
      console.log('Inputs parsed successfully');

      let cumulativeCashFlow = -systemCost;
      let npv = -systemCost;
      let paybackPeriod = 0;
      let totalProduction = 0;
      let totalRevenue = 0;
      let cashFlows = [-systemCost];
      let yearlyData = [];

      for (let year = 1; year <= projectLifetime; year++) {
          const yearlyProduction = annualProduction * Math.pow(1 - annualDegradation, year - 1);
          const yearlyRevenue = yearlyProduction * electricityRate * Math.pow(1 + inflationRate, year - 1);
          const yearlyExpenses = annualExpenses * Math.pow(1 + inflationRate, year - 1);
          
          const yearlyCashFlow = yearlyRevenue - yearlyExpenses;
          
          cashFlows.push(yearlyCashFlow);
          cumulativeCashFlow += yearlyCashFlow;
          npv += yearlyCashFlow / Math.pow(1 + discountRate, year);
          totalProduction += yearlyProduction;
          totalRevenue += yearlyRevenue;

          if (paybackPeriod === 0 && cumulativeCashFlow > 0) {
              paybackPeriod = year - 1 + (-cumulativeCashFlow + yearlyCashFlow) / yearlyCashFlow;
          }

          yearlyData.push({
              year,
              production: yearlyProduction,
              cumulativeCashFlow
          });
      }

      const roi = ((totalRevenue - systemCost) / systemCost) * 100;
      const lcoe = systemCost / totalProduction;
      const irr = calculateIRR(cashFlows);

      console.log('Calculations completed');

      if (returnResults) {
        console.log('Returning results:', { npv, irr, paybackPeriod, roi, lcoe });
        return { npv, irr, paybackPeriod, roi, lcoe };
    } else {
        displayResults(roi, irr, paybackPeriod, npv, lcoe);
        createCharts(yearlyData);
        document.getElementById('results').classList.remove('hidden');
        document.getElementById('charts').classList.remove('hidden');
        console.log('Results displayed');
    }
} catch (error) {
    console.error('Error in calculations:', error);
    console.error('Inputs:', inputs);
    throw error; // Re-throw the error so it's caught in the calling function
}
}

function calculateIRR(cashFlows, guess = 0.1) {
  const maxIterations = 1000;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
      let npv = cashFlows.reduce((sum, cashFlow, t) => sum + cashFlow / Math.pow(1 + guess, t), 0);
      let derivativeNPV = cashFlows.reduce((sum, cashFlow, t) => sum - t * cashFlow / Math.pow(1 + guess, t + 1), 0);
      
      let nextGuess = guess - npv / derivativeNPV;
      
      if (Math.abs(nextGuess - guess) < tolerance) {
          return nextGuess;
      }
      
      guess = nextGuess;
  }
  
  return null;
}

function displayResults(roi, irr, paybackPeriod, npv, lcoe) {
  document.getElementById('roiResult').textContent = `Return on Investment (ROI): ${roi.toFixed(2)}%`;
  document.getElementById('irrResult').textContent = `Internal Rate of Return (IRR): ${(irr * 100).toFixed(2)}%`;
  document.getElementById('paybackResult').textContent = `Payback Period: ${paybackPeriod.toFixed(2)} years`;
  document.getElementById('npvResult').textContent = `Net Present Value (NPV): ${formatCurrency(npv)}`;
  document.getElementById('lcoeResult').textContent = `Levelized Cost of Energy (LCOE): ${formatCurrency(lcoe)}/kWh`;
}

function createCharts(yearlyData) {
  const years = yearlyData.map(data => data.year);
  const cumulativeCashFlow = yearlyData.map(data => data.cumulativeCashFlow);
  const production = yearlyData.map(data => data.production);

  new Chart(document.getElementById('cashFlowChart'), {
      type: 'line',
      data: {
          labels: years,
          datasets: [{
              label: 'Cumulative Cash Flow',
              data: cumulativeCashFlow,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
          }]
      },
      options: {
          responsive: true,
          plugins: {
              title: {
                  display: true,
                  text: 'Cumulative Cash Flow Over Time'
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
          }
      }
  });

  new Chart(document.getElementById('productionChart'), {
      type: 'line',
      data: {
          labels: years,
          datasets: [{
              label: 'Annual Production',
              data: production,
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1
          }]
      },
      options: {
          responsive: true,
          plugins: {
              title: {
                  display: true,
                  text: 'Annual Energy Production Over Time'
              },
              tooltip: {
                  callbacks: {
                      label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) {
                              label += ': ';
                          }
                          if (context.parsed.y !== null) {
                              label += formatEnergy(context.parsed.y);
                          }
                          return label;
                      }
                  }
              }
          }
      }
  });
}

function performSensitivityAnalysis() {
  const variable = document.getElementById('sensitivityVariable').value;
  const range = parseFloat(document.getElementById('sensitivityRange').value) / 100;
  const steps = parseInt(document.getElementById('sensitivitySteps').value);

  const baseValue = parseFloat(document.getElementById(variable).value);
  const results = [];

  for (let i = 0; i < steps; i++) {
      const factor = 1 - range + (2 * range * i / (steps - 1));
      const newValue = baseValue * factor;
      
      // Temporarily set the new value
      document.getElementById(variable).value = newValue;
      
      const performance = calculateFinancialPerformance(true);
      results.push({
          factor: factor,
          npv: performance.npv,
          irr: performance.irr,
          paybackPeriod: performance.paybackPeriod
      });
  }

  // Reset to original value
  document.getElementById(variable).value = baseValue;

  displaySensitivityResults(results, variable);
}

function displaySensitivityResults(results, variable) {
  const ctx = document.getElementById('sensitivityChart').getContext('2d');
  
  if (window.sensitivityChart instanceof Chart) {
      window.sensitivityChart.destroy();
  }

  window.sensitivityChart = new Chart(ctx, {
      type: 'line',
      data: {
          labels: results.map(r => `${(r.factor * 100).toFixed(0)}%`),
          datasets: [
              {
                  label: 'NPV',
                  data: results.map(r => r.npv),
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.5)',
                  yAxisID: 'y',
                  tension: 0.1
              },
              {
                  label: 'IRR',
                  data: results.map(r => r.irr * 100), // Convert to percentage
                  borderColor: 'rgb(255, 99, 132)',
                  backgroundColor: 'rgba(255, 99, 132, 0.5)',
                  yAxisID: 'y1',
                  tension: 0.1
              },
              {
                  label: 'Payback Period',
                  data: results.map(r => r.paybackPeriod),
                  borderColor: 'rgb(54, 162, 235)',
                  backgroundColor: 'rgba(54, 162, 235, 0.5)',
                  yAxisID: 'y1',
                  tension: 0.1
              }
          ]
      },
      options: {
          responsive: true,
          interaction: {
              mode: 'index',
              intersect: false,
          },
          stacked: false,
          plugins: {
              title: {
                  display: true,
                  text: `Sensitivity Analysis: Impact of ${variable} on Financial Metrics`
              },
              tooltip: {
                  callbacks: {
                      label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) {
                              label += ': ';
                          }
                          if (context.parsed.y !== null) {
                              if (label.startsWith('NPV')) {
                                  label += formatCurrency(context.parsed.y);
                              } else if (label.startsWith('IRR')) {
                                  label += context.parsed.y.toFixed(2) + '%';
                              } else {
                                  label += context.parsed.y.toFixed(2) + ' years';
                              }
                          }
                          return label;
                      }
                  }
              }
          },
          scales: {
              x: {
                  title: {
                      display: true,
                      text: `${variable} (% of base value)`
                  }
              },
              y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  title: {
                      display: true,
                      text: 'Net Present Value (NPV)'
                  },
                  ticks: {
                      callback: function(value, index, values) {
                          return formatCurrency(value);
                      }
                  }
              },
              y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  title: {
                      display: true,
                      text: 'IRR (%) / Payback Period (Years)'
                  },
                  grid: {
                      drawOnChartArea: false, // only want the grid lines for one axis to show up
                  },
              }
          }
      }
  });

  document.getElementById('sensitivityResults').classList.remove('hidden');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}

function formatEnergy(value) {
  if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`;
  } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`;
  } else {
      return `${value.toFixed(2)} kWh`;
  }
}

function runMonteCarloSimulation() {
  console.log('Starting Monte Carlo simulation');
  const simulationRuns = parseInt(document.getElementById('simulationRuns').value);
  const confidenceInterval = parseFloat(document.getElementById('confidenceInterval').value) / 100;
  console.log(`Simulation runs: ${simulationRuns}, Confidence interval: ${confidenceInterval}`);

  const results = [];
  for (let i = 0; i < simulationRuns; i++) {
      if (i % 100 === 0) console.log(`Running simulation ${i}`);
      const simulatedInputs = generateSimulatedInputs();
      const performance = calculateFinancialPerformance(true, simulatedInputs);
      results.push(performance);
  }

  console.log('Simulation complete, displaying results');
  displayMonteCarloResults(results, confidenceInterval);
}

function generateSimulatedInputs() {
  // Generate random variations for inputs
  // You can adjust the variation ranges based on your requirements
  return {
      systemCost: parseFloat(document.getElementById('systemCost').value) * (1 + (Math.random() - 0.5) * 0.2),
      annualProduction: parseFloat(document.getElementById('annualProduction').value) * (1 + (Math.random() - 0.5) * 0.15),
      electricityRate: parseFloat(document.getElementById('electricityRate').value) * (1 + (Math.random() - 0.5) * 0.1),
      annualExpenses: parseFloat(document.getElementById('annualExpenses').value) * (1 + (Math.random() - 0.5) * 0.2),
      annualDegradation: parseFloat(document.getElementById('annualDegradation').value) * (1 + (Math.random() - 0.5) * 0.5),
      inflationRate: parseFloat(document.getElementById('inflationRate').value) * (1 + (Math.random() - 0.5) * 0.5),
      discountRate: parseFloat(document.getElementById('discountRate').value) * (1 + (Math.random() - 0.5) * 0.5),
      projectLifetime: parseInt(document.getElementById('projectLifetime').value)
  };
}

function displayMonteCarloResults(results, confidenceInterval) {
  console.log('Displaying Monte Carlo results', { resultsCount: results.length, confidenceInterval });
  
  const npvValues = results.map(r => r.npv).sort((a, b) => a - b);
  const irrValues = results.map(r => r.irr).sort((a, b) => a - b);
  const paybackValues = results.map(r => r.paybackPeriod).sort((a, b) => a - b);

  const lowerBound = Math.floor(results.length * (1 - confidenceInterval) / 2);
  const upperBound = Math.ceil(results.length * (1 + confidenceInterval) / 2) - 1;

  const stats = {
      npv: {
          mean: mean(npvValues),
          median: median(npvValues),
          lowerCI: npvValues[lowerBound],
          upperCI: npvValues[upperBound]
      },
      irr: {
          mean: mean(irrValues),
          median: median(irrValues),
          lowerCI: irrValues[lowerBound],
          upperCI: irrValues[upperBound]
      },
      payback: {
          mean: mean(paybackValues),
          median: median(paybackValues),
          lowerCI: paybackValues[lowerBound],
          upperCI: paybackValues[upperBound]
      }
  };

  console.log('Calculated stats', stats);

  updateMonteCarloChart(npvValues, stats.npv);
  displayMonteCarloStats(stats);

  document.getElementById('monteCarloResults').classList.remove('hidden');
}

function updateMonteCarloChart(npvValues, npvStats) {
  const ctx = document.getElementById('monteCarloChart').getContext('2d');
  
  // Create bins for the histogram
  const binCount = Math.ceil(Math.sqrt(npvValues.length)); // Square root choice for bin count
  const minNPV = Math.min(...npvValues);
  const maxNPV = Math.max(...npvValues);
  const binWidth = (maxNPV - minNPV) / binCount;
  
  const bins = Array(binCount).fill(0);
  npvValues.forEach(value => {
      const binIndex = Math.min(Math.floor((value - minNPV) / binWidth), binCount - 1);
      bins[binIndex]++;
  });
  
  const binLabels = bins.map((_, index) => formatCurrency(minNPV + (index + 0.5) * binWidth));

  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: binLabels,
          datasets: [{
              label: 'Frequency',
              data: bins,
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
              borderColor: 'rgb(75, 192, 192)',
              borderWidth: 1
          }]
      },
      options: {
          responsive: true,
          plugins: {
              title: {
                  display: true,
                  text: 'NPV Distribution from Monte Carlo Simulation'
              },
              annotation: {
                  annotations: [
                      {
                          type: 'line',
                          mode: 'vertical',
                          scaleID: 'x',
                          value: npvStats.mean,
                          borderColor: 'rgb(255, 99, 132)',
                          borderWidth: 2,
                          label: {
                              content: `Mean: ${formatCurrency(npvStats.mean)}`,
                              enabled: true,
                              position: 'top'
                          }
                      },
                      {
                          type: 'line',
                          mode: 'vertical',
                          scaleID: 'x',
                          value: npvStats.median,
                          borderColor: 'rgb(255, 159, 64)',
                          borderWidth: 2,
                          label: {
                              content: `Median: ${formatCurrency(npvStats.median)}`,
                              enabled: true,
                              position: 'top'
                          }
                      }
                  ]
              }
          },
          scales: {
              x: {
                  title: {
                      display: true,
                      text: 'Net Present Value (NPV)'
                  },
                  ticks: {
                      callback: function(value, index, values) {
                          if (index % Math.ceil(binCount / 5) === 0) {
                              return this.getLabelForValue(value);
                          }
                      }
                  }
              },
              y: {
                  title: {
                      display: true,
                      text: 'Frequency'
                  },
                  beginAtZero: true
              }
          }
      }
  });
}

function displayMonteCarloStats(stats) {
  const statsContainer = document.getElementById('monteCarloStats');
  statsContainer.innerHTML = `
      <div>
          <h3 class="font-bold">NPV Statistics</h3>
          <p>Mean: ${formatCurrency(stats.npv.mean)}</p>
          <p>Median: ${formatCurrency(stats.npv.median)}</p>
          <p>Confidence Interval: ${formatCurrency(stats.npv.lowerCI)} to ${formatCurrency(stats.npv.upperCI)}</p>
      </div>
      <div>
          <h3 class="font-bold">IRR Statistics</h3>
          <p>Mean: ${(stats.irr.mean * 100).toFixed(2)}%</p>
          <p>Median: ${(stats.irr.median * 100).toFixed(2)}%</p>
          <p>Confidence Interval: ${(stats.irr.lowerCI * 100).toFixed(2)}% to ${(stats.irr.upperCI * 100).toFixed(2)}%</p>
      </div>
      <div>
          <h3 class="font-bold">Payback Period Statistics</h3>
          <p>Mean: ${stats.payback.mean.toFixed(2)} years</p>
          <p>Median: ${stats.payback.median.toFixed(2)} years</p>
          <p>Confidence Interval: ${stats.payback.lowerCI.toFixed(2)} to ${stats.payback.upperCI.toFixed(2)} years</p>
      </div>
  `;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

console.log('Financial calculator script loaded with Monte Carlo simulation');