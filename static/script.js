let stringCount = 1;
let myChart;

function addString() {
    stringCount++;
    const newString = document.createElement('div');
    newString.className = 'string-input';
    newString.innerHTML = `
        <h3>String ${stringCount}</h3>
        <label for="voltage${stringCount}">Measured Voltage (V):</label>
        <input type="number" id="voltage${stringCount}" required min="0" step="0.1">

        <label for="current${stringCount}">Measured Current (A):</label>
        <input type="number" id="current${stringCount}" required min="0" step="0.1">
    `;
    document.getElementById('stringInputs').appendChild(newString);
}

function detectFaults() {
    const panelsPerString = parseInt(document.getElementById('panelsPerString').value);
    const nominalVoltage = parseFloat(document.getElementById('nominalVoltage').value);
    const nominalCurrent = parseFloat(document.getElementById('nominalCurrent').value);
    const irradiance = parseFloat(document.getElementById('irradiance').value);
    const temperature = parseFloat(document.getElementById('temperature').value);

    const expectedVoltage = panelsPerString * nominalVoltage * (1 - 0.004 * (temperature - 25));
    const expectedCurrent = nominalCurrent * (irradiance / 1000);

    let results = '';
    const voltages = [];
    const currents = [];

    for (let i = 1; i <= stringCount; i++) {
        const measuredVoltage = parseFloat(document.getElementById(`voltage${i}`).value);
        const measuredCurrent = parseFloat(document.getElementById(`current${i}`).value);

        voltages.push(measuredVoltage);
        currents.push(measuredCurrent);

        const voltageDiff = Math.abs(measuredVoltage - expectedVoltage) / expectedVoltage;
        const currentDiff = Math.abs(measuredCurrent - expectedCurrent) / expectedCurrent;

        results += `<h3>String ${i}</h3>`;
        if (voltageDiff > 0.1 && currentDiff > 0.1) {
            results += `<p style="color: red;">Major fault detected: Both voltage and current are significantly off.</p>`;
        } else if (voltageDiff > 0.1) {
            results += `<p style="color: orange;">Potential fault: Voltage is significantly off. Check for panel or connection issues.</p>`;
        } else if (currentDiff > 0.1) {
            results += `<p style="color: orange;">Potential fault: Current is significantly off. Check for shading or panel degradation.</p>`;
        } else {
            results += `<p style="color: green;">No significant issues detected.</p>`;
        }
        results += `<p>Voltage Difference: ${(voltageDiff * 100).toFixed(2)}%</p>`;
        results += `<p>Current Difference: ${(currentDiff * 100).toFixed(2)}%</p>`;
    }

    document.getElementById('result').innerHTML = results;
    updateChart(voltages, currents, expectedVoltage, expectedCurrent);
}

function updateChart(voltages, currents, expectedVoltage, expectedCurrent) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    if (myChart) {
        myChart.destroy();
    }
    
    myChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Measured Values',
                data: voltages.map((v, i) => ({x: v, y: currents[i]})),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }, {
                label: 'Expected Value',
                data: [{x: expectedVoltage, y: expectedCurrent}],
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Voltage (V)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Current (A)'
                    }
                }
            }
        }
    });
}