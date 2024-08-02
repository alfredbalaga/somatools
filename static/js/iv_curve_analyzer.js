let curveCount = 1;
let ivChart;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips or other UI elements if needed
});

function addCurveInput() {
    curveCount++;
    const newCurve = document.createElement('div');
    newCurve.className = 'curve-input mb-6 p-4 bg-gray-50 rounded-md';
    newCurve.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">Curve ${curveCount}</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label for="voc${curveCount}" class="block text-sm font-medium text-gray-700">Open Circuit Voltage (V):</label>
                <input type="number" id="voc${curveCount}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" required>
            </div>
            <div>
                <label for="isc${curveCount}" class="block text-sm font-medium text-gray-700">Short Circuit Current (A):</label>
                <input type="number" id="isc${curveCount}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" required>
            </div>
            <div>
                <label for="pmax${curveCount}" class="block text-sm font-medium text-gray-700">Rated Maximum Power (W):</label>
                <input type="number" id="pmax${curveCount}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" required>
            </div>
        </div>

        <h4 class="text-md font-medium mb-2">Measured V-I Pairs</h4>
        <div id="measurementInputs${curveCount}" class="space-y-2">
            <div class="measurement-pair flex space-x-4">
                <input type="number" class="voltage mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="Voltage (V)" step="0.01">
                <input type="number" class="current mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="Current (A)" step="0.01">
            </div>
        </div>
        <button onclick="addMeasurement(${curveCount})" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Measurement</button>
    `;
    document.getElementById('curveInputs').appendChild(newCurve);
}

function addMeasurement(curveIndex) {
    const measurementInputs = document.getElementById(`measurementInputs${curveIndex}`);
    const newPair = document.createElement('div');
    newPair.className = 'measurement-pair flex space-x-4';
    newPair.innerHTML = `
        <input type="number" class="voltage mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="Voltage (V)" step="0.01">
        <input type="number" class="current mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="Current (A)" step="0.01">
    `;
    measurementInputs.appendChild(newPair);
}

function analyzeIVCurves() {
    const curves = getCurveData();
    const irradiance = parseFloat(document.getElementById('irradiance').value);
    const temperature = parseFloat(document.getElementById('temperature').value);

    console.log('Sending data:', { curves, irradiance, temperature });

    document.getElementById('loadingIndicator').classList.remove('hidden');

    fetch('/api/analyze_iv_curve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ curves, irradiance, temperature })
    })
    .then(response => response.json())
    .then(analysisResults => {
        console.log('Received analysis results:', analysisResults);

        document.getElementById('loadingIndicator').classList.add('hidden');

        if (Array.isArray(analysisResults) && analysisResults.length > 0) {
            const result = analysisResults[0];
            if (result.error) {
                throw new Error(result.error);
            }
            
            try {
                console.log('Updating chart...');
                updateChart(curves, analysisResults);
                
                console.log('Displaying key parameters...');
                displayKeyParameters(analysisResults);
                
                console.log('Displaying faults...');
                displayFaults(analysisResults);
                
                console.log('Displaying comparison...');
                displayComparison(curves, analysisResults);
                
                console.log('Displaying environmental corrections...');
                displayEnvironmentalCorrections(curves, analysisResults, irradiance, temperature);
                
                if (result.irradiance_curves) {
                    console.log('Plotting multiple I-V curves...');
                    plotMultipleIVCurves(result.irradiance_curves);
                }

                document.getElementById('results').classList.remove('hidden');
                console.log('Analysis complete, results should be visible.');
            } catch (error) {
                console.error('Error while displaying results:', error);
                alert('An error occurred while displaying the results. Please check the console for more details.');
            }
        } else {
            throw new Error('Unexpected response format from server');
        }
    })
    .catch(error => {
        console.error('Error during analysis:', error);
        document.getElementById('loadingIndicator').classList.add('hidden');
        alert(`An error occurred during analysis: ${error.message}. Please check the console for more details.`);
    });
}

function getCurveData() {
    const curves = [];
    document.querySelectorAll('.curve-input').forEach((curveElement, index) => {
        const voc = parseFloat(curveElement.querySelector(`#voc${index + 1}`).value);
        const isc = parseFloat(curveElement.querySelector(`#isc${index + 1}`).value);
        const pmax = parseFloat(curveElement.querySelector(`#pmax${index + 1}`).value);

        const measurements = [];
        curveElement.querySelectorAll('.measurement-pair').forEach(pair => {
            const voltage = parseFloat(pair.querySelector('.voltage').value);
            const current = parseFloat(pair.querySelector('.current').value);
            if (!isNaN(voltage) && !isNaN(current)) {
                measurements.push([voltage, current]);
            }
        });

        if (!isNaN(voc) && !isNaN(isc) && !isNaN(pmax) && measurements.length > 0) {
            curves.push({ voc, isc, pmax, measurements });
        }
    });
    return curves;
}

function analyzeIVCurve(curveData, irradiance, temperature) {
    // Implement curve fitting using the single diode model
    const fittedParams = fitSingleDiodeModel(curveData.measurements);

    // Extract key parameters
    const keyParams = extractKeyParameters(curveData.measurements, curveData.voc, curveData.isc, curveData.pmax);

    // Generate ideal curve
    const idealCurve = generateIdealCurve(curveData.voc, curveData.isc, keyParams.Vmpp, keyParams.Impp);

    // Perform environmental corrections
    const correctedCurve = correctIVCurve(curveData.measurements, irradiance, temperature);

    // Detect faults
    const faults = detectFaults(keyParams, idealCurve, fittedParams);

    return {
        fittedParams,
        keyParams,
        idealCurve,
        correctedCurve,
        faults
    };
}

function fitSingleDiodeModel(measurements) {
    // Implement single diode model fitting
    // This is a placeholder and should be replaced with actual implementation
    return {
        I_L: 0,
        I_0: 0,
        R_s: 0,
        R_sh: 0,
        n: 1
    };
}

function extractKeyParameters(measurements, Voc, Isc, Pmax) {
    let Vmpp = 0, Impp = 0, measuredPmax = 0;
    measurements.forEach(point => {
        const power = point.voltage * point.current;
        if (power > measuredPmax) {
            measuredPmax = power;
            Vmpp = point.voltage;
            Impp = point.current;
        }
    });

    const FF = (Vmpp * Impp) / (Voc * Isc);
    const efficiency = (measuredPmax / (1000 * 1.6)) * 100; // Assuming 1000 W/m² irradiance and 1.6 m² panel area

    return { Voc, Isc, Vmpp, Impp, Pmax: measuredPmax, FF, efficiency };
}

function generateIdealCurve(Voc, Isc, Vmp, Imp) {
    const points = [];
    const Vt = 25.7; // Thermal voltage at 25°C
    const a = 1.5; // Ideality factor
    
    for (let V = 0; V <= Voc; V += Voc / 100) {
        const I = Isc * (1 - Math.exp((V - Voc) / (a * Vt)));
        points.push({ voltage: V, current: I });
    }
    return points;
}

function correctIVCurve(measurements, G, T, G_STC = 1000, T_STC = 25) {
    const alpha = 0.04; // Current temperature coefficient (%/°C)
    const beta = -0.3;  // Voltage temperature coefficient (%/°C)
    const Rs = 0.5;     // Series resistance (Ω)
    const k = 0.0004;   // Curve correction factor

    return measurements.map(point => {
        const I_STC = point.current * (G_STC / G);
        const V_STC = point.voltage + 
                      point.voltage * (beta / 100) * (T_STC - T) + 
                      Rs * (I_STC - point.current) + 
                      k * I_STC * (T_STC - T);
        return { voltage: V_STC, current: I_STC };
    });
}

function detectFaults(params, idealCurve, fittedParams) {
    const faults = [];
    
    // Check for significant deviations from ideal parameters
    if (params.Voc < idealCurve[idealCurve.length - 1].voltage * 0.9) {
        faults.push("Low open circuit voltage - possible cell damage or connection issues");
    }
    if (params.Isc < idealCurve[0].current * 0.9) {
        faults.push("Low short circuit current - possible shading or soiling issues");
    }
    if (params.FF < 0.7) {
        faults.push("Low fill factor - possible degradation or mismatch issues");
    }
    if (params.efficiency < 15) {
        faults.push("Low efficiency - possible overall degradation or system issues");
    }
    
    // Check for curve shape abnormalities
    if (isStepInCurve(params.measurements)) {
        faults.push("Step detected in I-V curve - possible bypass diode activation or partial shading");
    }
    if (isHighSeriesResistance(fittedParams)) {
        faults.push("High series resistance detected - possible connection issues or degradation");
    }
    
    return faults;
}

function displayKeyParameters(results) {
    const keyParamsDiv = document.getElementById('keyParameters');
    if (!keyParamsDiv) {
        console.error('Key parameters div not found');
        return;
    }
    
    keyParamsDiv.innerHTML = '<h3>Key Parameters</h3>';
    
    results.forEach((result, index) => {
        const params = result.key_params;
        if (params) {
            keyParamsDiv.innerHTML += `
                <div>
                    <h4>Curve ${index + 1}</h4>
                    <p>Voc: ${params.Voc.toFixed(2)} V</p>
                    <p>Isc: ${params.Isc.toFixed(2)} A</p>
                    <p>Vmpp: ${params.Vmpp.toFixed(2)} V</p>
                    <p>Impp: ${params.Impp.toFixed(2)} A</p>
                    <p>Pmax: ${params.Pmax.toFixed(2)} W</p>
                    <p>Fill Factor: ${(params.FF * 100).toFixed(2)}%</p>
                    <p>Efficiency: ${params.efficiency.toFixed(2)}%</p>
                </div>
            `;
        } else {
            console.warn(`No key parameters found for curve ${index + 1}`);
        }
    });
}

function isStepInCurve(measurements) {
    // Implement step detection algorithm
    // This is a placeholder and should be replaced with actual implementation
    return false;
}

function isHighSeriesResistance(fittedParams) {
    // Implement series resistance detection algorithm
    // This is a placeholder and should be replaced with actual implementation
    return fittedParams.R_s > 1;
}

function updateChart(curves, analysisResults) {
    const ctx = document.getElementById('ivChart').getContext('2d');
    if (!ctx) {
        console.error('Chart canvas not found');
        return;
    }
    
    if (window.ivChart instanceof Chart) {
        window.ivChart.destroy();
    }
    
    const datasets = [];
    curves.forEach((curve, index) => {
        const result = analysisResults[index];
        if (result && result.ideal_curve) {
            datasets.push({
                label: `Measured Curve ${index + 1}`,
                data: curve.measurements.map(point => ({ x: point[0], y: point[1] })),
                borderColor: getColor(index, 'solid'),
                backgroundColor: getColor(index, 'transparent'),
                fill: false
            });
            datasets.push({
                label: `Ideal Curve ${index + 1}`,
                data: result.ideal_curve.map(point => ({ x: point[0], y: point[1] })),
                borderColor: getColor(index, 'dashed'),
                borderDash: [5, 5],
                fill: false
            });
        } else {
            console.warn(`Missing data for curve ${index + 1}`);
        }
    });

    window.ivChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            title: { display: true, text: 'I-V Curves Analysis' },
            scales: {
                x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Voltage (V)' } },
                y: { title: { display: true, text: 'Current (A)' } }
            }
        }
    });
}

function getColor(index, style) {
    const colors = ['red', 'blue', 'green', 'purple', 'orange'];
    const baseColor = colors[index % colors.length];
    switch (style) {
        case 'solid':
            return baseColor;
        case 'transparent':
            return `${baseColor}50`;
        case 'dashed':
            return `dark${baseColor}`;
        case 'dotted':
            return `light${baseColor}`;
    }
}

function displayKeyParameters(analysisResults) {
    const keyParamsDiv = document.getElementById('keyParameters');
    keyParamsDiv.innerHTML = '<h3 class="text-lg font-medium mb-2">Key Parameters</h3>';
    
    // Ensure analysisResults is an array
    const resultsArray = Array.isArray(analysisResults) ? analysisResults : [analysisResults];
    
    resultsArray.forEach((result, index) => {
        const params = result.key_params;
        if (params) {
            keyParamsDiv.innerHTML += `
                <div class="mb-4">
                    <h4 class="font-medium">Curve ${index + 1}</h4>
                    <p>Open Circuit Voltage (Voc): ${params.Voc.toFixed(2)} V</p>
                    <p>Short Circuit Current (Isc): ${params.Isc.toFixed(2)} A</p>
                    <p>Maximum Power Point Voltage (Vmpp): ${params.Vmpp.toFixed(2)} V</p>
                    <p>Maximum Power Point Current (Impp): ${params.Impp.toFixed(2)} A</p>
                    <p>Maximum Power (Pmax): ${params.Pmax.toFixed(2)} W</p>
                    <p>Fill Factor (FF): ${(params.FF * 100).toFixed(2)}%</p>
                    <p>Efficiency: ${params.efficiency.toFixed(2)}%</p>
                </div>
            `;
        } else {
            console.warn(`Missing key parameters for curve ${index + 1}`);
        }
    });
}

function displayFaults(analysisResults) {
    const faultsDiv = document.getElementById('faults');
    faultsDiv.innerHTML = '<h3 class="text-lg font-medium mb-2">Detected Faults</h3>';
    
    // Ensure analysisResults is an array
    const resultsArray = Array.isArray(analysisResults) ? analysisResults : [analysisResults];
    
    resultsArray.forEach((result, index) => {
        faultsDiv.innerHTML += `<h4 class="font-medium">Curve ${index + 1}</h4>`;
        if (result.faults && result.faults.length > 0) {
            faultsDiv.innerHTML += '<ul class="list-disc list-inside">' + 
                result.faults.map(fault => `<li>${fault}</li>`).join('') + 
                '</ul>';
        } else {
            faultsDiv.innerHTML += '<p>No significant faults detected.</p>';
        }
    });
}

// Update other display functions similarly

function displayComparison(curves, analysisResults) {
    const comparisonDiv = document.getElementById('comparison');
    comparisonDiv.innerHTML = '<h3 class="text-lg font-medium mb-2">Comparison with Ideal Curve</h3>';
    
    // Ensure curves and analysisResults are arrays
    const curvesArray = Array.isArray(curves) ? curves : [curves];
    const resultsArray = Array.isArray(analysisResults) ? analysisResults : [analysisResults];
    
    curvesArray.forEach((curve, index) => {
        const result = resultsArray[index];
        if (result && result.key_params && result.ideal_curve) {
            const idealPmax = Math.max(...result.ideal_curve.map(point => point[0] * point[1]));
            const measuredPmax = result.key_params.Pmax;
            const deviation = ((measuredPmax - idealPmax) / idealPmax) * 100;
            
            comparisonDiv.innerHTML += `
                <div class="mb-4">
                    <h4 class="font-medium">Curve ${index + 1}</h4>
                    <p>Ideal Maximum Power: ${idealPmax.toFixed(2)} W</p>
                    <p>Measured Maximum Power: ${measuredPmax.toFixed(2)} W</p>
                    <p>Deviation: ${deviation.toFixed(2)}%</p>
                </div>
            `;
        } else {
            console.warn(`Missing data for comparison of curve ${index + 1}`);
            comparisonDiv.innerHTML += `
                <div class="mb-4">
                    <h4 class="font-medium">Curve ${index + 1}</h4>
                    <p>Insufficient data for comparison</p>
                </div>
            `;
        }
    });
}

function displayEnvironmentalCorrections(curves, analysisResults, irradiance, temperature) {
    console.log('Displaying environmental corrections...');
    console.log('Curves:', curves);
    console.log('Analysis Results:', analysisResults);

    const correctionsDiv = document.getElementById('environmentalCorrections');
    if (!correctionsDiv) {
        console.error('Environmental corrections div not found');
        return;
    }

    correctionsDiv.innerHTML = '<h3>Environmental Corrections</h3>';
    correctionsDiv.innerHTML += `
        <p>Applied corrections for:</p>
        <ul>
            <li>Irradiance: ${irradiance} W/m²</li>
            <li>Temperature: ${temperature}°C</li>
        </ul>
    `;
    
    curves.forEach((curve, index) => {
        const result = analysisResults[index];
        if (result && result.corrected_curve) {
            const originalPmax = curve.pmax || 0;
            const correctedPmax = Math.max(...result.corrected_curve.map(point => point[0] * point[1]));
            const correction = ((correctedPmax - originalPmax) / originalPmax) * 100;
            
            correctionsDiv.innerHTML += `
                <div>
                    <h4>Curve ${index + 1}</h4>
                    <p>Original Maximum Power: ${originalPmax.toFixed(2)} W</p>
                    <p>Corrected Maximum Power: ${correctedPmax.toFixed(2)} W</p>
                    <p>Correction: ${correction.toFixed(2)}%</p>
                </div>
            `;
        } else {
            console.warn(`Missing corrected curve data for curve ${index + 1}`);
            correctionsDiv.innerHTML += `
                <div>
                    <h4>Curve ${index + 1}</h4>
                    <p>Insufficient data for environmental corrections</p>
                </div>
            `;
        }
    });
}

function plotMultipleIVCurves(irradianceCurves) {
    const ctx = document.getElementById('irradianceChart').getContext('2d');
    
    if (window.irradianceChart instanceof Chart) {
        window.irradianceChart.destroy();
    }
    
    const datasets = irradianceCurves.map(({irradiance, curve}) => ({
        label: `${irradiance} W/m²`,
        data: curve.map(([v, i]) => ({ x: v, y: i })),
        borderColor: getColorForIrradiance(irradiance),
        fill: false
    }));

    window.irradianceChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            title: { display: true, text: 'I-V Curves at Different Irradiance Levels' },
            scales: {
                x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Voltage (V)' } },
                y: { title: { display: true, text: 'Current (A)' } }
            }
        }
    });
}

function getColorForIrradiance(irradiance) {
    // Define colors for each irradiance level
    const colors = {
        200: 'rgba(255, 99, 132, 1)',
        400: 'rgba(54, 162, 235, 1)',
        600: 'rgba(255, 206, 86, 1)',
        800: 'rgba(75, 192, 192, 1)',
        1000: 'rgba(153, 102, 255, 1)'
    };
    return colors[irradiance] || 'rgba(0, 0, 0, 1)';
}

function logErrorDetails(error, analysisResults) {
    console.error('Error during analysis:', error);
    console.error('Error message:', error.message);
    console.error('Analysis results:', analysisResults);
    console.error('Stack trace:', error.stack);
}

// Utility function to download analysis results as CSV
function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add headers
    csvContent += "Curve,Voc,Isc,Vmpp,Impp,Pmax,FF,Efficiency\n";
    
    analysisResults.forEach((result, index) => {
        const params = result.keyParams;
        csvContent += `${index + 1},${params.Voc},${params.Isc},${params.Vmpp},${params.Impp},${params.Pmax},${params.FF},${params.efficiency}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "iv_curve_analysis.csv");
    document.body.appendChild(link);
    link.click();
}

// Event listener for the download button
document.getElementById('downloadCSV').addEventListener('click', downloadCSV);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Add initial curve input
    addCurveInput();
    
    // Initialize tooltips or other UI elements if needed
    // For example, if using a tooltip library:
    // initializeTooltips();
});