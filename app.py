from flask import Flask, render_template, request, jsonify
from werkzeug.exceptions import BadRequest
from scipy import ndimage
from scipy.ndimage import gaussian_filter
from scipy.optimize import curve_fit
from scipy.optimize import differential_evolution
from skimage import measure
from skimage.measure import label, regionprops
from skimage.morphology import remove_small_objects
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
from statsmodels.tsa.arima.model import ARIMA
from flask_cors import CORS
from sklearn.cluster import DBSCAN
import calendar
import cv2
import base64
import pandas as pd
import numpy as np
import math
import json
import traceback
import logging
import sys
import os
import warnings
from datetime import datetime

app = Flask(__name__)
CORS(app)

app_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(app_dir, 'data', 'LTF 2024 - For Coding.csv')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/pr_calculator', methods=['GET', 'POST'])
def pr_calculator():
    if request.method == 'POST':
        try:
            # Log all received data
            app.logger.info(f"Received data: {request.form}")

            # Define required fields
            required_fields = ['measured_energy', 'installed_capacity', 'avg_irradiance', 'temperature', 'time_period']

            # Check for missing required fields
            missing_fields = [field for field in required_fields if field not in request.form]
            if missing_fields:
                raise KeyError(f"Missing required fields: {', '.join(missing_fields)}")

            # Extract and validate data from form
            measured_energy = float(request.form['measured_energy'])
            installed_capacity = float(request.form['installed_capacity'])
            avg_irradiance = float(request.form['avg_irradiance'])
            temperature = float(request.form['temperature'])
            time_period = float(request.form['time_period'])  # in hours
            
            # Validate input values
            for field, value in zip(required_fields, [measured_energy, installed_capacity, avg_irradiance, time_period]):
                if value <= 0:
                    raise ValueError(f"Invalid value for {field}. Must be a positive number.")

            # Get custom temperature coefficient and reference, or use defaults
            temperature_coefficient = float(request.form.get('temperature_coefficient', -0.0041))
            temperature_reference = float(request.form.get('temperature_reference', 25))
            
            # Get and validate benchmark
            benchmark = float(request.form.get('benchmark', 0))
            if benchmark < 0 or benchmark > 100:
                raise ValueError("Benchmark PR must be between 0 and 100.")
            
            # Constants
            stc_irradiance = 1000  # W/m²
            
            # Calculate temperature correction factor
            temp_correction = 1 + temperature_coefficient * (temperature - temperature_reference)
            
            # Calculate reference yield
            reference_yield = (avg_irradiance * time_period) / stc_irradiance
            
            # Calculate temperature-corrected installed capacity
            corrected_capacity = installed_capacity * temp_correction
            
            # Calculate theoretical energy
            theoretical_energy = corrected_capacity * reference_yield
            
            # Calculate Performance Ratio
            pr = (measured_energy / theoretical_energy) * 100
            
            result = {
                'performance_ratio': pr,
                'reference_yield': reference_yield,
                'temperature_correction': temp_correction,
                'theoretical_energy': theoretical_energy,
                'measured_energy': measured_energy,
                'installed_capacity': installed_capacity,
                'temperature_coefficient': temperature_coefficient,
                'temperature_reference': temperature_reference
            }

            # Add benchmark comparison
            if benchmark > 0:
                difference = pr - benchmark
                result['benchmark_comparison'] = {
                    'benchmark': benchmark,
                    'difference': difference,
                    'status': 'above' if difference >= 0 else 'below'
                }

            app.logger.info(f"Calculation result: {result}")
            return jsonify(result)

        except KeyError as ke:
            error_msg = f"Missing required field(s): {str(ke)}"
            app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 400
        except ValueError as ve:
            error_msg = f"Invalid input: {str(ve)}"
            app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 400
        except Exception as e:
            error_msg = f"An unexpected error occurred: {str(e)}"
            app.logger.error(f"Unexpected error in PR calculation: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': error_msg}), 500

    return render_template('pr_calculator.html')

@app.route('/energy_yield_forecaster', methods=['GET', 'POST'])
def energy_yield_forecaster():
    if request.method == 'POST':
        try:
            # Extract and validate input data
            installed_capacity = float(request.form['installedCapacity'])
            insolation = float(request.form['insolation'])
            efficiency = float(request.form['efficiency']) / 100  # Convert percentage to decimal
            losses = float(request.form['losses']) / 100  # Convert percentage to decimal
            seasonality = float(request.form['seasonality'])

            # Validate input ranges
            if not (0 < installed_capacity <= 1000000):
                raise ValueError("Installed capacity must be between 0 and 1000000 kWp")
            if not (0 < insolation <= 10):
                raise ValueError("Daily insolation must be between 0 and 10 kWh/m²/day")
            if not (0 < efficiency <= 1):
                raise ValueError("System efficiency must be between 0% & 100%")
            if not (0 <= losses < 1):
                raise ValueError("Expected losses must be between 0% & 100%")
            if not (0.5 <= seasonality <= 1.5):
                raise ValueError("Seasonality factor must be between 0.5 and 1.5")

            # Calculate energy yield
            daily_yield = installed_capacity * insolation * efficiency * (1 - losses) * seasonality
            monthly_yield = daily_yield * 30  # Assuming 30 days per month for simplicity

            # Calculate yearly yields for each month
            months = list(calendar.month_abbr)[1:]  # Get month abbreviations
            yearly_yields = [monthly_yield * (1 + (i - 6) * 0.02) for i in range(12)]  # Simple yearly variation

            return jsonify({
                'daily_yield': daily_yield,
                'monthly_yield': monthly_yield,
                'months': months,
                'yearly_yields': yearly_yields
            })

        except KeyError as e:
            return jsonify({'error': f"Missing required field: {str(e)}"}), 400
        except ValueError as e:
            return jsonify({'error': f"Invalid input: {str(e)}"}), 400
        except BadRequest as e:
            return jsonify({'error': f"Bad request: {str(e)}"}), 400
        except Exception as e:
            app.logger.error(f"Unexpected error in energy_yield_forecaster: {str(e)}")
            return jsonify({'error': "An unexpected error occurred. Please try again later."}), 500

    return render_template('energy_yield_forecaster.html')

@app.route('/string_fault_detector')
def string_fault_detector():
    return render_template('string_fault_detector.html')

@app.route('/iv_curve_analyzer')
def iv_curve_analyzer():
    return render_template('iv_curve_analyzer.html')

@app.route('/api/analyze_iv_curve', methods=['POST'])
def analyze_iv_curve():
    try:
        data = request.json
        app.logger.info(f"Received data: {data}")
        
        curves = data['curves']
        irradiance = float(data['irradiance'])
        temperature = float(data['temperature'])
        
        results = []
        for curve in curves:
            result = analyze_single_curve(curve, irradiance, temperature)
            results.append(result)
        
        app.logger.info(f"Analysis results: {results}")
        return jsonify(results)
    except Exception as e:
        app.logger.error(f"Error in analyze_iv_curve: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify([{'error': str(e)}]), 500
    
def analyze_single_curve(curve, irradiance, temperature):
    try:
        # Input validation
        if not isinstance(curve, dict):
            raise ValueError("Input 'curve' must be a dictionary")
        
        required_keys = ['measurements', 'voc', 'isc', 'pmax']
        for key in required_keys:
            if key not in curve:
                raise KeyError(f"Missing required key in curve data: {key}")
        
        measurements = np.array(curve['measurements'])
        if measurements.size == 0:
            raise ValueError("Measurements array is empty")
        
        # Reshape measurements if necessary
        if measurements.ndim == 1:
            if measurements.size % 2 != 0:
                raise ValueError("1D measurements array must have even number of elements")
            measurements = measurements.reshape(-1, 2)
        elif measurements.ndim != 2 or measurements.shape[1] != 2:
            raise ValueError("Measurements must be a 2D array with shape (n, 2)")
        
        voltage = measurements[:, 0]
        current = measurements[:, 1]
        
        print(f"Original measurements: {list(zip(voltage, current))}")
        
        # Remove any measurements where voltage or current is zero or negative
        valid_measurements = [(v, i) for v, i in zip(voltage, current) if v > 0 and i > 0]
        if not valid_measurements:
            raise ValueError("No valid measurements after filtering zero or negative values")
        
        voltage, current = zip(*valid_measurements)
        voltage = np.array(voltage)
        current = np.array(current)
        
        print(f"Filtered measurements: {list(zip(voltage, current))}")
        
        # Validate other curve parameters
        voc = float(curve['voc'])
        isc = float(curve['isc'])
        pmax = float(curve['pmax'])
        
        if voc <= 0 or isc <= 0 or pmax <= 0:
            raise ValueError("Voc, Isc, and Pmax must be positive")
        
        # Perform analysis
        try:
            fitted_params = fit_single_diode_model(voltage, current)
        except Exception as e:
            print(f"Fitting failed: {str(e)}. Using initial guesses.")
            fitted_params = {'I_L': np.max(current), 'I_0': 1e-9, 'R_s': 0.1, 'R_sh': 1000, 'n': 1.5}

        print(f"Fitted parameters: {fitted_params}")
        
        key_params = extract_key_parameters(voltage, current, voc, isc, pmax)
        print(f"Key parameters: {key_params}")
        
        ideal_curve = generate_tailored_iv_curve(voc, isc, key_params['Vmpp'], key_params['Impp'])
        print(f"Ideal curve generated with {len(ideal_curve)} points")
        
        corrected_curve = correct_iv_curve(voltage, current, irradiance, temperature)
        print(f"Corrected curve generated with {len(corrected_curve)} points")
        
        faults = detect_faults(key_params, ideal_curve, fitted_params)
        print(f"Detected faults: {faults}")
        
        irradiance_curves = generate_iv_curves_for_irradiances(voc, isc, key_params['Vmpp'], key_params['Impp'])
        print(f"Generated {len(irradiance_curves)} irradiance curves")
        
        return {
            'fitted_params': fitted_params,
            'key_params': key_params,
            'ideal_curve': ideal_curve,
            'corrected_curve': corrected_curve.tolist(),
            'faults': faults,
            'irradiance_curves': [{'irradiance': irr, 'curve': crv} for irr, crv in irradiance_curves]
        }
    
    except Exception as e:
        print(f"Error in analyze_single_curve: {str(e)}")
        traceback.print_exc()
        return {'error': f"Failed to analyze curve: {str(e)}"}

def single_diode_model(V, I, I_L, I_0, R_s, R_sh, n):
    k = 1.380649e-23  # Boltzmann constant
    q = 1.602176634e-19  # Elementary charge
    T = 298.15  # Temperature in Kelvin (25°C)
    V_t = k * T / q  # Thermal voltage
    
    # Add small epsilon to prevent division by zero
    V_t = np.maximum(V_t, 1e-10)
    R_sh = np.maximum(R_sh, 1e-10)
    n = np.maximum(n, 1e-10)
    
    # Use np.clip to prevent overflow
    exp_term = np.exp(np.clip((V + I * R_s) / (n * V_t), -700, 700))
    
    with np.errstate(all='ignore'):
        result = I_L - I_0 * (exp_term - 1) - (V + I * R_s) / R_sh
    
    return np.clip(result, 0, I_L)  # Ensure current is between 0 and I_L

def single_diode_objective(params, voltage, current):
    I_L, I_0, R_s, R_sh, n = params
    predicted = single_diode_model(voltage, current, I_L, I_0, R_s, R_sh, n)
    residuals = current - predicted
    return np.sum(np.abs(residuals))  # Use absolute error instead of squared error

def fit_single_diode_model(voltage, current):
    bounds = [(0, np.max(current)*1.2), (1e-12, 1e-6), (0, 10), (1, 1e6), (1, 2)]
    result = differential_evolution(
        lambda x: single_diode_objective(x, voltage, current),
        bounds,
        maxiter=2000,
        popsize=30,
        tol=1e-4,
        mutation=(0.5, 1.5),
        recombination=0.7,
        updating='deferred',
        workers=1  # Use single-threaded mode to avoid pickling issues
    )

    if result.success:
        fitted_params = dict(zip(['I_L', 'I_0', 'R_s', 'R_sh', 'n'], result.x))
        print(f"Fitting successful. Fitted parameters: {fitted_params}")
        return fitted_params
    else:
        print(f"Warning: Fitting failed. Using initial guesses. Message: {result.message}")
        return {'I_L': np.max(current), 'I_0': 1e-9, 'R_s': 0.1, 'R_sh': 1000, 'n': 1.5}

def extract_key_parameters(voltage, current, Voc, Isc, Pmax):
    power = voltage * current
    max_power_index = np.argmax(power)
    Vmpp = voltage[max_power_index]
    Impp = current[max_power_index]
    FF = (Vmpp * Impp) / (Voc * Isc)
    efficiency = (Pmax / (1000 * 1.6)) * 100  # Assuming 1000 W/m² irradiance and 1.6 m² panel area

    return {
        'Voc': Voc,
        'Isc': Isc,
        'Vmpp': Vmpp,
        'Impp': Impp,
        'Pmax': Pmax,
        'FF': FF,
        'efficiency': efficiency
    }

def generate_tailored_iv_curve(Voc, Isc, Vmp, Imp, num_points=100):
    V = np.linspace(0, Voc, num_points)
    knee_factor = Vmp / Voc
    
    I = np.zeros_like(V)
    for i, v in enumerate(V):
        if v <= Vmp:
            I[i] = Isc - (Isc - Imp) * (v / Vmp) ** 0.2
        else:
            I[i] = Imp * ((Voc - v) / (Voc - Vmp)) ** 3
    
    I = np.maximum(I, 0)
    I[-1] = 0
    
    return list(zip(V.tolist(), I.tolist()))

def generate_iv_curves_for_irradiances(Voc, Isc, Vmp, Imp, irradiances=[200, 400, 600, 800, 1000]):
    base_irradiance = 1000  # W/m^2
    curves = []
    
    for irradiance in irradiances:
        factor = irradiance / base_irradiance
        scaled_Isc = Isc * factor
        scaled_Imp = Imp * factor
        # Voc changes logarithmically with irradiance, but the effect is small
        scaled_Voc = Voc + 0.0257 * np.log(factor)  # Approximate Voc adjustment
        scaled_Vmp = Vmp + 0.0257 * np.log(factor)  # Approximate Vmp adjustment
        
        curve = generate_tailored_iv_curve(scaled_Voc, scaled_Isc, scaled_Vmp, scaled_Imp)
        curves.append((irradiance, curve))
    
    return curves

def correct_iv_curve(voltage, current, G, T, G_STC=1000, T_STC=25):
    alpha = 0.04  # Current temperature coefficient (%/°C)
    beta = -0.3   # Voltage temperature coefficient (%/°C)
    Rs = 0.5      # Series resistance (Ω)
    k = 0.0004    # Curve correction factor

    I_STC = current * (G_STC / G)
    V_STC = (voltage + 
             voltage * (beta / 100) * (T_STC - T) + 
             Rs * (I_STC - current) + 
             k * I_STC * (T_STC - T))
    
    return np.column_stack((V_STC, I_STC))

def detect_faults(params, ideal_curve, fitted_params):
    faults = []
    
    if params['Voc'] < ideal_curve[-1][0] * 0.9:
        faults.append("Low open circuit voltage - possible cell damage or connection issues")
    if params['Isc'] < ideal_curve[0][1] * 0.9:
        faults.append("Low short circuit current - possible shading or soiling issues")
    if params['FF'] < 0.7:
        faults.append("Low fill factor - possible degradation or mismatch issues")
    if params['efficiency'] < 15:
        faults.append("Low efficiency - possible overall degradation or system issues")
    if fitted_params['R_s'] > 1:
        faults.append("High series resistance detected - possible connection issues or degradation")
    
    return faults

@app.route('/solar_panel_degradation_analyzer')
def solar_panel_degradation_analyzer():
    return render_template('solar_panel_degradation_analyzer.html')

@app.route('/weather_impact_predictor')
def weather_impact_predictor():
    return render_template('weather_impact_predictor.html')

@app.route('/financial_performance_calculator')
def financial_performance_calculator():
    return render_template('financial_performance_calculator.html')

# Thermal Imaging Code

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)
    
def numpy_to_python(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: numpy_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [numpy_to_python(item) for item in obj]
    return obj

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def analyze_thermal_image(image, metadata):
    try:
        logger.debug(f"Starting image analysis. Image shape: {image.shape}")
        logger.debug(f"Metadata: {metadata}")
        
        # Convert image to grayscale if it's not already
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Enhance contrast using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # Noise reduction
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Temperature calibration
        min_temp = float(metadata.get('min_temp', 20))
        max_temp = float(metadata.get('max_temp', 100))
        
        # Normalize the image to 0-1 range
        normalized = cv2.normalize(denoised, None, 0, 1, cv2.NORM_MINMAX, dtype=cv2.CV_32F)
        
        # Panel detection
        try:
            panel_mask = detect_panel(normalized)
        except Exception as e:
            logger.error(f"Error in panel detection: {str(e)}")
            panel_mask = np.ones(normalized.shape, dtype=np.uint8)
        
        # Temperature mapping
        calibrated = map_temperatures(normalized, min_temp, max_temp)
        
        # Apply the mask to the calibrated image
        calibrated_masked = cv2.bitwise_and(calibrated, calibrated, mask=panel_mask)
        
        # Calculate image statistics on the panel area
        mean_panel_temp = np.mean(calibrated_masked[panel_mask > 0])
        std_panel_temp = np.std(calibrated_masked[panel_mask > 0])
        
        logger.debug(f"Panel temperature statistics: mean={mean_panel_temp}, std={std_panel_temp}")
        
        # Hotspot detection
        hotspots = detect_hotspots(calibrated_masked, panel_mask, mean_panel_temp, std_panel_temp)
        
        # Create visual output
        color_mapped = create_visual_output(calibrated_masked, hotspots, panel_mask)
        
        # Encode processed image
        _, buffer = cv2.imencode('.png', color_mapped)
        processed_image = base64.b64encode(buffer).decode('utf-8')
        
        # Calculate temperature distribution
        temp_distribution = calculate_temperature_distribution(calibrated_masked[panel_mask > 0], min_temp, max_temp)
        
        # Interpret results
        interpreted_results = interpret_results(hotspots, mean_panel_temp, std_panel_temp)
        
        logger.debug("Image analysis completed successfully")
        
        results = {
            'hotspots': interpreted_results,
            'mean_temp': float(mean_panel_temp),
            'max_temp': float(np.max(calibrated_masked)),
            'min_temp': float(np.min(calibrated_masked[panel_mask > 0])),
            'processed_image': processed_image,
            'temp_distribution': temp_distribution
        }
        
        # Convert NumPy types to Python native types
        results = numpy_to_python(results)
        
        return results
    except Exception as e:
        logger.error(f"Error in analyze_thermal_image: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a fallback result
        return {
            'error': str(e),
            'hotspots': [],
            'mean_temp': None,
            'max_temp': None,
            'min_temp': None,
            'processed_image': None,
            'temp_distribution': None
        }

def map_temperatures(normalized_image, min_temp, max_temp):
    return normalized_image * (max_temp - min_temp) + min_temp

def detect_panel(image):
    # Convert the image to 8-bit unsigned integer
    if image.dtype != np.uint8:
        image = (image * 255).astype(np.uint8)
    
    # Otsu's thresholding
    _, thresh = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Morphological operations to clean up the mask
    kernel = np.ones((5,5), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
    
    # Find the largest contour (assuming it's the panel)
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return np.ones(image.shape, dtype=np.uint8)
    panel_contour = max(contours, key=cv2.contourArea)
    
    # Create a mask for the panel
    mask = np.zeros(image.shape, dtype=np.uint8)
    cv2.drawContours(mask, [panel_contour], 0, 255, -1)
    
    return mask

def adaptive_temperature_mapping(normalized_image, min_temp, max_temp):
    # Calculate image statistics
    mean_temp = np.mean(normalized_image)
    std_temp = np.std(normalized_image)
    
    # Adaptive temperature mapping
    calibrated = np.clip((normalized_image - (mean_temp - 2*std_temp)) / (4*std_temp), 0, 1)
    calibrated = calibrated * (max_temp - min_temp) + min_temp
    
    return calibrated

def perform_pre_analysis_checks(image, metadata):
    checks = []
    
    # Check image dimensions
    if image.shape[0] < 100 or image.shape[1] < 100:
        checks.append("Image dimensions are too small")
    
    # Check if image is color or grayscale
    if len(image.shape) != 3 or image.shape[2] != 3:
        checks.append("Image is not in color format (3 channels)")
    
    # Check for uniform/blank images
    if np.std(image) < 5:
        checks.append("Image appears to be mostly uniform or blank")
    
    # Check metadata
    if 'min_temp' not in metadata or 'max_temp' not in metadata:
        checks.append("Missing temperature range in metadata")
    else:
        min_temp = float(metadata['min_temp'])
        max_temp = float(metadata['max_temp'])
        if min_temp >= max_temp:
            checks.append("Invalid temperature range: min_temp should be less than max_temp")
    
    # Check for overexposure
    if np.mean(image) > 240:
        checks.append("Image appears to be overexposed")
    
    # Check for underexposure
    if np.mean(image) < 15:
        checks.append("Image appears to be underexposed")
    
    return checks

def detect_hotspots(calibrated_image, panel_mask, mean_temp, std_temp):
    # Define anomaly threshold dynamically
    threshold = mean_temp + 2 * std_temp
    
    # Create anomaly mask
    anomaly_mask = (calibrated_image > threshold) & (panel_mask > 0)
    
    # Label connected components
    labeled, num_features = ndimage.label(anomaly_mask)
    
    hotspots = []
    for i in range(1, num_features + 1):
        region = (labeled == i)
        area = np.sum(region)
        if area < 5:  # Filter out very small regions
            continue
        
        y, x = ndimage.center_of_mass(region)
        max_temp = np.max(calibrated_image[region])
        mean_temp_region = np.mean(calibrated_image[region])
        
        hotspots.append({
            'location': (int(x), int(y)),
            'max_temp': float(max_temp),
            'mean_temp': float(mean_temp_region),
            'delta_t': float(max_temp - mean_temp),
            'area': float(area),
        })
    
    return hotspots

def create_visual_output(calibrated_image, hotspots, panel_mask):
    # Create color-mapped image
    min_temp, max_temp = np.min(calibrated_image), np.max(calibrated_image)
    normalized = (calibrated_image - min_temp) / (max_temp - min_temp)
    color_mapped = cv2.applyColorMap((normalized * 255).astype(np.uint8), cv2.COLORMAP_JET)
    
    # Apply panel mask
    color_mapped = cv2.bitwise_and(color_mapped, color_mapped, mask=panel_mask)
    
    # Draw panel contour
    contours, _ = cv2.findContours(panel_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(color_mapped, contours, 0, (255, 255, 255), 2)
    
    # Draw hotspots
    for hotspot in hotspots:
        cv2.circle(color_mapped, hotspot['location'], 5, (0, 255, 0), -1)
        cv2.putText(color_mapped, f"{hotspot['max_temp']:.1f}deg.C", 
                    (hotspot['location'][0] + 10, hotspot['location'][1]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    
    return color_mapped

def calculate_temperature_distribution(temperatures, min_temp, max_temp):
    hist, bin_edges = np.histogram(temperatures, bins=20, range=(min_temp, max_temp))
    return {
        'counts': hist.tolist(),
        'bin_edges': bin_edges.tolist()
    }

def interpret_results(hotspots, mean_panel_temp, std_panel_temp):
    interpreted_results = []
    for hotspot in hotspots:
        delta_t = hotspot['delta_t']
        area = hotspot['area']
        
        # Determine severity
        if delta_t > 3 * std_panel_temp:
            severity = "Major defect"
        elif delta_t > 2 * std_panel_temp:
            severity = "Minor defect"
        else:
            severity = "No significant defect"
        
        # Determine shape
        if area > 100:
            shape = "Large area"
        elif 20 < area <= 100:
            shape = "Medium area"
        else:
            shape = "Small area"
        
        # Identify potential fault types
        if delta_t > 4 * std_panel_temp and area > 100:
            fault_type = "Potential severe cell damage or interconnection issue"
        elif delta_t > 3 * std_panel_temp:
            fault_type = "Potential cell damage or significant mismatch"
        elif delta_t > 2 * std_panel_temp:
            fault_type = "Potential minor cell damage or mismatch"
        else:
            fault_type = "No significant fault detected"
        
        interpreted_results.append({
            'location': hotspot['location'],
            'max_temp': hotspot['max_temp'],
            'mean_temp': hotspot['mean_temp'],
            'delta_t': delta_t,
            'area': area,
            'severity': severity,
            'shape': shape,
            'fault_type': fault_type
        })
    
    return interpreted_results

def generate_iec_report(hotspots, mean_temp, calibrated):
    report = []
    for i, hotspot in enumerate(hotspots):
        delta_t = hotspot['max_temp'] - mean_temp
        if delta_t > 30:
            severity = "Major defect"
        elif delta_t > 10:
            severity = "Minor defect"
        else:
            severity = "No significant defect"
        
        report.append({
            'id': i + 1,
            'location': [float(x) for x in hotspot['location']],
            'max_temp': float(hotspot['max_temp']),
            'delta_t': float(delta_t),
            'severity': severity,
            'size': int(hotspot['size'])
        })
    
    return report

def analyze_thermal_image_route():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    metadata = request.form.to_dict()
    
    try:
        logger.debug(f"Received file: {file.filename}, Content-Type: {file.content_type}")
        logger.debug(f"Metadata: {metadata}")
        
        file_bytes = file.read()
        logger.debug(f"File size: {len(file_bytes)} bytes")
        
        nparr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        logger.debug(f"Image shape: {image.shape}")
        
        results = analyze_thermal_image(image, metadata)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/thermal_imaging_interpreter', methods=['GET', 'POST'])
def thermal_imaging_interpreter():
    if request.method == 'POST':
        # Handle POST request (file upload and analysis)
        return analyze_thermal_image_route()
    else:
        # Handle GET request (render the page)
        return render_template('thermal_imaging_interpreter.html')

@app.route('/analyze_thermal_image', methods=['POST'])
def analyze_thermal_image_route():
    if 'image' not in request.files:
        logger.error("No image provided in the request")
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    metadata = request.form.to_dict()
    
    try:
        logger.debug(f"Received file: {file.filename}, Content-Type: {file.content_type}")
        logger.debug(f"Metadata: {metadata}")
        
        file_bytes = file.read()
        logger.debug(f"File size: {len(file_bytes)} bytes")
        
        nparr = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        logger.debug(f"Image shape: {image.shape}")
        
        # Perform pre-analysis checks
        checks = perform_pre_analysis_checks(image, metadata)
        if checks:
            logger.warning(f"Pre-analysis checks failed: {', '.join(checks)}")
            return jsonify({'error': 'Pre-analysis checks failed', 'checks': checks}), 400
        
        results = analyze_thermal_image_with_fallbacks(image, metadata)
        return json.dumps(results, cls=NumpyEncoder), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        error_info = {
            'error': str(e),
            'traceback': traceback.format_exc(),
            'python_version': str(sys.version),
            'opencv_version': str(cv2.__version__),
            'numpy_version': str(np.__version__)
        }
        logger.error(f"Detailed error info: {error_info}")
        return json.dumps(error_info, cls=NumpyEncoder), 500, {'Content-Type': 'application/json'}
    
def fallback_panel_detection(image):
    # Simple fallback: assume the entire image is the panel
    return np.ones(image.shape[:2], dtype=np.uint8) * 255

def fallback_hotspot_detection(calibrated_image):
    # Simple fallback: detect areas above the 95th percentile as hotspots
    threshold = np.percentile(calibrated_image, 95)
    hotspots = np.where(calibrated_image > threshold)
    return [{'location': (x, y), 'max_temp': calibrated_image[y, x]} for y, x in zip(*hotspots)]

def analyze_thermal_image_with_fallbacks(image, metadata):
    try:
        return analyze_thermal_image(image, metadata)
    except Exception as e:
        logger.error(f"Error in main analysis, attempting fallback: {str(e)}")
        
        # Convert image to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Normalize the image
        normalized = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
        
        # Fallback panel detection
        panel_mask = fallback_panel_detection(normalized)
        
        # Simple temperature mapping
        min_temp = float(metadata.get('min_temp', 20))
        max_temp = float(metadata.get('max_temp', 100))
        calibrated = (normalized - normalized.min()) / (normalized.max() - normalized.min()) * (max_temp - min_temp) + min_temp
        
        # Fallback hotspot detection
        hotspots = fallback_hotspot_detection(calibrated)
        
        # Create a simple visual output
        color_mapped = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)
        
        # Encode processed image
        _, buffer = cv2.imencode('.png', color_mapped)
        processed_image = base64.b64encode(buffer).decode('utf-8')
        
        return {
            'hotspots': hotspots,
            'mean_temp': float(np.mean(calibrated)),
            'max_temp': float(np.max(calibrated)),
            'min_temp': float(np.min(calibrated)),
            'processed_image': processed_image,
            'temp_distribution': calculate_temperature_distribution(calibrated, min_temp, max_temp),
            'fallback_used': True
        }


#end of thermal imaging

@app.route('/fault_diagnosis')
def fault_diagnosis():
    return render_template('fault_diagnosis.html')

@app.route('/dga_analyzer')
def dga_analyzer():
    return render_template('dga_analyzer.html')

@app.route('/generic_financial')
def generic_financial():
    return render_template('generic_financial.html')

@app.route('/reliability_reporting')
def reliability_reporting():
    return render_template('reliability_reporting.html')

#Generation Forecaster
@app.route('/generation_forecaster')
def generation_forecaster():
    return render_template('generation_forecaster.html')

@app.route('/generate_forecast', methods=['POST'])
def generate_forecast():
    try:
        app.logger.info("Starting generate_forecast function")
        
        # Load and preprocess the data
        df = pd.read_csv(csv_path)
        df['Month'] = pd.to_datetime(df['Month'], format='%B %Y')
        df['Year'] = df['Month'].dt.year
        df['MonthNum'] = df['Month'].dt.month
        
        # Handle missing values and convert to float
        df['Expected Generation'] = df['Expected Generation'].str.replace(',', '').astype(float)
        df['Actual Generation'] = df['Actual Generation'].str.replace(',', '').astype(float)
        
        # Remove rows where Actual Generation is NaN (future months)
        df_train = df.dropna(subset=['Actual Generation'])
        
        # Create a custom ordinal encoding for Rainfall Category
        rainfall_order = {
            'Way Below Normal': 0,
            'Below Normal': 1,
            'Near Normal': 2,
            'Above Normal': 3
        }
        df_train['Rainfall Ordinal'] = df_train['Rainfall Category'].map(rainfall_order)
        
        # Prepare features and target
        X = df_train[['Year', 'MonthNum', 'Rainfall Ordinal', 'Expected Generation']]
        y = df_train['Actual Generation']
        
        # Train Random Forest model
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(X, y)
        
        # Train XGBoost model
        xgb_model = XGBRegressor(n_estimators=100, random_state=42)
        xgb_model.fit(X, y)
        
        # Train ARIMA model
        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore")
                arima_model = ARIMA(y, order=(1, 1, 1))
                arima_results = arima_model.fit()
        except Exception as e:
            app.logger.error(f"ARIMA model fitting failed: {str(e)}")
            arima_results = None
        
        # Get user inputs
        start_date = pd.to_datetime(request.form['startDate'])
        forecast_months = int(request.form['forecastMonths'])
        
        # Prepare forecast data
        forecast_data = []
        for i in range(forecast_months):
            forecast_date = start_date + pd.DateOffset(months=i)
            rainfall_category = request.form.get(f'rainfall-{i}')
            if rainfall_category is None:
                raise ValueError(f"Missing rainfall category for month {i}")
            
            historical_month = df[(df['Month'].dt.month == forecast_date.month) & (df['Rainfall Category'] == rainfall_category)]
            if historical_month.empty:
                expected_generation = df_train['Expected Generation'].mean()
            else:
                expected_generation = historical_month['Expected Generation'].mean()
            
            forecast_data.append({
                'Year': forecast_date.year,
                'MonthNum': forecast_date.month,
                'Rainfall Ordinal': rainfall_order[rainfall_category],
                'Expected Generation': expected_generation
            })
        
        forecast_df = pd.DataFrame(forecast_data)
        
        # Generate predictions
        rf_predictions = rf_model.predict(forecast_df)
        xgb_predictions = xgb_model.predict(forecast_df)
        
        if arima_results is not None:
            arima_predictions = arima_results.forecast(steps=forecast_months)
            arima_predictions = arima_predictions.tolist() if hasattr(arima_predictions, 'tolist') else list(arima_predictions)
        else:
            arima_predictions = [np.nan] * forecast_months
        
        # Create ensemble prediction
        ensemble_predictions = np.nanmean([rf_predictions, xgb_predictions, arima_predictions], axis=0)
        
        # Get feature importances
        rf_importances = rf_model.feature_importances_
        xgb_importances = xgb_model.feature_importances_
        
        feature_importances = {
            'Random Forest': dict(zip(['Year', 'MonthNum', 'Rainfall Ordinal', 'Expected Generation'], rf_importances)),
            'XGBoost': dict(zip(['Year', 'MonthNum', 'Rainfall Ordinal', 'Expected Generation'], xgb_importances))
        }
        
        # Prepare results
        forecast_results = []
        for i in range(forecast_months):
            forecast_date = start_date + pd.DateOffset(months=i)
            forecast_results.append({
                'month': forecast_date.strftime('%B %Y'),
                'random_forest': int(rf_predictions[i]),
                'xgboost': int(xgb_predictions[i]),
                'arima': int(arima_predictions[i]) if not np.isnan(arima_predictions[i]) else None,
                'ensemble': int(ensemble_predictions[i])
            })
        
        # Generate insights
        insights = generate_multi_model_insights(forecast_results, df_train, feature_importances)
        
        response_data = {
            'forecast': forecast_results,
            'insights': insights,
            'feature_importances': feature_importances
        }

        # Convert the entire response data to ensure all NumPy types are handled
        response_data = numpy_to_python(response_data)

        return jsonify(response_data)
    
    except Exception as e:
        app.logger.error(f"Error in generate_forecast: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def generate_multi_model_insights(forecast_results, historical_data, feature_importances):
    insights = []
    
    historical_avg = float(historical_data['Actual Generation'].mean())
    model_avgs = {
        'Random Forest': np.mean([result['random_forest'] for result in forecast_results]),
        'XGBoost': np.mean([result['xgboost'] for result in forecast_results]),
        'Ensemble': np.mean([result['ensemble'] for result in forecast_results])
    }
    
    if forecast_results[0]['arima'] is not None:
        model_avgs['ARIMA'] = np.mean([result['arima'] for result in forecast_results if result['arima'] is not None])
    
    # Convert model_avgs to Python native types
    model_avgs = {k: float(v) for k, v in model_avgs.items()}

    for model, avg in model_avgs.items():
        if avg > historical_avg * 1.1:
            insights.append(f"{model} predicts higher than average generation.")
        elif avg < historical_avg * 0.9:
            insights.append(f"{model} predicts lower than average generation.")
    
    max_model = max(model_avgs, key=model_avgs.get)
    min_model = min(model_avgs, key=model_avgs.get)
    insights.append(f"{max_model} provides the highest average prediction at {int(model_avgs[max_model]):,} kWh.")
    insights.append(f"{min_model} provides the lowest average prediction at {int(model_avgs[min_model]):,} kWh.")
    
    ensemble_avg = model_avgs['Ensemble']
    insights.append(f"The ensemble average predicted generation for the forecast period is {int(ensemble_avg):,} kWh.")
    
    # Add insights about feature importances
    for model in ['Random Forest', 'XGBoost']:
        rainfall_importance = feature_importances[model]['Rainfall Ordinal']
        insights.append(f"In the {model} model, Rainfall Category has an importance of {rainfall_importance:.2%}.")
    
    return insights

if __name__ == '__main__':
    app.run(debug=True)
