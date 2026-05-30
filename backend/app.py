from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BrickLens API",
    description="AI-powered Property Price Prediction",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
model = joblib.load("models/bricklens_xgb.pkl")

# Load market intelligence data
market_summary = pd.read_csv(
    "../datasets/processed/market_summary.csv"
)
property_data = pd.read_csv(
    "../datasets/processed/bricklens_featured.csv"
)

class PropertyInput(BaseModel):
    city: str
    location: str
    sqft: float
    bhk: float
    bath: float
    balcony: float


@app.get("/")
def home():
    return {
        "message": "BrickLens API Running"
    }


@app.post("/predict")
def predict(data: PropertyInput):

    # Feature Engineering
    sqft_per_bhk = (
        data.sqft / data.bhk
        if data.bhk > 0
        else 0
    )

    bath_per_bhk = (
        data.bath / data.bhk
        if data.bhk > 0
        else 0
    )

    location_popularity = 1

    df = pd.DataFrame([{
        "city": data.city,
        "location": data.location,
        "sqft": data.sqft,
        "bhk": data.bhk,
        "bath": data.bath,
        "balcony": data.balcony,
        "location_popularity": location_popularity,
        "sqft_per_bhk": sqft_per_bhk,
        "bath_per_bhk": bath_per_bhk
    }])

    # Model prediction
    pred_log = model.predict(df)[0]

    # Convert back from log scale
    predicted_price = np.expm1(pred_log)

    # Locality Intelligence
    locality_data = market_summary[
        (market_summary["city"] == data.city)
        &
        (market_summary["location"] == data.location)
    ]

    if len(locality_data) > 0:

        market_avg = float(
            locality_data.iloc[0]["avg_price"]
        )

        price_per_sqft = float(
            locality_data.iloc[0]["avg_price_per_sqft"]
        )

        locality_count = int(
            locality_data.iloc[0]["count"]
        )

        difference_percent = round(
            (
                (predicted_price - market_avg)
                / market_avg
            ) * 100,
            2
        )

    else:
        market_avg = None
        price_per_sqft = None
        locality_count = None
        difference_percent = None

    similar_properties = property_data[
        (property_data["city"] == data.city)
        & (property_data["location"] == data.location)
    ].copy()

    similar_properties["sqft_diff"] = (
        similar_properties["sqft"] - data.sqft
    ).abs()

    similar_properties = (
        similar_properties
        .sort_values("sqft_diff")
        .head(3)
    )

    similar_list = [
        {
            "sqft": float(row["sqft"]),
            "bhk": float(row["bhk"]),
            "price_lakh": float(row["price_lakh"])
        }
        for _, row in similar_properties.iterrows()
    ]

    return {
        "city": str(data.city),
        "location": str(data.location),
        "predicted_price_lakh": float(round(predicted_price, 2)),
        "market_average": (
            float(round(market_avg, 2)) if market_avg is not None else None
        ),
        "price_per_sqft": (
            float(round(price_per_sqft, 2)) if price_per_sqft is not None else None
        ),
        "difference_percent": (
            float(difference_percent) if difference_percent is not None else None
        ),
        "locality_count": (
            int(locality_count) if locality_count is not None else None
        ),
        "similar_properties": similar_list
    }


@app.get("/nearby")
def nearby(city: str):
    # Return top nearby localities for a given city sorted by avg price (descending)
    df = market_summary[market_summary["city"] == city].copy()
    if df.empty:
        return {"city": city, "localities": []}

    df = df.sort_values("avg_price", ascending=False)

    # take top 4 localities (or fewer if not available)
    top = df.head(4)

    localities = [
        {"name": row["location"], "avg_price": float(row["avg_price"])}
        for _, row in top.iterrows()
    ]

    return {"city": city, "localities": localities}
