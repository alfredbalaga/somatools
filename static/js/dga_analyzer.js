// Global variables
let samples = [];
let sampleCount = 0;
let trendChart;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        alert('Error: Chart.js is not loaded. Please check your network connection and reload the page.');
        return;
    }
    
    // Add event listeners
    document.getElementById('dgaForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('addSampleBtn').addEventListener('click', addSampleInput);
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', generatePDFReport);
        console.log('PDF generation button listener added');
    } else {
        console.error('Generate PDF button not found');
    }
    // Add the first sample input automatically
    addSampleInput();
});

function generatePDFReport() {
    if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        alert('PDF generation libraries are not loaded. Please check your internet connection and refresh the page.');
        return;
    }
    console.log('Starting PDF generation');
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF is not loaded');
        alert('Error: PDF generation library is not loaded. Please check your internet connection and refresh the page.');
        return;
    }

    const { jsPDF } = window.jspdf;
    
    try {
        const doc = new jsPDF();
        
        console.log('jsPDF instance created');

        // Set font styles
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 255);  // Blue color for the title
        
        // Add title
        doc.text("DGA Analysis Report", 105, 15, null, null, "center");
        
        // Reset font for content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);  // Black color for content
        
        // Add sample information
        if (samples.length === 0) {
            console.warn('No samples available');
            doc.text("No sample data available", 20, 30);
        } else {
            samples.forEach((sample, index) => {
                doc.text(`Sample ${index + 1}`, 20, 30 + index * 40);
                doc.text(`Date: ${sample.date}`, 30, 35 + index * 40);
                doc.text(`H2: ${sample.h2} ppm`, 30, 40 + index * 40);
                doc.text(`CH4: ${sample.ch4} ppm`, 30, 45 + index * 40);
                doc.text(`C2H6: ${sample.c2h6} ppm`, 30, 50 + index * 40);
                doc.text(`C2H4: ${sample.c2h4} ppm`, 30, 55 + index * 40);
                doc.text(`C2H2: ${sample.c2h2} ppm`, 30, 60 + index * 40);
                doc.text(`CO: ${sample.co} ppm`, 30, 65 + index * 40);
                doc.text(`CO2: ${sample.co2} ppm`, 30, 70 + index * 40);
            });
        }
        
        console.log('Sample information added to PDF');

        // Add analysis results
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 255);
        doc.text("Analysis Results", 105, 15, null, null, "center");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);

        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) {
            console.warn('Results div not found');
            doc.text("Analysis results not available", 20, 30);
        } else {
            html2canvas(resultsDiv).then(canvas => {
                console.log('Results canvas created');
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 15, 30, 180, 100);
                
                // Add trend chart
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 255);
                doc.text("Trend Analysis", 105, 15, null, null, "center");
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);

                const trendChart = document.getElementById('trendChart');
                if (!trendChart) {
                    console.warn('Trend chart not found');
                    doc.text("Trend analysis not available", 20, 30);
                    doc.save(`DGA_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
                } else {
                    html2canvas(trendChart).then(canvas => {
                        console.log('Trend chart canvas created');
                        const imgData = canvas.toDataURL('image/png');
                        doc.addImage(imgData, 'PNG', 15, 30, 180, 100);
                        
                        // Add trend interpretation
                        const interpretationDiv = document.getElementById('trendInterpretation');
                        if (interpretationDiv) {
                            doc.text(interpretationDiv.innerText, 15, 140, { maxWidth: 180 });
                        }
                        
                        // Save the PDF
                        doc.save(`DGA_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
                        console.log('PDF saved');
                    }).catch(error => {
                        console.error('Error creating trend chart canvas:', error);
                        alert('Error generating trend chart for PDF. Please try again.');
                    });
                }
            }).catch(error => {
                console.error('Error creating results canvas:', error);
                alert('Error generating analysis results for PDF. Please try again.');
            });
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Please check the console for details and try again.');
    }
}

function addSampleInput(sampleData = null, sampleNumber = null) {
    console.log('Adding new sample input');
    if (sampleNumber === null) {
        sampleCount++;
        sampleNumber = sampleCount;
    }
    
    const sampleInputs = document.getElementById('sampleInputs');
    const newSample = document.createElement('div');
    newSample.className = 'sample-input border-t pt-4 mt-4';
    newSample.innerHTML = `
        <h3 class="text-lg font-medium mb-2">Sample ${sampleCount}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
                <label for="sampleDate${sampleCount}" class="block text-sm font-medium text-gray-700">Sample Date:</label>
                <input type="date" id="sampleDate${sampleCount}" name="sampleDate${sampleCount}" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label for="h2${sampleCount}" class="block text-sm font-medium text-gray-700">H2 Hydrogen (ppm):</label>
                <input type="number" id="h2${sampleCount}" name="h2${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="ch4${sampleCount}" class="block text-sm font-medium text-gray-700">CH4 Methane (ppm):</label>
                <input type="number" id="ch4${sampleCount}" name="ch4${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="c2h6${sampleCount}" class="block text-sm font-medium text-gray-700">C2H6 Ethane (ppm):</label>
                <input type="number" id="c2h6${sampleCount}" name="c2h6${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="c2h4${sampleCount}" class="block text-sm font-medium text-gray-700">C2H4 Ethylene (ppm):</label>
                <input type="number" id="c2h4${sampleCount}" name="c2h4${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="c2h2${sampleCount}" class="block text-sm font-medium text-gray-700">C2H2 Acetylene (ppm):</label>
                <input type="number" id="c2h2${sampleCount}" name="c2h2${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="co${sampleCount}" class="block text-sm font-medium text-gray-700">CO Carbon Monoxide (ppm):</label>
                <input type="number" id="co${sampleCount}" name="co${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
            <div>
                <label for="co2${sampleCount}" class="block text-sm font-medium text-gray-700">CO2 Carbon Dioxide (ppm):</label>
                <input type="number" id="co2${sampleCount}" name="co2${sampleCount}" required min="0" step="0.1" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            </div>
        </div>
    `;
    sampleInputs.appendChild(newSample);
    console.log(`Sample ${sampleNumber} added`);
}


function handleFormSubmit(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const formData = new FormData(e.target);
    samples = [];

    for (let i = 1; i <= sampleCount; i++) {
        const sample = {
            date: formData.get(`sampleDate${i}`),
            h2: parseFloat(formData.get(`h2${i}`)),
            ch4: parseFloat(formData.get(`ch4${i}`)),
            c2h6: parseFloat(formData.get(`c2h6${i}`)),
            c2h4: parseFloat(formData.get(`c2h4${i}`)),
            c2h2: parseFloat(formData.get(`c2h2${i}`)),
            co: parseFloat(formData.get(`co${i}`)),
            co2: parseFloat(formData.get(`co2${i}`))
        };
        samples.push(sample);
        console.log(`Sample ${i} data:`, sample);
    }
    console.log('Samples data after form submission:', samples);
    analyzeSamples();
    updateTrendAnalysis();  // Make sure this line is present
}

function analyzeSamples() {
    console.log('Analyzing samples');
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results
    resultsDiv.classList.remove('hidden');

    samples.forEach((sample, index) => {
        console.log(`Analyzing sample ${index + 1}`);
        const allResults = runAllInterpretations(sample);
        const tdcg = calculateTDCG(sample);
        const tdcgCondition = getTDCGCondition(tdcg);

        const sampleResult = document.createElement('div');
        sampleResult.className = 'sample-result mb-6 p-4 bg-gray-100 rounded-lg';
        sampleResult.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Sample ${index + 1} Results (Date: ${sample.date})</h3>
            <p><strong>TDCG:</strong> ${tdcg.toFixed(2)} ppm (${tdcgCondition})</p>
            <h4 class="font-medium mt-2">Interpretation Results:</h4>
            <ul class="list-disc pl-5">
                <li><strong>Doernenburg:</strong> ${allResults.doernenburg.faultType}</li>
                <li><strong>Rogers:</strong> ${allResults.rogers.faultType}</li>
                <li><strong>Duval Triangle:</strong> ${allResults.duval.faultType}</li>
                <li><strong>IEC 60599:</strong> ${allResults.iec60599.faultType}</li>
                <li><strong>IEEE C57.104:</strong> Condition ${allResults.ieeeC57104.condition}</li>
                <li><strong>Duval Pentagon:</strong> ${allResults.duvalPentagon.faultType}</li>
            </ul>
            <h4 class="font-medium mt-2">Gas Concentrations:</h4>
            <ul class="list-disc pl-5">
                <li>H2: ${sample.h2} ppm</li>
                <li>CH4: ${sample.ch4} ppm</li>
                <li>C2H6: ${sample.c2h6} ppm</li>
                <li>C2H4: ${sample.c2h4} ppm</li>
                <li>C2H2: ${sample.c2h2} ppm</li>
                <li>CO: ${sample.co} ppm</li>
                <li>CO2: ${sample.co2} ppm</li>
            </ul>
        `;
        resultsDiv.appendChild(sampleResult);
    });

    updateTrendAnalysis();
}


function interpretTrends(samples) {
    if (samples.length < 2) {
        return "At least two samples are needed for trend analysis.";
    }

    const latestSample = samples[samples.length - 1];
    const previousSample = samples[samples.length - 2];
    const gases = ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'];
    
    let significantChanges = [];

    gases.forEach(gas => {
        const change = ((latestSample[gas] - previousSample[gas]) / previousSample[gas]) * 100;
        if (Math.abs(change) > 10) {  // Consider a change significant if it's more than 10%
            significantChanges.push(`${gas.toUpperCase()} ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`);
        }
    });

    if (significantChanges.length === 0) {
        return "No significant changes in gas concentrations were observed between the last two samples.";
    } else {
        return "Significant changes observed: " + significantChanges.join(', ') + ". These changes may indicate developing faults or ongoing degradation processes. Continue monitoring and consider further investigation if the trend continues.";
    }
}


function calculateTDCG(sample) {
    return sample.h2 + sample.ch4 + sample.c2h6 + sample.c2h4 + sample.c2h2 + sample.co;
}

function getTDCGCondition(tdcg) {
    if (tdcg <= 720) return "Condition 1";
    if (tdcg <= 1920) return "Condition 2";
    if (tdcg <= 4630) return "Condition 3";
    return "Condition 4";
}

function analyzeDoernenburg(sample) {
    if (sample.h2 === 0) {
        return {
            faultType: "Cannot calculate (H2 is zero)",
            ratios: null
        };
    }
    const ratios = {
        ratio1: sample.ch4 / sample.h2,
        ratio2: sample.c2h2 / sample.c2h4,
        ratio3: sample.c2h2 / sample.ch4,
        ratio4: sample.c2h6 / sample.c2h2
    };

    let faultType = "Inconclusive";

    if (ratios.ratio1 > 1 && ratios.ratio2 < 0.75 && ratios.ratio3 < 0.3 && ratios.ratio4 > 0.4) {
        faultType = "Thermal Decomposition";
    } else if (ratios.ratio1 < 0.1 && ratios.ratio2 < 0.75 && ratios.ratio3 < 0.3 && ratios.ratio4 > 0.4) {
        faultType = "Partial Discharge (Low Intensity)";
    } else if (ratios.ratio1 > 0.1 && ratios.ratio1 < 1 && ratios.ratio2 > 0.75 && ratios.ratio3 > 0.3 && ratios.ratio4 < 0.4) {
        faultType = "Arcing (High Intensity)";
    }

    return {
        faultType: faultType,
        ratios: ratios
    };
}

function analyzeRogers(sample) {
    if (sample.h2 === 0 || sample.c2h4 === 0 || sample.c2h6 === 0) {
        return {
            faultType: "Cannot calculate (division by zero)",
            ratios: null
        };
    }
    const ratios = {
        ratio1: sample.ch4 / sample.h2,
        ratio2: sample.c2h2 / sample.c2h4,
        ratio5: sample.c2h4 / sample.c2h6
    };

    let faultType = "Inconclusive";

    if (ratios.ratio2 < 0.1 && ratios.ratio1 > 0.1 && ratios.ratio1 < 1 && ratios.ratio5 < 1) {
        faultType = "Normal Aging";
    } else if (ratios.ratio2 < 0.1 && ratios.ratio1 < 0.1 && ratios.ratio5 < 1) {
        faultType = "Partial Discharge";
    } else if (ratios.ratio2 > 0.1 && ratios.ratio2 < 3 && ratios.ratio1 > 0.1 && ratios.ratio1 < 1 && ratios.ratio5 > 3) {
        faultType = "Arcing";
    } else if (ratios.ratio2 < 0.1 && ratios.ratio1 > 0.1 && ratios.ratio1 < 1 && ratios.ratio5 > 1 && ratios.ratio5 < 3) {
        faultType = "Thermal Fault (Low Temperature)";
    } else if (ratios.ratio2 < 0.1 && ratios.ratio1 > 1 && ratios.ratio5 > 1 && ratios.ratio5 < 3) {
        faultType = "Thermal Fault (300°C < t < 700°C)";
    } else if (ratios.ratio2 < 0.1 && ratios.ratio1 > 1 && ratios.ratio5 > 3) {
        faultType = "Thermal Fault (t > 700°C)";
    }

    return {
        faultType: faultType,
        ratios: ratios
    };
}

function analyzeDuval(sample) {
    const total = sample.ch4 + sample.c2h4 + sample.c2h2;
    const percentages = {
        ch4: (sample.ch4 / total) * 100,
        c2h4: (sample.c2h4 / total) * 100,
        c2h2: (sample.c2h2 / total) * 100
    };

    let faultType = "Inconclusive";

    if (percentages.c2h2 <= 4 && percentages.ch4 <= 87 && percentages.c2h4 > 13) {
        faultType = "T3 - Thermal fault (t > 700°C)";
    } else if (percentages.c2h2 <= 4 && percentages.ch4 > 87 && percentages.c2h4 <= 13) {
        faultType = "T2 - Thermal fault (300°C < t < 700°C)";
    } else if (percentages.c2h2 <= 4 && percentages.ch4 > 98 && percentages.c2h4 <= 2) {
        faultType = "T1 - Thermal fault (t < 300°C)";
    } else if (percentages.c2h2 > 13 && percentages.ch4 <= 87 && percentages.c2h4 <= 87) {
        faultType = "D2 - Discharge of high energy";
    } else if (percentages.c2h2 > 4 && percentages.c2h2 <= 13 && percentages.ch4 <= 87 && percentages.c2h4 <= 87) {
        faultType = "D1 - Discharge of low energy";
    } else if (percentages.c2h2 <= 4 && percentages.ch4 > 90 && percentages.c2h4 <= 10) {
        faultType = "PD - Partial Discharge";
    }

    return {
        faultType: faultType,
        percentages: percentages
    };
}

function analyzeIEC60599(sample) {
    const ratios = {
        ratio1: sample.ch4 / sample.h2,
        ratio2: sample.c2h2 / sample.c2h4,
        ratio3: sample.c2h4 / sample.c2h6
    };

    let faultType = "Normal Deterioration";

    if (ratios.ratio2 > 1 && ratios.ratio1 >= 0.1 && ratios.ratio1 <= 0.5 && ratios.ratio3 > 1) {
        faultType = "Discharges of high energy";
    } else if (ratios.ratio2 > 1 && ratios.ratio1 < 0.1 && ratios.ratio3 > 1) {
        faultType = "Discharges of low energy";
    } else if (ratios.ratio2 <= 0.1 && ratios.ratio1 >= 0.1 && ratios.ratio1 <= 1 && ratios.ratio3 > 1) {
        faultType = "Thermal fault T > 700°C";
    } else if (ratios.ratio2 <= 0.1 && ratios.ratio1 > 1 && ratios.ratio3 > 1) {
        faultType = "Thermal fault 300°C < T < 700°C";
    } else if (ratios.ratio2 <= 0.1 && ratios.ratio1 > 1 && ratios.ratio3 <= 1) {
        faultType = "Thermal fault T < 300°C";
    }

    return {
        faultType: faultType,
        ratios: ratios
    };
}

function analyzeIEEEC57104(sample) {
    const tdcg = sample.h2 + sample.ch4 + sample.c2h6 + sample.c2h4 + sample.c2h2 + sample.co + sample.co2;
    let condition = 1;

    if (tdcg <= 720) {
        condition = 1;
    } else if (tdcg <= 1920) {
        condition = 2;
    } else if (tdcg <= 4630) {
        condition = 3;
    } else {
        condition = 4;
    }

    return {
        condition: condition,
        tdcg: tdcg
    };
}

function analyzeDuvalPentagon(sample) {
    const total = sample.h2 + sample.ch4 + sample.c2h6 + sample.c2h4 + sample.c2h2;
    const percentages = {
        h2: (sample.h2 / total) * 100,
        ch4: (sample.ch4 / total) * 100,
        c2h6: (sample.c2h6 / total) * 100,
        c2h4: (sample.c2h4 / total) * 100,
        c2h2: (sample.c2h2 / total) * 100
    };

    // Simplified pentagon zone determination
    let faultType = "Undetermined";
    if (percentages.c2h2 > 40) {
        faultType = "D2: Discharges of high energy";
    } else if (percentages.h2 > 60) {
        faultType = "PD: Partial discharges";
    } else if (percentages.c2h4 > 50) {
        faultType = "T3: Thermal fault T > 700°C";
    } else if (percentages.ch4 > 50) {
        faultType = "T2: Thermal fault 300°C < T < 700°C";
    } else if (percentages.c2h6 > 40) {
        faultType = "T1: Thermal fault T < 300°C";
    }

    return {
        faultType: faultType,
        percentages: percentages
    };
}

function analyzeKeyGas(sample) {
    const totalGas = sample.h2 + sample.ch4 + sample.c2h6 + sample.c2h4 + sample.c2h2 + sample.co + sample.co2;
    const gasPercentages = {
        h2: (sample.h2 / totalGas) * 100,
        ch4: (sample.ch4 / totalGas) * 100,
        c2h6: (sample.c2h6 / totalGas) * 100,
        c2h4: (sample.c2h4 / totalGas) * 100,
        c2h2: (sample.c2h2 / totalGas) * 100,
        co: (sample.co / totalGas) * 100,
        co2: (sample.co2 / totalGas) * 100
    };

    let faultType = "Normal Aging";
    let keyGas = "";
    let percentage = 0;

    if (gasPercentages.c2h2 > 30) {
        faultType = "Arcing";
        keyGas = "C2H2";
        percentage = gasPercentages.c2h2;
    } else if (gasPercentages.h2 > 60) {
        faultType = "Partial Discharge";
        keyGas = "H2";
        percentage = gasPercentages.h2;
    } else if (gasPercentages.c2h4 > 50) {
        faultType = "Thermal Fault (High Temperature)";
        keyGas = "C2H4";
        percentage = gasPercentages.c2h4;
    } else if (gasPercentages.ch4 > 40) {
        faultType = "Thermal Fault (Low Temperature)";
        keyGas = "CH4";
        percentage = gasPercentages.ch4;
    } else if (gasPercentages.co > 70) {
        faultType = "Cellulose Insulation Breakdown";
        keyGas = "CO";
        percentage = gasPercentages.co;
    }

    return {
        faultType: faultType,
        keyGas: keyGas,
        percentage: percentage
    };
}

// Function to run all interpretation methods
function runAllInterpretations(sample) {
    return {
        doernenburg: analyzeDoernenburg(sample),
        rogers: analyzeRogers(sample),
        duval: analyzeDuval(sample),
        iec60599: analyzeIEC60599(sample),
        ieeeC57104: analyzeIEEEC57104(sample),
        duvalPentagon: analyzeDuvalPentagon(sample),
        keyGas: analyzeKeyGas(sample),
    };
}

// Helper function to calculate mean
function calculateMean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Helper function to calculate standard deviation
function calculateStandardDeviation(values) {
    const mean = calculateMean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

// Function to calculate the rate of change
function calculateRateOfChange(values, dates) {
    if (values.length < 2) return 0;
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    const timeDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25); // Convert to years
    return (lastValue - firstValue) / (firstValue * timeDiff);
}

// Function to detect significant changes
function detectSignificantChanges(values, dates, threshold = 2) {
    const mean = calculateMean(values);
    const stdDev = calculateStandardDeviation(values);
    const significantChanges = [];

    for (let i = 1; i < values.length; i++) {
        const diff = Math.abs(values[i] - values[i-1]);
        if (diff > threshold * stdDev) {
            significantChanges.push({
                date: dates[i],
                value: values[i],
                previousValue: values[i-1],
                percentageChange: ((values[i] - values[i-1]) / values[i-1]) * 100
            });
        }
    }

    return significantChanges;
}

// Function to predict future trend
function predictFutureTrend(values, dates, daysToPredict = 365) {
    const xValues = dates.map(date => new Date(date).getTime());
    const yValues = values;

    // Simple linear regression
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((total, x, i) => total + x * yValues[i], 0);
    const sumXX = xValues.reduce((total, x) => total + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastDate = new Date(dates[dates.length - 1]);
    const futureDate = new Date(lastDate.getTime() + daysToPredict * 24 * 60 * 60 * 1000);
    const predictedValue = slope * futureDate.getTime() + intercept;

    return {
        date: futureDate,
        value: predictedValue
    };
}

// Main function to perform trend analysis
function performTrendAnalysis(samples) {
    if (!samples || samples.length === 0) {
        throw new Error('No valid samples data available for trend analysis');
    }

    const gases = ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'];
    const results = {};

    gases.forEach(gas => {
        const values = samples.map(sample => sample[gas]);
        const dates = samples.map(sample => sample.date);

        if (values.some(isNaN) || dates.some(d => !d)) {
            throw new Error(`Invalid data for ${gas}`);
        }

        results[gas] = {
            mean: calculateMean(values),
            stdDev: calculateStandardDeviation(values),
            rateOfChange: calculateRateOfChange(values, dates),
            significantChanges: detectSignificantChanges(values, dates),
            futurePrediction: predictFutureTrend(values, dates)
        };
    });

    return results;
}

function createImprovedTrendCharts(samples, trendResults) {
    console.log('Starting createImprovedTrendCharts');
    const trendAnalysisDiv = document.getElementById('trendAnalysis');
    const feedbackDiv = document.getElementById('chartFeedback');
    if (!trendAnalysisDiv || !feedbackDiv) {
        console.error('Required divs not found');
        return;
    }

    trendAnalysisDiv.innerHTML = '<h3 class="text-xl font-semibold mb-4">Gas Concentration Trends</h3>';
    feedbackDiv.innerHTML = 'Creating combined gas trend chart...';

    const canvasId = 'combinedGasTrendChart';
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.height = 400;
    canvas.width = 800;
    trendAnalysisDiv.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    
    const gases = ['h2', 'ch4', 'c2h6', 'c2h4', 'c2h2', 'co', 'co2'];
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'brown', 'pink'];

    const datasets = gases.map((gas, index) => ({
        label: gas.toUpperCase(),
        data: samples.map(sample => ({x: new Date(sample.date), y: sample[gas]})),
        borderColor: colors[index],
        fill: false,
        yAxisID: (gas === 'co' || gas === 'co2') ? 'y1' : 'y'
    }));

    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            stacked: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Concentration (ppm) - H2, CH4, C2H6, C2H4, C2H2'
                    },
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Concentration (ppm) - CO, CO2'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            }
        }
    });

    // Add analysis summary below the chart
    const analysisSummary = document.createElement('div');
    analysisSummary.className = 'mt-4 mb-6 text-sm';
    let summaryHTML = '<h4 class="font-semibold">Analysis Summary:</h4>';
    
    gases.forEach(gas => {
        summaryHTML += `
            <p><strong>${gas.toUpperCase()}:</strong> 
            Mean: ${trendResults[gas].mean.toFixed(2)} ppm, 
            Rate of Change: ${(trendResults[gas].rateOfChange * 100).toFixed(2)}% per year, 
            Predicted Value (1 year): ${trendResults[gas].futurePrediction.value.toFixed(2)} ppm</p>
        `;
    });
    
    analysisSummary.innerHTML = summaryHTML;
    trendAnalysisDiv.appendChild(analysisSummary);

    console.log('Finished createImprovedTrendCharts');
    feedbackDiv.innerHTML = 'Combined gas trend chart created successfully.';
}

function updateTrendAnalysis() {
    console.log('Starting updateTrendAnalysis');
    const trendAnalysisDiv = document.getElementById('trendAnalysis');
    if (!trendAnalysisDiv) {
        console.error('Trend analysis div not found');
        return;
    }
    
    trendAnalysisDiv.innerHTML = '<p>Updating trend analysis...</p>';
    trendAnalysisDiv.classList.remove('hidden');
    
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        trendAnalysisDiv.innerHTML += '<p class="text-red-500">Error: Chart.js is not loaded. Please check your network connection and reload the page.</p>';
        return;
    }
    
    try {
        console.log('Samples data:', samples);
        const trendResults = performTrendAnalysis(samples);
        console.log('Trend analysis results:', trendResults);
        createImprovedTrendCharts(samples, trendResults);
    } catch (error) {
        console.error('Error updating trend analysis:', error);
        trendAnalysisDiv.innerHTML += `<p class="text-red-500">Error: ${error.message}</p>`;
    }
    console.log('Finished updateTrendAnalysis');
}