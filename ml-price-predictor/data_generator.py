"""Generate the deterministic synthetic dataset used by the V2 prototype.

These are authored simulation assumptions, not real-market findings: expected
upward drift grows smoothly from 0% today to 4% at a 365-day horizon; month,
duration, stops, and displayed price have small documented effects; seeded
noise represents omitted variation. No airline-specific or route-specific rules
are used, and no class proportions are forced.
"""

from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "training_data.csv"
RANDOM_SEED = 42
DEFAULT_RECORD_COUNT = 12_000


def generate_synthetic_data(num_samples=DEFAULT_RECORD_COUNT, random_seed=RANDOM_SEED):
    """Return a reproducible, explicitly synthetic V2 dataset."""
    rng = np.random.default_rng(random_seed)
    days = rng.integers(0, 366, size=num_samples)
    month = rng.integers(1, 13, size=num_samples)
    stops = rng.choice([0, 1, 2, 3], size=num_samples, p=[0.55, 0.30, 0.12, 0.03])
    base_duration = rng.integers(45, 1_501, size=num_samples)
    duration = np.clip(base_duration + stops * rng.integers(60, 241, size=num_samples), 45, 1_800)

    # Log-uniform base prices cover inexpensive and premium displayed fares.
    base_price = np.exp(rng.uniform(np.log(40), np.log(4_500), size=num_samples))
    current_price = np.clip(
        base_price * (0.80 + duration / 1_800 * 0.90) * (1 - np.minimum(stops, 3) * 0.04),
        40,
        5_000,
    )
    angle = 2 * np.pi * (month - 1) / 12
    month_sin, month_cos = np.sin(angle), np.cos(angle)

    # Target relationships are synthetic percentage-point assumptions.
    # Authored assumption: expected upward drift is 0% today and grows smoothly
    # to a modest 4% at 365 days. This coefficient is not class-balance tuning.
    horizon_effect = 4.0 * np.power(days / 365, 0.65)
    seasonal_effect = 2.0 * np.cos(2 * np.pi * (month - 7) / 12)
    duration_effect = 1.2 * np.tanh((duration - 360) / 600)
    stops_effect = -0.6 * stops
    price_effect = -0.8 * np.tanh((np.log(current_price) - np.log(500)) / 1.5)
    noise = rng.normal(0.0, 1.5, size=num_samples)
    change = np.clip(
        horizon_effect + seasonal_effect
        + duration_effect + stops_effect + price_effect + noise,
        -8.0,
        25.0,
    )
    future_price = current_price * (1 + change / 100)

    return pd.DataFrame({
        "current_price": np.round(current_price, 2),
        "days_before_departure": days,
        "total_duration_minutes": duration,
        "stops": stops,
        "departure_month": month,
        "departure_month_sin": month_sin,
        "departure_month_cos": month_cos,
        "future_price_change_percent": np.round(change, 4),
        "future_price": np.round(future_price, 2),
    })


def save_training_data(filepath=DEFAULT_DATA_PATH, num_samples=DEFAULT_RECORD_COUNT, random_seed=RANDOM_SEED):
    """Generate and save the dataset at a cwd-independent path."""
    output_path = Path(filepath)
    if not output_path.is_absolute():
        output_path = BASE_DIR / output_path
    frame = generate_synthetic_data(num_samples, random_seed)
    frame.to_csv(output_path, index=False)
    print(f"Generated {len(frame)} deterministic synthetic V2 records.")
    print(f"Saved dataset to {output_path}")
    return frame


if __name__ == "__main__":
    save_training_data()
