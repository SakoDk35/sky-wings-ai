"""Train and evaluate the deterministic synthetic-data V2 prototype."""

from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from data_generator import RANDOM_SEED, save_training_data

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "training_data.csv"
MODEL_PATH = BASE_DIR / "best_model.pkl"
METADATA_PATH = BASE_DIR / "model_metadata.json"
FEATURES = [
    "current_price", "days_before_departure", "total_duration_minutes",
    "stops", "departure_month_sin", "departure_month_cos",
]
TARGET = "future_price_change_percent"


def metrics(y_true, y_pred, prices):
    y_true, y_pred, prices = map(lambda value: np.asarray(value, dtype=float), (y_true, y_pred, prices))
    actual = prices * (1 + y_true / 100)
    predicted = prices * (1 + y_pred / 100)
    return {
        "mae_percentage_points": float(mean_absolute_error(y_true, y_pred)),
        "rmse_percentage_points": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)) if len(y_true) > 1 else None,
        "future_price_mape_percent": float(np.mean(np.abs(predicted - actual) / actual) * 100),
    }


def evaluate(model, frame):
    return metrics(frame[TARGET], model.predict(frame[FEATURES]), frame["current_price"])


def slice_evaluation(model, frame):
    groups = {
        "days_before_departure": [
            ("0-7", frame.days_before_departure.between(0, 7)),
            ("8-30", frame.days_before_departure.between(8, 30)),
            ("31-90", frame.days_before_departure.between(31, 90)),
            ("91-180", frame.days_before_departure.between(91, 180)),
            ("181-365", frame.days_before_departure.between(181, 365)),
        ],
        "current_price": [
            ("40-199", frame.current_price.between(40, 199.9999)),
            ("200-499", frame.current_price.between(200, 499.9999)),
            ("500-999", frame.current_price.between(500, 999.9999)),
            ("1000-5000", frame.current_price.between(1_000, 5_000)),
        ],
        "stops": [(str(value), frame.stops == value) for value in range(4)],
        "total_duration_minutes": [
            ("45-179", frame.total_duration_minutes.between(45, 179)),
            ("180-359", frame.total_duration_minutes.between(180, 359)),
            ("360-719", frame.total_duration_minutes.between(360, 719)),
            ("720-1800", frame.total_duration_minutes.between(720, 1_800)),
        ],
        "departure_month": [(str(value), frame.departure_month == value) for value in range(1, 13)],
    }
    output = {}
    for group_name, definitions in groups.items():
        output[group_name] = {}
        for label, mask in definitions:
            subset = frame.loc[mask]
            if not subset.empty:
                output[group_name][label] = {"count": int(len(subset)), **evaluate(model, subset)}
    return output


def train():
    frame = save_training_data(DATA_PATH)
    holdout_mask = (
        (frame.stops >= 2)
        & (frame.total_duration_minutes >= 720)
        & frame.departure_month.isin([6, 7, 8])
    )
    holdout = frame.loc[holdout_mask].copy()
    normal = frame.loc[~holdout_mask].copy()
    if len(holdout) < 30:
        raise ValueError("Generalization holdout is too small")

    train_validation, test = train_test_split(normal, test_size=0.15, random_state=RANDOM_SEED)
    training, validation = train_test_split(
        train_validation, test_size=0.1764705882, random_state=RANDOM_SEED
    )
    candidates = {
        "NaiveZeroChange": DummyRegressor(strategy="constant", constant=0.0),
        "LinearRegression": LinearRegression(),
        "RandomForest": RandomForestRegressor(
            n_estimators=150, max_depth=14, min_samples_split=5,
            min_samples_leaf=2, random_state=RANDOM_SEED, n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=150, learning_rate=0.05, max_depth=4,
            min_samples_split=5, min_samples_leaf=2, random_state=RANDOM_SEED,
        ),
    }

    comparison = {}
    for name, candidate in candidates.items():
        fitted = clone(candidate).fit(training[FEATURES], training[TARGET])
        comparison[name] = {
            "validation": evaluate(fitted, validation),
            "test": evaluate(fitted, test),
        }
    selected = min(
        comparison,
        key=lambda name: comparison[name]["validation"]["rmse_percentage_points"],
    )
    final_training = pd.concat([training, validation], ignore_index=True)
    model = clone(candidates[selected]).fit(final_training[FEATURES], final_training[TARGET])

    metadata = {
        "model_version": "V2",
        "selected_model": selected,
        "models_evaluated": list(candidates),
        "feature_names": FEATURES,
        "target": {
            "name": TARGET,
            "definition": "Synthetic percentage change from current displayed price to simulated future price.",
            "predicted_price_formula": "current_price * (1 + predicted_change_percent / 100)",
        },
        "synthetic_assumptions": {
            "booking_horizon": "Expected upward drift grows smoothly from 0% at 0 days to 4% at 365 days using 4 * (days / 365)^0.65.",
            "departure_month": "A cyclical cosine term ranges from -2 to +2 percentage points, peaking in July.",
            "duration": "A tanh term ranges approximately from -0.6 to +1.2 percentage points across supported durations.",
            "stops": "Each stop subtracts 0.6 percentage points, up to three stops.",
            "current_price": "A tanh term applies a modest positive effect below USD 500 and dampening effect above USD 500.",
            "noise": "Seeded Gaussian noise has mean 0 and standard deviation 1.5 percentage points.",
            "class_balancing": "No direction labels or target class proportions are forced.",
        },
        "inference_rounding": {
            "canonical_percentage_decimals": 1,
            "increase": "> 0.5%",
            "stable": "-0.5% through +0.5% inclusive",
            "decrease": "< -0.5%",
        },
        "training_record_count": int(len(frame)),
        "random_seed": RANDOM_SEED,
        "sklearn_version": sklearn.__version__,
        "synthetic_data_disclosure": (
            "All records and target relationships are synthetic. Metrics measure recovery "
            "of the authored simulation only, not real-world airfare accuracy."
        ),
        "split": {
            "training": int(len(training)),
            "validation": int(len(validation)),
            "test": int(len(test)),
            "generalization_holdout": int(len(holdout)),
            "generalization_holdout_definition": (
                "stops >= 2, duration >= 720 minutes, and June-August departure; "
                "excluded from normal training, validation, and test splits"
            ),
        },
        "selection_metric": "lowest validation RMSE in synthetic percentage points",
        "model_comparison": comparison,
        "selected_model_test_metrics": evaluate(model, test),
        "generalization_holdout_metrics": evaluate(model, holdout),
        "test_slice_metrics": slice_evaluation(model, test),
        "supported_input_constraints": {
            "currency": "USD",
            "current_price": {"minimum": 40, "maximum": 5_000},
            "days_before_departure": {"minimum": 0, "maximum": 365},
            "total_duration_minutes": {"minimum": 45, "maximum": 1_800},
            "stops": {"minimum": 0, "maximum": 3},
            "departure_month": {"minimum": 1, "maximum": 12},
        },
    }
    return model, metadata


def main():
    model, metadata = train()
    joblib.dump(model, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("Synthetic ML Price Prediction V2 training complete.")
    print(f"Selected model: {metadata['selected_model']}")
    print(json.dumps(metadata["selected_model_test_metrics"], indent=2))
    print("Metrics are synthetic-data evaluation metrics only.")


if __name__ == "__main__":
    main()
