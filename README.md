# 🏡 BrickLens — AI-Powered Real Estate Intelligence

**Predict property prices. Explore market trends. Make data-driven real estate decisions.**

BrickLens is a machine learning-powered real estate analytics platform that estimates residential property prices using property attributes and historical listing data. It combines predictive modeling with market comparisons and locality-level insights to help users explore real estate pricing across major Indian cities.

🌐 **Live Demo:** [BrickLens](https://brick-lens.netlify.app/)  
⚙️ **Backend API:** [BrickLens API](https://bricklens-api.onrender.com/)  
📖 **API Documentation:** [Interactive Swagger Docs](https://bricklens-api.onrender.com/docs)

---

## ✨ Features

- **AI-Powered Price Estimation:** Predicts property prices using an XGBoost regression model.
- **Property-Based Predictions:** Accepts city, locality, area, BHK configuration, bathrooms, and balconies as inputs.
- **Market Price Comparison:** Compares predicted property values against available locality-level market averages.
- **City-Level Analytics:** Compares aggregated real estate pricing across supported cities.
- **Locality Insights:** Explores higher-priced localities using available market data.
- **Comparable Properties:** Displays similar listings from the selected locality when matching records are available.
- **REST API:** Exposes prediction and market analytics through a FastAPI backend.

## 🖥️ Live Application

Try the deployed application:

**[Launch BrickLens →](https://brick-lens.netlify.app/)**

The prediction engine and API are hosted separately from the frontend.

## 🧰 Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite |
| Backend | Python, FastAPI |
| Machine Learning | XGBoost, scikit-learn |
| Data Processing | Pandas, NumPy |
| Model Persistence | Joblib |
| API Validation | Pydantic |
| Frontend Hosting | Netlify |
| Backend Hosting | Render |
| Version Control | Git, GitHub |

## 🧠 Machine Learning Approach

BrickLens uses an XGBoost regression model trained on processed residential real estate listing data.

The prediction pipeline uses the following features:

- City
- Locality
- Property area in square feet
- Number of bedrooms (BHK)
- Number of bathrooms
- Number of balconies
- Locality popularity
- Area per bedroom
- Bathrooms per bedroom

The saved model is loaded by the FastAPI backend to generate property price estimates. The backend transforms the model output back from its logarithmic scale and returns the estimate in lakh rupees.

**Note:** Estimates are model-generated approximations based on the available dataset. They are not official valuations or guaranteed transaction prices.

## 📊 Data

The project includes processed real estate listing datasets associated with:

- Bangalore
- Hyderabad
- Mumbai and its recorded subregions

The data processing workflow combines property records, handles missing values in key fields, and derives additional features for model training and inference.

Market comparison and similar-property results depend on the records available in the processed datasets. Locality-level statistics may be less reliable where listing counts are low.

## 🏗️ Architecture

```text
                ┌──────────────────────┐
                │   React + Vite UI    │
                │      Netlify         │
                └──────────┬───────────┘
                           │ HTTP / JSON
                           ▼
                ┌──────────────────────┐
                │     FastAPI API      │
                │       Render         │
                └──────────┬───────────┘
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  XGBoost Model   │    │ Processed Market │
    │  Property Model  │    │ & Listing Data   │
    └──────────────────┘    └──────────────────┘
```

## 🔌 API Endpoints

Base URL: `https://bricklens-api.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API welcome message |
| GET | `/health` | Checks model and dataset availability |
| POST | `/predict` | Estimates a property's price |
| GET | `/city-comparison` | Returns city-level price comparisons |
| GET | `/nearby?city=Hyderabad` | Returns higher-priced localities for a city |

### Example Prediction Request

```json
{
  "city": "Hyderabad",
  "location": "Kondapur",
  "sqft": 1200,
  "bhk": 2,
  "bath": 2,
  "balcony": 1
}
```

### Example Response

```json
{
  "city": "Hyderabad",
  "location": "Kondapur",
  "predicted_price_lakh": 80.35,
  "market_average": 169.34,
  "price_per_sqft": 7890.81,
  "difference_percent": -52.55,
  "locality_count": 107,
  "similar_properties": [
    {
      "sqft": 1225,
      "bhk": 2,
      "price_lakh": 97.2
    }
  ]
}
```

*Example response from a successful API test; predictions depend on the input and deployed dataset.*

## 🚀 Run Locally

### Prerequisites

- Python 3.12 or a compatible Python version
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/nehareddyk2006/BrickLens.git
cd BrickLens
```

### 2. Set Up the Python Environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Start the Backend

From the repository root:

```bash
uvicorn app:app --app-dir backend --reload --port 8000
```

The API will be available at:

- API: `http://127.0.0.1:8000`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

Ensure the saved model and processed datasets are present at the paths expected by the backend.

### 4. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## 📁 Project Structure

```text
BrickLens/
├── backend/
│   ├── app.py
│   └── models/
│       ├── bricklens_xgb.pkl
│       ├── bricklens_rf.pkl
│       └── features.pkl
├── datasets/
│   ├── raw/
│   └── processed/
│       ├── bricklens_featured.csv
│       └── market_summary.csv
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── data/
│       ├── pages/
│       └── App.jsx
├── ml/
│   ├── data_inspection.ipynb
│   ├── eda.ipynb
│   ├── model_training.ipynb
│   └── preprocessing.ipynb
├── requirements.txt
└── README.md
```

## 🔮 Future Improvements

- Expand the coverage and quality of property listing datasets.
- Add model evaluation metrics and explainability insights to the application.
- Improve handling of localities with limited historical listings.
- Add property filters and richer market trend visualizations.
- Introduce model monitoring and periodic retraining as new data becomes available.

## ⚠️ Disclaimer

BrickLens is an educational and analytical project. Predictions are estimates based on historical listing data and model behavior. They should not be treated as financial advice, official property valuations, or guarantees of market prices.

## 👩‍💻 Author

**BrickLens** — Machine Learning, Data Analytics, and Full-Stack Development Project.

Built to explore how machine learning can support more informed real estate decisions.

---

⭐ If you find this project interesting, consider starring the repository!
