"""Local-only inference service for the synthetic ML Price Prediction V2 model."""

from datetime import datetime, timezone
from pathlib import Path
import math
import re
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best_model.pkl"
METADATA_PATH = BASE_DIR / "model_metadata.json"
FEATURES = [
    "current_price", "days_before_departure", "total_duration_minutes",
    "stops", "departure_month_sin", "departure_month_cos",
]
MAX_DAYS = 365
MIN_PRICE, MAX_PRICE = 40, 5_000
MIN_DURATION, MAX_DURATION = 45, 1_800
MAX_STOPS = 3

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024


def error_response(code, message, status):
    return jsonify({"error": {"code": code, "message": message}}), status


def load_model():
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


def finite_number(value):
    if isinstance(value, bool):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def validate_request(data):
    if not isinstance(data, dict):
        return None, ("INVALID_JSON", "Request body must contain a JSON object.", 400)
    required = {
        "departure_date", "days_before_departure", "current_price", "currency",
        "total_duration_minutes", "stops",
    }
    missing = sorted(field for field in required if field not in data)
    if missing:
        return None, ("INVALID_REQUEST", f"Missing required field: {missing[0]}", 400)

    departure_date = parse_date(data["departure_date"])
    if not departure_date:
        return None, ("INVALID_DATE", "departure_date must be a valid YYYY-MM-DD date.", 400)

    days = data["days_before_departure"]
    if isinstance(days, bool) or not isinstance(days, int):
        return None, ("INVALID_DAYS_BEFORE_DEPARTURE", "days_before_departure must be an integer.", 400)
    expected_days = (departure_date - datetime.now(timezone.utc).date()).days
    if days != expected_days or days < 0:
        return None, (
            "INVALID_DAYS_BEFORE_DEPARTURE",
            "days_before_departure must match the future departure_date.",
            400,
        )
    if days > MAX_DAYS:
        return None, (
            "UNSUPPORTED_DATE_RANGE",
            f"The V2 prototype supports departures up to {MAX_DAYS} days away.",
            422,
        )

    price = finite_number(data["current_price"])
    if price is None or price <= 0:
        return None, ("INVALID_PRICE", "current_price must be a positive number.", 400)
    if not MIN_PRICE <= price <= MAX_PRICE:
        return None, (
            "UNSUPPORTED_PRICE_RANGE",
            f"The V2 prototype supports displayed prices from USD {MIN_PRICE} to {MAX_PRICE}.",
            422,
        )

    duration = finite_number(data["total_duration_minutes"])
    if duration is None or not duration.is_integer() or duration <= 0:
        return None, (
            "INVALID_DURATION",
            "total_duration_minutes must be a positive integer.",
            400,
        )
    duration = int(duration)
    if not MIN_DURATION <= duration <= MAX_DURATION:
        return None, (
            "UNSUPPORTED_DURATION_RANGE",
            f"The V2 prototype supports durations from {MIN_DURATION} to {MAX_DURATION} minutes.",
            422,
        )

    stops = data["stops"]
    if isinstance(stops, bool) or not isinstance(stops, int) or stops < 0:
        return None, ("INVALID_STOPS", "stops must be a non-negative integer.", 400)
    if stops > MAX_STOPS:
        return None, (
            "UNSUPPORTED_STOPS",
            f"The V2 prototype supports itineraries with up to {MAX_STOPS} stops.",
            422,
        )

    currency = data["currency"]
    if not isinstance(currency, str) or currency.strip().upper() != "USD":
        return None, (
            "UNSUPPORTED_CURRENCY",
            "The experimental V2 model currently supports USD prices only.",
            422,
        )

    angle = 2 * np.pi * (departure_date.month - 1) / 12
    return {
        "current_price": price,
        "days_before_departure": days,
        "total_duration_minutes": duration,
        "stops": stops,
        "departure_month_sin": float(np.sin(angle)),
        "departure_month_cos": float(np.cos(angle)),
        "currency": "USD",
    }, None


def summary(direction, difference):
    magnitude = abs(difference)
    if direction == "increase":
        return f"The synthetic V2 model output is {magnitude:.1f}% above the current displayed price."
    if direction == "decrease":
        return f"The synthetic V2 model output is {magnitude:.1f}% below the current displayed price."
    return "The synthetic V2 model output is within 0.5% of the current displayed price."


@app.errorhandler(413)
def too_large(_error):
    return error_response("REQUEST_TOO_LARGE", "Request body is too large.", 413)


@app.route("/health", methods=["GET"])
def health():
    status = "ok" if model is not None else "degraded"
    return jsonify({"status": status, "model_loaded": model is not None, "model_version": "V2"}), 200 if model is not None else 503


@app.route("/predict-flight-price", methods=["POST"])
def predict():
    if model is None:
        return error_response("MODEL_UNAVAILABLE", "The experimental model is unavailable.", 503)
    validated, validation_error = validate_request(request.get_json(silent=True))
    if validation_error:
        return error_response(*validation_error)

    feature_frame = pd.DataFrame([{name: validated[name] for name in FEATURES}], columns=FEATURES)
    try:
        change = float(model.predict(feature_frame)[0])
    except Exception:
        return error_response("PREDICTION_FAILED", "The experimental model could not produce a result.", 500)
    if not math.isfinite(change):
        return error_response("PREDICTION_FAILED", "The experimental model could not produce a result.", 500)

    # One decimal is the canonical API/UI value. Classification and displayed
    # predicted price use this same value, including at the +/-0.5 thresholds.
    canonical_change = round(change, 1)
    ratio = 1 + canonical_change / 100
    predicted_price = validated["current_price"] * ratio
    if not math.isfinite(predicted_price) or ratio <= 0:
        return error_response("PREDICTION_FAILED", "The experimental model could not produce a result.", 500)

    direction = "increase" if canonical_change > 0.5 else "decrease" if canonical_change < -0.5 else "stable"
    return jsonify({
        "predicted_price": round(predicted_price, 2),
        "trend": direction,
        "price_change_percent": canonical_change,
        "summary": summary(direction, canonical_change),
        "currency": validated["currency"],
        "model_output_label": "Experimental synthetic V2 model output",
        "model_used": type(model).__name__,
        "model_version": "V2",
        "days_analyzed": validated["days_before_departure"],
    })


@app.route("/models-info", methods=["GET"])
def models_info():
    if not METADATA_PATH.is_file():
        return error_response("METADATA_UNAVAILABLE", "Model metadata is unavailable.", 404)
    return app.response_class(METADATA_PATH.read_text(encoding="utf-8"), mimetype="application/json")


if __name__ == "__main__":
    if model_load_failed:
        print("Model artifact could not be loaded; prediction requests will return 503.")
    app.run(host="127.0.0.1", port=5000, debug=False)
