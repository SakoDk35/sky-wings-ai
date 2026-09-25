"""Experimental synthetic-data flight price prediction service."""

from datetime import datetime, timezone
from pathlib import Path
import math
import re

from flask import Flask, jsonify, request
import joblib
import numpy as np


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best_model.pkl"
METADATA_PATH = BASE_DIR / "model_metadata.json"
MAX_DAYS_BEFORE_DEPARTURE = 120

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

# The model was trained with these exact ordinal category values.
ROUTES = {
    "NYC-LON": 0, "LON-PAR": 1, "DXB-NYC": 2, "TYO-SIN": 3,
    "PAR-ROM": 4, "BER-MAD": 5, "LAX-TYO": 6, "SIN-BKK": 7,
    "DOH-LON": 8, "IST-DXB": 9, "NYC-LAX": 10, "LON-DXB": 11,
    "PAR-NYC": 12, "BKK-SIN": 13, "ROM-BER": 14,
}

AIRLINES = {
    "Emirates": 0, "Qatar": 1, "Singapore": 2, "Lufthansa": 3,
    "British Airways": 4, "Air France": 5, "Turkish": 6, "Etihad": 7,
    "Ryanair": 8, "EasyJet": 9, "Spirit": 10, "Delta": 11,
    "United": 12, "American": 13,
}

# Explicit airport-to-metropolitan mappings represented by the training routes.
AIRPORT_TO_MODEL_CODE = {
    "JFK": "NYC", "LGA": "NYC", "EWR": "NYC", "NYC": "NYC",
    "LHR": "LON", "LGW": "LON", "STN": "LON", "LTN": "LON",
    "LCY": "LON", "SEN": "LON", "LON": "LON",
    "CDG": "PAR", "ORY": "PAR", "BVA": "PAR", "PAR": "PAR",
    "HND": "TYO", "NRT": "TYO", "TYO": "TYO",
    "FCO": "ROM", "CIA": "ROM", "ROM": "ROM",
    "DXB": "DXB", "BER": "BER", "MAD": "MAD", "LAX": "LAX",
    "SIN": "SIN", "BKK": "BKK", "DOH": "DOH", "IST": "IST",
}

AIRLINE_ALIASES = {
    "emirates": "Emirates",
    "qatar": "Qatar",
    "qatar airways": "Qatar",
    "singapore": "Singapore",
    "singapore airlines": "Singapore",
    "lufthansa": "Lufthansa",
    "british airways": "British Airways",
    "air france": "Air France",
    "turkish": "Turkish",
    "turkish airlines": "Turkish",
    "etihad": "Etihad",
    "etihad airways": "Etihad",
    "ryanair": "Ryanair",
    "easyjet": "EasyJet",
    "spirit": "Spirit",
    "spirit airlines": "Spirit",
    "delta": "Delta",
    "delta air lines": "Delta",
    "united": "United",
    "united airlines": "United",
    "american": "American",
    "american airlines": "American",
}


def error_response(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def load_model():
    """Load the checked-in model artifact independently of the process cwd."""
    if not MODEL_PATH.is_file():
        raise FileNotFoundError("Model artifact is unavailable")
    return joblib.load(MODEL_PATH)


try:
    model = load_model()
    model_load_failed = False
except Exception:
    model = None
    model_load_failed = True


def parse_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def get_season(departure_date):
    if departure_date.month in (12, 1, 2):
        return 1
    if departure_date.month in (3, 4, 5):
        return 2
    if departure_date.month in (6, 7, 8):
        return 3
    return 4


def estimate_demand(season, route):
    demand = 4 if season == 3 else 2 if season == 1 else 3
    if route in {"NYC-LON", "DXB-NYC", "LON-PAR"}:
        demand = min(5, demand + 1)
    return demand


def normalize_route(route):
    if not isinstance(route, str) or not re.fullmatch(r"[A-Za-z]{3}-[A-Za-z]{3}", route.strip()):
        return None
    origin, destination = route.strip().upper().split("-")
    model_origin = AIRPORT_TO_MODEL_CODE.get(origin)
    model_destination = AIRPORT_TO_MODEL_CODE.get(destination)
    if not model_origin or not model_destination:
        return None
    normalized = f"{model_origin}-{model_destination}"
    return normalized if normalized in ROUTES else None


def normalize_airline(airline):
    if not isinstance(airline, str):
        return None
    normalized_input = " ".join(airline.strip().split()).casefold()
    return AIRLINE_ALIASES.get(normalized_input)


def validate_prediction_request(data):
    if not isinstance(data, dict):
        return None, ("INVALID_JSON", "Request body must contain a JSON object.", 400)

    required_fields = {
        "route", "airline", "departure_date", "days_before_departure",
        "current_price", "currency",
    }
    missing = sorted(field for field in required_fields if field not in data)
    if missing:
        return None, ("INVALID_REQUEST", f"Missing required field: {missing[0]}", 400)

    route = normalize_route(data["route"])
    if not route:
        return None, (
            "UNSUPPORTED_ROUTE",
            "This route is not supported by the experimental model.",
            422,
        )

    airline = normalize_airline(data["airline"])
    if not airline:
        return None, (
            "UNSUPPORTED_AIRLINE",
            "This airline is not supported by the experimental model.",
            422,
        )

    departure_date = parse_date(data["departure_date"])
    if not departure_date:
        return None, ("INVALID_DATE", "departure_date must be a valid YYYY-MM-DD date.", 400)

    days_value = data["days_before_departure"]
    if isinstance(days_value, bool) or not isinstance(days_value, int):
        return None, (
            "INVALID_DAYS_BEFORE_DEPARTURE",
            "days_before_departure must be an integer.",
            400,
        )

    expected_days = (departure_date - datetime.now(timezone.utc).date()).days
    if days_value < 0 or days_value > MAX_DAYS_BEFORE_DEPARTURE or days_value != expected_days:
        return None, (
            "INVALID_DAYS_BEFORE_DEPARTURE",
            "days_before_departure is outside the supported range or does not match departure_date.",
            400,
        )

    price_value = data["current_price"]
    if isinstance(price_value, bool):
        return None, ("INVALID_PRICE", "current_price must be a positive number.", 400)
    try:
        current_price = float(price_value)
    except (TypeError, ValueError):
        return None, ("INVALID_PRICE", "current_price must be a positive number.", 400)
    if not math.isfinite(current_price) or current_price <= 0 or current_price > 1_000_000:
        return None, ("INVALID_PRICE", "current_price must be a positive number.", 400)

    currency = data["currency"]
    if not isinstance(currency, str) or currency.strip().upper() != "USD":
        return None, (
            "UNSUPPORTED_CURRENCY",
            "The experimental model currently supports USD prices only.",
            422,
        )

    return {
        "route": route,
        "airline": airline,
        "departure_date": departure_date,
        "days_before_departure": days_value,
        "current_price": current_price,
        "currency": "USD",
    }, None


def summarize_output(trend, price_change_percent):
    magnitude = abs(price_change_percent)
    if trend == "increase":
        return f"The synthetic-data model output is {magnitude:.1f}% above the current displayed price."
    if trend == "decrease":
        return f"The synthetic-data model output is {magnitude:.1f}% below the current displayed price."
    return "The synthetic-data model output is within 0.5% of the current displayed price."


@app.errorhandler(413)
def request_too_large(_error):
    return error_response("REQUEST_TOO_LARGE", "Request body is too large.", 413)


@app.route("/health", methods=["GET"])
def health_check():
    status = "ok" if model is not None else "degraded"
    return jsonify({"status": status, "model_loaded": model is not None}), 200 if model is not None else 503


@app.route("/predict-flight-price", methods=["POST"])
def predict_flight_price():
    if model is None:
        return error_response("MODEL_UNAVAILABLE", "The experimental model is unavailable.", 503)

    data = request.get_json(silent=True)
    validated, validation_error = validate_prediction_request(data)
    if validation_error:
        return error_response(*validation_error)

    season = get_season(validated["departure_date"])
    demand_level = estimate_demand(season, validated["route"])
    features = np.array([[
        ROUTES[validated["route"]],
        AIRLINES[validated["airline"]],
        validated["days_before_departure"],
        season,
        demand_level,
        validated["current_price"],
    ]])

    try:
        predicted_price = float(model.predict(features)[0])
    except Exception:
        return error_response("PREDICTION_FAILED", "The experimental model could not produce a result.", 500)

    if not math.isfinite(predicted_price) or predicted_price <= 0:
        return error_response("PREDICTION_FAILED", "The experimental model could not produce a result.", 500)

    price_change_percent = (
        (predicted_price - validated["current_price"]) / validated["current_price"]
    ) * 100
    if price_change_percent > 0.5:
        trend = "increase"
    elif price_change_percent < -0.5:
        trend = "decrease"
    else:
        trend = "stable"

    return jsonify({
        "predicted_price": round(predicted_price, 2),
        "trend": trend,
        "price_change_percent": round(price_change_percent, 2),
        "summary": summarize_output(trend, price_change_percent),
        "currency": validated["currency"],
        "model_output_label": "Experimental model output",
        "model_used": type(model).__name__,
        "normalized_route": validated["route"],
        "normalized_airline": validated["airline"],
        "days_analyzed": validated["days_before_departure"],
    }), 200


@app.route("/models-info", methods=["GET"])
def models_info():
    if not METADATA_PATH.is_file():
        return error_response("METADATA_UNAVAILABLE", "Model metadata is unavailable.", 404)
    return app.response_class(METADATA_PATH.read_text(encoding="utf-8"), mimetype="application/json")


if __name__ == "__main__":
    if model_load_failed:
        print("Model artifact could not be loaded; prediction requests will return 503.")
    app.run(host="127.0.0.1", port=5000, debug=False)
