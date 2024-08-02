document.addEventListener('DOMContentLoaded', function() {
    let temperatureChart;
    let selectedFiles = [];
    let batchResults = [];
    let currentImageIndex = 0;

    const imageUpload = document.getElementById('imageUpload');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const fileCount = document.getElementById('fileCount');
    const fileList = document.getElementById('fileList');
    const progressBar = document.getElementById('progressBar');
    const resultsDiv = document.getElementById('results');
    const batchSummaryDiv = document.getElementById('batchSummary');
    const prevImageBtn = document.getElementById('prevImage');
    const nextImageBtn = document.getElementById('nextImage');
    const imageCounter = document.getElementById('imageCounter');
    const filterSelect = document.getElementById('filterSelect');
    const sortSelect = document.getElementById('sortSelect');
    const minTempInput = document.getElementById('minTemp');
    const maxTempInput = document.getElementById('maxTemp');

    if (imageUpload) imageUpload.addEventListener('change', updateFileList);
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeBatch);
    if (prevImageBtn) prevImageBtn.addEventListener('click', () => navigateImages(-1));
    if (nextImageBtn) nextImageBtn.addEventListener('click', () => navigateImages(1));
    if (filterSelect) filterSelect.addEventListener('change', () => displayResults(currentImageIndex));
    if (sortSelect) sortSelect.addEventListener('change', () => displayResults(currentImageIndex));

    function updateFileList() {
        if (!imageUpload || !fileCount || !fileList) return;
        selectedFiles = Array.from(imageUpload.files);
        fileCount.textContent = `${selectedFiles.length} file(s) selected`;
        fileList.innerHTML = selectedFiles.map(file => `<div>${file.name}</div>`).join('');
    }

    async function analyzeBatch() {
        if (selectedFiles.length === 0) {
            alert('Please select at least one image.');
            return;
        }
    
        if (analyzeBtn) analyzeBtn.disabled = true;
        if (progressBar) progressBar.classList.remove('hidden');
        if (resultsDiv) resultsDiv.classList.add('hidden');
        if (batchSummaryDiv) batchSummaryDiv.classList.add('hidden');
    
        batchResults = [];
        let errorCount = 0;
    
        try {
            const analysisPromises = selectedFiles.map(file => analyzeImage(file));
            const results = await Promise.all(analysisPromises);
    
            results.forEach((result, index) => {
                updateProgress(((index + 1) / selectedFiles.length) * 100);
                if (result.error) {
                    errorCount++;
                    console.error(`Error analyzing image ${selectedFiles[index].name}: ${result.error}`);
                    displayErrorMessage(selectedFiles[index].name, result.error);
                } else {
                    batchResults.push(result);
                }
            });
    
            if (batchResults.length > 0) {
                displayResults(0);
                displayBatchSummary(batchResults);
            }
            
            if (errorCount > 0) {
                alert(`Analysis completed with ${errorCount} error(s). Please check the console for details.`);
            }
        } catch (error) {
            console.error('Error during batch analysis:', error);
            alert('An error occurred during batch analysis. Please try again.');
        } finally {
            if (analyzeBtn) analyzeBtn.disabled = false;
            if (progressBar) progressBar.classList.add('hidden');
        }
    }
    
    function displayErrorMessage(fileName, errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
        errorDiv.innerHTML = `
            <strong class="font-bold">Error analyzing ${fileName}:</strong>
            <span class="block sm:inline">${errorMessage}</span>
        `;
        resultsDiv.appendChild(errorDiv);
    }
    
    // Make sure analyzeImage function returns a Promise
    async function analyzeImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('min_temp', document.getElementById('minTemp').value);
        formData.append('max_temp', document.getElementById('maxTemp').value);
    
        try {
            const response = await fetch('/analyze_thermal_image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                console.error('Raw response:', text);
                throw new Error('Failed to parse server response');
            }
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return { ...data, filename: file.name, originalImageUrl: URL.createObjectURL(file) };
        } catch (error) {
            console.error('Error:', error);
            return { 
                filename: file.name, 
                error: error.message, 
                hotspots: [],
                mean_temp: null,
                max_temp: null,
                min_temp: null,
                processed_image: null,
                temp_distribution: null
            };
        }
    }

    function updateProgress(percent) {
        if (!progressBar) return;
        const progressElement = progressBar.querySelector('div');
        if (progressElement) progressElement.style.width = `${percent}%`;
    }

    function displayResults(index) {
        if (!resultsDiv) return;
        currentImageIndex = index;
        const data = batchResults[index];
        if (!data) {
            console.error(`No data available for index ${index}`);
            return;
        }
        resultsDiv.classList.remove('hidden');
        
        const originalImage = document.getElementById('originalImage');
        const processedImage = document.getElementById('processedImage');
        if (originalImage) originalImage.src = data.originalImageUrl || '';
        if (processedImage && data.processed_image) {
            processedImage.src = `data:image/png;base64,${data.processed_image}`;
        } else if (processedImage) {
            processedImage.src = ''; // Clear the image if no processed image is available
        }
        if (imageCounter) imageCounter.textContent = `Image ${index + 1} of ${batchResults.length}`;
    
        const analysisResult = document.getElementById('analysisResult');
        if (analysisResult) {
            if (data.error) {
                analysisResult.innerHTML = `
                    <h3 class="text-lg font-semibold mb-2">Error analyzing ${data.filename || 'image'}:</h3>
                    <p class="text-red-600">${data.error}</p>
                `;
            } else {
                analysisResult.innerHTML = `
                    <h3 class="text-lg font-semibold mb-2">Analysis Results for ${data.filename || 'image'}:</h3>
                    <p>Number of significant hotspots detected: ${data.hotspots ? data.hotspots.length : 'N/A'}</p>
                    <p>Mean panel temperature: ${data.mean_temp !== undefined ? data.mean_temp.toFixed(2) + '°C' : 'N/A'}</p>
                    <p>Maximum temperature: ${data.max_temp !== undefined ? data.max_temp.toFixed(2) + '°C' : 'N/A'}</p>
                    <p>Minimum temperature: ${data.min_temp !== undefined ? data.min_temp.toFixed(2) + '°C' : 'N/A'}</p>
                `;
            }
        }
    
        if (data.temp_distribution) {
            displayTemperatureDistribution(data.temp_distribution);
        }
        if (data.hotspots) {
            displayHotspotDetails(data.hotspots);
        }
        displayRecommendations(data.hotspots || []);
    
        if (prevImageBtn) prevImageBtn.disabled = index === 0;
        if (nextImageBtn) nextImageBtn.disabled = index === batchResults.length - 1;
    }

    function navigateImages(direction) {
        const newIndex = currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < batchResults.length) {
            displayResults(newIndex);
        }
    }

    function displayTemperatureDistribution(distribution) {
        const canvas = document.getElementById('tempDistChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (temperatureChart) {
            temperatureChart.destroy();
        }

        const labels = distribution.bin_edges.slice(0, -1).map((edge, index) => {
            return `${edge.toFixed(1)}-${distribution.bin_edges[index + 1].toFixed(1)}°C`;
        });

        temperatureChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Temperature Distribution',
                    data: distribution.counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Temperature Range (°C)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Pixel Count'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Temperature Distribution'
                    }
                }
            }
        });
    }

    function displayHotspotDetails(hotspots) {
        const analysisResult = document.getElementById('analysisResult');
        if (!analysisResult) return;
        if (!Array.isArray(hotspots) || hotspots.length === 0) {
            analysisResult.innerHTML += '<p>No significant hotspots detected.</p>';
            return;
        }
    
        const filterValue = filterSelect ? filterSelect.value : 'all';
        const sortValue = sortSelect ? sortSelect.value : 'temp-desc';
    
        let filteredHotspots = hotspots.filter(hotspot => {
            if (filterValue === 'all') return true;
            return hotspot.severity === filterValue;
        });
    
        filteredHotspots.sort((a, b) => {
            if (sortValue === 'temp-desc') return (b.max_temp || 0) - (a.max_temp || 0);
            if (sortValue === 'temp-asc') return (a.max_temp || 0) - (b.max_temp || 0);
            if (sortValue === 'severity') {
                const severityOrder = { 'Major defect': 3, 'Minor defect': 2, 'No significant defect': 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            }
            if (sortValue === 'area-desc') return (b.area || 0) - (a.area || 0);
            return 0;
        });
    
        let hotspotHTML = '<h3 class="text-lg font-semibold mt-4 mb-2">Hotspot Details:</h3><ul>';
        filteredHotspots.forEach(hotspot => {
            const severityClass = getSeverityClass(hotspot.severity);
            hotspotHTML += `
                <li class="mb-4 p-4 bg-gray-100 rounded-lg">
                    <strong class="text-lg ${severityClass}">${hotspot.shape || 'Unknown'} (${hotspot.severity || 'Unknown'})</strong>
                    <ul class="mt-2">
                        <li>Location: (${hotspot.location ? hotspot.location[0] : 'N/A'}, ${hotspot.location ? hotspot.location[1] : 'N/A'})</li>
                        <li>Maximum Temperature: ${hotspot.max_temp ? hotspot.max_temp.toFixed(2) : 'N/A'}°C</li>
                        <li>Mean Temperature: ${hotspot.mean_temp ? hotspot.mean_temp.toFixed(2) : 'N/A'}°C</li>
                        <li>Temperature Difference: ${hotspot.delta_t ? hotspot.delta_t.toFixed(2) : 'N/A'}°C</li>
                        <li>Area: ${hotspot.area ? hotspot.area.toFixed(2) : 'N/A'} pixels</li>
                        <li>Fault Type: ${hotspot.fault_type || 'Unknown'}</li>
                    </ul>
                </li>
            `;
        });
        hotspotHTML += '</ul>';
        analysisResult.innerHTML += hotspotHTML;
    }
    
    function getSeverityClass(severity) {
        switch (severity) {
            case 'Major defect': return 'text-red-600 font-bold';
            case 'Minor defect': return 'text-yellow-600 font-semibold';
            default: return 'text-green-600';
        }
    }

    function displayRecommendations(hotspots) {
        const recommendations = document.getElementById('recommendations');
        if (!recommendations) return;
        let recommendationText = '<h3 class="text-lg font-semibold mb-2">Recommendations:</h3><ul>';

        const majorDefects = hotspots.filter(hotspot => hotspot.severity === "Major defect");
        const minorDefects = hotspots.filter(hotspot => hotspot.severity === "Minor defect");

        if (majorDefects.length > 0) {
            recommendationText += '<li class="text-red-600">Major defects detected. Immediate inspection and maintenance required:</li>';
            recommendationText += '<ul>';
            majorDefects.forEach(defect => {
                recommendationText += `<li>${defect.fault_type || 'Unknown issue'} at location (${defect.location[0]}, ${defect.location[1]})</li>`;
            });
            recommendationText += '</ul>';
        }

        if (minorDefects.length > 0) {
            recommendationText += '<li class="text-yellow-600">Minor defects detected. Schedule an inspection to identify potential issues:</li>';
            recommendationText += '<ul>';
            minorDefects.forEach(defect => {
                recommendationText += `<li>${defect.fault_type || 'Unknown issue'} at location (${defect.location[0]}, ${defect.location[1]})</li>`;
            });
            recommendationText += '</ul>';
        }

        if (majorDefects.length === 0 && minorDefects.length === 0) {
            recommendationText += '<li class="text-green-600">No significant defects detected. Continue regular maintenance.</li>';
        }

        recommendationText += '</ul>';
        recommendations.innerHTML = recommendationText;
    }

    function displayBatchSummary(results) {
        if (!batchSummaryDiv) return;
        batchSummaryDiv.classList.remove('hidden');

        const totalHotspots = results.reduce((sum, result) => sum + (result.hotspots ? result.hotspots.length : 0), 0);
        const avgTemp = results.reduce((sum, result) => sum + (result.mean_temp || 0), 0) / results.length;

        batchSummaryDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Batch Summary:</h3>
            <p>Total images processed: ${results.length}</p>
            <p>Total hotspots detected: ${totalHotspots}</p>
            <p>Average mean temperature: ${avgTemp.toFixed(2)}°C</p>
        `;
    }

    // Add basic validation for temperature inputs
    minTempInput.addEventListener('change', validateTemperatureInputs);
    maxTempInput.addEventListener('change', validateTemperatureInputs);

    function validateTemperatureInputs() {
        let minTemp = parseFloat(minTempInput.value);
        let maxTemp = parseFloat(maxTempInput.value);

        if (minTemp >= maxTemp) {
            alert('Minimum temperature must be less than maximum temperature');
            minTempInput.value = Math.min(minTemp, maxTemp - 1);
            maxTempInput.value = Math.max(maxTemp, minTemp + 1);
        }
    }
});