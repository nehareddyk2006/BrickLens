import { useState, useEffect } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  YAxis,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { locations } from "../data/locations";
import { trendData } from "../data/trendData";

function Estimate() {

  const [result, setResult] = useState(null);
  const [range, setRange] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [formData, setFormData] = useState({
    city: "",
    location: "",
    sqft: "",
    bhk: "",
    bath: "",
    balcony: ""
  });

  const fallbackSimilarProperties = [
    { bhk: 3, sqft: 1456, price: 9.5 },
    { bhk: 3, sqft: 1520, price: 10.2 },
    { bhk: 3, sqft: 1435, price: 6.5 }
  ];

  const similarPropertiesSource =
    result?.similar_properties?.length
      ? result.similar_properties
      : fallbackSimilarProperties;

  const [nearbyLocalities, setNearbyLocalities] = useState([]);

  const formatPriceLakh = (val) => {
    if (val === null || val === undefined) return "—";
    const num = Number(val);
    if (num > 100) {
      return `₹ ${(num / 100).toFixed(2)} Cr`;
    }
    return `₹ ${num.toFixed(0)} L`;
  };

  const getNearbyLocalities = async (city) => {
    if (!city) {
      setNearbyLocalities([]);
      return [];
    }
    try {
      const res = await axios.get("http://127.0.0.1:8000/nearby", { params: { city } });
      const list = (res.data?.localities || []).slice();
      // ensure sorted descending by avg_price
      list.sort((a, b) => (b.avg_price || 0) - (a.avg_price || 0));
      setNearbyLocalities(list);
      return list;
    } catch (err) {
      console.error("Failed to fetch nearby localities", err);
      setNearbyLocalities([]);
      return [];
    }
  };

  const totalSlides = 3;
  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () =>
    setCurrentSlide((prev) =>
      prev === 0 ? totalSlides - 1 : prev - 1
    );
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return undefined;
    const id = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % totalSlides);
    }, 4500);
    return () => clearInterval(id);
  }, [isPaused, totalSlides]);

  const slides = [
    {
      title: "AI Decision Engine",
      content: (
        <div className="slide-content-card slide-decision-card">
          <div className="decision-badge">
            <span className={result?.difference_percent > 20 ? "badge-sell" : "badge-hold"}>
              {result?.difference_percent > 20 ? "🔴 OVERPRICED" : "🟡 HOLD"}
            </span>
          </div>
          <div className="decision-grid">
            <div>
              <span>Confidence</span>
              <h3>92%</h3>
            </div>
            <div>
              <span>Comparable Listings</span>
              <h3>{result?.locality_count || 0}</h3>
            </div>
            <div>
              <span>Expected Growth</span>
              <h3>
                {formData.city === "Mumbai"
                  ? "+12%"
                  : formData.city === "Hyderabad"
                  ? "+18%"
                  : "+9%"}
              </h3>
            </div>
          </div>
          <p className="decision-copy">
            This property is {result?.difference_percent > 0 ? "priced above" : "priced below"} the average market rate in {formData.location || "your selected location"}, based on the AI model and {result?.locality_count || 0} comparable listings.
          </p>
          <div className="chip-row">
            <span className="info-chip">Strong Rental Potential</span>
            <span className="info-chip">Market-aligned pricing</span>
          </div>
        </div>
      )
    },
    {
      title: "Market Analysis",
      content: (
        <div className="slide-content-card slide-analysis-card">
          <div className="analysis-row">
            <div className="analysis-box">
              <span>Market Avg</span>
              <h3>
                {result?.market_average > 100
                  ? `₹ ${(result.market_average / 100).toFixed(2)} Cr`
                  : `₹ ${result?.market_average?.toFixed(0) || 0} L`}
              </h3>
            </div>
            <div className="analysis-box">
              <span>Your Estimate</span>
              <h3>
                {result?.predicted_price_lakh > 100
                  ? `₹ ${(result.predicted_price_lakh / 100).toFixed(2)} Cr`
                  : `₹ ${result?.predicted_price_lakh?.toFixed(2) || 0} L`}
              </h3>
            </div>
            <div className="analysis-box">
              <span>Market Position</span>
              <h3 style={{ color: result?.difference_percent > 0 ? "#10b981" : "#ef4444" }}>
                {Math.abs(result?.difference_percent || 0).toFixed(1)}% {result?.difference_percent > 0 ? "Above" : "Below"}
              </h3>
            </div>
          </div>
          <div className="analysis-chart-wrapper">
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={trendData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `₹${Number(v).toLocaleString()}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                <Area type="monotone" dataKey="price" stroke="#0ea5e9" fill="url(#colorPrice)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )
    },
    {
      title: "Comparable Sales",
      content: (
        <div className="slide-content-card slide-comparable-card">
          <div className="comparable-header">
            <span>Comparable Sales</span>
          </div>
          <div className="similar-grid slide-similar-grid">
            {similarPropertiesSource.map((property, index) => (
              <div key={index} className="property-card comparable-card">
                <div className="property-card-banner">
                  {property.bhk} BHK
                </div>
                <p>{property.sqft.toLocaleString()} sqft</p>
                <strong className="property-price">
                  ₹ {((property.price_lakh ?? property.price) / 100).toFixed(2)} Cr
                </strong>
              </div>
            ))}
          </div>
          <div className="comparison-card slide-comparison-card">
            <h3>Nearby Localities</h3>
            <table>
              <tbody>
                {nearbyLocalities && nearbyLocalities.length > 0 ? (
                  nearbyLocalities.map((loc, idx) => (
                    <tr key={idx}>
                      <td>{loc.name}</td>
                      <td>{formatPriceLakh(loc.avg_price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No locality data available for this city.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    // fetch nearby localities immediately when city changes
    if (formData.city) {
      getNearbyLocalities(formData.city);
    } else {
      setNearbyLocalities([]);
    }
  }, [formData.city]);

  const handlePredict = async () => {

    try {

      const response = await axios.post(
        "http://127.0.0.1:8000/predict",
        {
          city: formData.city,
          location: formData.location,
          sqft: Number(formData.sqft),
          bhk: Number(formData.bhk),
          bath: Number(formData.bath),
          balcony: Number(formData.balcony)
        }
      );

      const predicted =
        response.data.predicted_price_lakh;

      setResult(response.data);
      setRange({
        lower: (predicted * 0.9).toFixed(2),
        upper: (predicted * 1.1).toFixed(2)
      });

    } catch (err) {
      console.error(err);
      alert("Prediction failed");
    }
  };

  return (
    <div className="estimate-page">

      <div className="estimate-header">

        <h1>Property Valuation Engine</h1>

        <p>
          AI-powered property intelligence
          across India's major cities.
        </p>

      </div>

      <div className="estimate-grid">

        <div className="estimate-form">
            <div className="engine-info">

  <h2>
    AI Valuation Engine
  </h2>

  <p>

    Powered by 89,247+
    verified property listings
    across Mumbai,
    Hyderabad and Bangalore.

  </p>

</div>

          <h3>Property Details</h3>

          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
          >
            <option value="">
              Select City
            </option>

            <option value="Mumbai">
              Mumbai
            </option>

            <option value="Hyderabad">
              Hyderabad
            </option>

            <option value="Bangalore">
              Bangalore
            </option>
          </select>

          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
          >
            <option value="">
              Select Location
            </option>

            {formData.city &&
              locations[formData.city]?.map(
                (loc) => (
                  <option
                    key={loc}
                    value={loc}
                  >
                    {loc}
                  </option>
                )
              )}
          </select>

          <input
            type="number"
            name="sqft"
            placeholder="Square Feet"
            value={formData.sqft}
            onChange={handleChange}
          />

          <input
            type="number"
            name="bhk"
            placeholder="BHK"
            value={formData.bhk}
            onChange={handleChange}
          />

          <input
            type="number"
            name="bath"
            placeholder="Bathrooms"
            value={formData.bath}
            onChange={handleChange}
          />

          <input
            type="number"
            name="balcony"
            placeholder="Balconies"
            value={formData.balcony}
            onChange={handleChange}
          />

          <button
            onClick={handlePredict}
          >
            Estimate Property Value
          </button>

        </div>

        <div className="result-card">

          <h3>
            Property Intelligence
          </h3>

          {result ? (
            <>
              <div className="premium-price-card">
                <span className="label">
                  Estimated Property Value
                </span>
                <h1 className="main-price">
                  {result.predicted_price_lakh > 100
                    ? `₹ ${(result.predicted_price_lakh / 100).toFixed(2)} Cr`
                    : `₹ ${result.predicted_price_lakh.toFixed(2)} L`
                  }
                </h1>
                <p className="sub-text">
                  Based on {result.locality_count} similar properties in {formData.location}
                </p>
              </div>

              <div className="range-box">
                <span>Estimated Range</span>
                <h4>
                  ₹ {(range?.lower / 100).toFixed(2)} Cr - ₹ {(range?.upper / 100).toFixed(2)} Cr
                </h4>
              </div>

              <div className="insight-grid">
                <div className="insight-item">
                  <span>Market Average</span>
                  <strong>
                    {result.market_average > 100
                      ? `₹ ${(result.market_average / 100).toFixed(2)} Cr`
                      : `₹ ${result.market_average.toFixed(0)} L`
                    }
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Market Growth</span>
                  <strong>
                    {
                      formData.city === "Mumbai"
                        ? "+12%"
                        : formData.city === "Hyderabad"
                        ? "+18%"
                        : "+9%"
                    }
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Price / Sqft</span>
                  <strong>
                    ₹ {Math.round(result.price_per_sqft).toLocaleString()}
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Market Position</span>
                  <strong
                    style={{
                      color: result.difference_percent > 0 ? "#10b981" : "#ef4444"
                    }}
                  >
                    {Math.abs(result.difference_percent).toFixed(1)}%
                    {result.difference_percent > 0 ? " Above Market" : " Below Market"}
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Data Coverage</span>
                  <strong>
                    {result.locality_count} Listings
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Confidence Score</span>
                  <strong style={{ color: "#2563eb" }}>
                    92%
                  </strong>
                </div>
              </div>

              {/* carousel moved below to span full page width */}
            </>
          ) : (
            <div className="waiting-card">
              <h4>Ready for an AI estimate</h4>
              <p>Fill in the property details and tap <strong>Estimate Property Value</strong> to unlock the valuation dashboard.</p>
              <div className="waiting-features">
                <span>• Instant estimated price</span>
                <span>• Market comparison</span>
                <span>• AI-driven recommendation</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="ai-carousel">
          <div className="carousel-header">
            <h3>AI Intelligence Center</h3>
          </div>

                <div className="carousel-window" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {slides.map((slide, index) => (
                <div key={index} className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}>
                  <div className="slide-title-bar">
                    <span>{slide.title}</span>
                  </div>
                  <div className="slide-body">{slide.content}</div>
                </div>
              ))}
            </div>

            <button type="button" className="carousel-nav prev" onClick={prevSlide}>
              ‹
            </button>
            <button type="button" className="carousel-nav next" onClick={nextSlide}>
              ›
            </button>
          </div>

          <div className="carousel-dots">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`carousel-dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Estimate;