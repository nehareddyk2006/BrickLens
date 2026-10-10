
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# PATHS AND DATA
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

MODEL_PATH = BASE_DIR / "models" / "bricklens_xgb.pkl"
MARKET_PATH = PROJECT_DIR / "datasets" / "processed" / "market_summary.csv"
PROPERTY_PATH = PROJECT_DIR / "datasets" / "processed" / "bricklens_featured.csv"

app = FastAPI(
    title="BrickLens API",
    description="Property price estimation and market comparison API",
    version="1.1.0",
)

# For local development. Restrict this to your actual deployed
# frontend URL before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for path in (MODEL_PATH, MARKET_PATH, PROPERTY_PATH):
    if not path.exists():
        raise FileNotFoundError(f"Required BrickLens file not found: {path}")

model = joblib.load(MODEL_PATH)
market_summary = pd.read_csv(MARKET_PATH)
property_data = pd.read_csv(PROPERTY_PATH)

# Normalize city/locality labels for matching without changing the
# original labels returned to the frontend.
for df in (market_summary, property_data):
    df["city"] = df["city"].astype(str).str.strip()
    df["location"] = df["location"].astype(str).str.strip()

# The training notebook used location-only counts for this feature.
# Processed data provides an approximation of those counts.
location_counts = property_data["location"].value_counts()


# --------------------------------------------------
# INPUT VALIDATION
# --------------------------------------------------

class PropertyInput(BaseModel):
    city: str = Field(min_length=1)
    location: str = Field(min_length=1)
    sqft: float = Field(gt=0, le=100000)
    bhk: float = Field(gt=0, le=20)
    bath: float = Field(gt=0, le=30)
    balcony: float = Field(ge=0, le=20)


def normalize(value: str) -> str:
    return str(value).strip().casefold()


def get_city_localities(city: str) -> pd.DataFrame:
    city_key = normalize(city)
    return market_summary[
        market_summary["city"].map(normalize) == city_key
    ].copy()


def safe_float(value):
    if value is None or pd.isna(value) or not np.isfinite(float(value)):
        return None
    return float(value)


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/")
def home():
    return {"message": "BrickLens API Running"}


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "market_data_loaded": not market_summary.empty,
        "property_data_loaded": not property_data.empty,
    }


# --------------------------------------------------
# PREDICTION
# --------------------------------------------------

@app.post("/predict")
def predict(data: PropertyInput):
    city_key = normalize(data.city)
    location_key = normalize(data.location)

    # Require the city/locality pair to exist in the market dataset.
    locality_data = market_summary[
        (market_summary["city"].map(normalize) == city_key)
        & (market_summary["location"].map(normalize) == location_key)
    ]

    if locality_data.empty:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No market data found for {data.location}, {data.city}. "
                "Please choose a locality listed for the selected city."
            ),
        )

    # Match the nine features expected by the saved model.
    sqft_per_bhk = data.sqft / data.bhk
    bath_per_bhk = data.bath / data.bhk
    location_popularity = int(location_counts.get(data.location, 1))

    features = pd.DataFrame(
        [
            {
                "city": data.city.strip(),
                "location": data.location.strip(),
                "sqft": data.sqft,
                "bhk": data.bhk,
                "bath": data.bath,
                "balcony": data.balcony,
                "location_popularity": location_popularity,
                "sqft_per_bhk": sqft_per_bhk,
                "bath_per_bhk": bath_per_bhk,
            }
        ]
    )

    try:
        predicted_log_price = float(model.predict(features)[0])
        predicted_price = float(np.expm1(predicted_log_price))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="The model could not generate a prediction for this input.",
        ) from exc

    if not np.isfinite(predicted_price) or predicted_price <= 0:
        raise HTTPException(
            status_code=500,
            detail="The model returned an invalid price estimate.",
        )

    market_row = locality_data.iloc[0]

    market_average = safe_float(market_row["avg_price"])
    price_per_sqft = safe_float(market_row["avg_price_per_sqft"])
    locality_count = int(market_row["count"])

    difference_percent = None
    if market_average is not None and market_average > 0 and locality_count >= 2:
        difference_percent = round(
            ((predicted_price - market_average) / market_average) * 100,
            2,
        )

    # Comparable records must belong to the selected city AND exact locality.
    # The frontend should treat this as an empty state when no exact matches exist.
    comparable = property_data[
        (property_data["city"].map(normalize) == city_key)
        & (property_data["location"].map(normalize) == location_key)
    ].copy()

    if not comparable.empty:
        comparable["sqft_diff"] = (
            pd.to_numeric(comparable["sqft"], errors="coerce") - data.sqft
        ).abs()

        comparable["bhk_diff"] = (
            pd.to_numeric(comparable["bhk"], errors="coerce") - data.bhk
        ).abs()

        comparable = comparable.dropna(subset=["sqft_diff", "bhk_diff"])
        comparable = comparable.sort_values(
            ["bhk_diff", "sqft_diff"],
            ascending=[True, True],
        ).head(3)

    similar_properties = [
        {
            "sqft": float(row["sqft"]),
            "bhk": float(row["bhk"]),
            "price_lakh": float(row["price_lakh"]),
        }
        for _, row in comparable.iterrows()
        if pd.notna(row.get("price_lakh"))
        and pd.notna(row.get("sqft"))
        and pd.notna(row.get("bhk"))
    ]

    return {
        "city": data.city.strip(),
        "location": data.location.strip(),
        "predicted_price_lakh": round(predicted_price, 2),
        "market_average": (
            round(market_average, 2) if market_average is not None else None
        ),
        "price_per_sqft": (
            round(price_per_sqft, 2) if price_per_sqft is not None else None
        ),
        "difference_percent": difference_percent,
        "locality_count": locality_count,
        "similar_properties": similar_properties,
    }


# --------------------------------------------------
# CITY COMPARISON
# --------------------------------------------------

@app.get("/city-comparison")
def city_comparison():
    df = market_summary.copy()

    df["avg_price"] = pd.to_numeric(df["avg_price"], errors="coerce")
    df["count"] = pd.to_numeric(df["count"], errors="coerce")

    df = df[
        df["avg_price"].notna()
        & df["count"].notna()
        & (df["avg_price"] > 0)
        & (df["count"] > 0)
    ].copy()

    df["weighted_price"] = df["avg_price"] * df["count"]

    comparison = (
        df.groupby("city", as_index=False)
        .agg(
            total_weighted_price=("weighted_price", "sum"),
            total_listings=("count", "sum"),
        )
    )

    comparison["price"] = (
        comparison["total_weighted_price"] / comparison["total_listings"]
    )

    return {
        "cities": [
            {
                "city": str(row["city"]),
                "price": round(float(row["price"]), 2),
                "listings": int(row["total_listings"]),
            }
            for _, row in comparison.sort_values(
                "price", ascending=False
            ).iterrows()
        ]
    }


# --------------------------------------------------
# NEARBY LOCALITIES
# --------------------------------------------------

@app.get("/nearby")
def nearby(city: str):
    df = get_city_localities(city)

    if df.empty:
        return {"city": city, "localities": []}

    # Sort by average property price, descending.
    df["avg_price"] = pd.to_numeric(df["avg_price"], errors="coerce")
    df["count"] = pd.to_numeric(df["count"], errors="coerce")
    df = df[df["avg_price"].notna() & df["count"].notna()].copy()
    df = df.sort_values("avg_price", ascending=False).head(4)

    return {
        "city": city,
        "localities": [
            {
                "name": str(row["location"]),
                "avg_price": round(float(row["avg_price"]), 2),
                "count": int(row["count"]),
            }
            for _, row in df.iterrows()
        ],
    }
