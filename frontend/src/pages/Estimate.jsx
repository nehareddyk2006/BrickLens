
import { useState, useEffect } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  YAxis,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { locations } from "../data/locations";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Estimate() {
  const [result, setResult] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [nearbyLocalities, setNearbyLocalities] = useState([]);
  const [cityComparison, setCityComparison] = useState([]);
  const [comparisonError, setComparisonError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    city: "",
    location: "",
    sqft: "",
    bhk: "",
    bath: "",
    balcony: "",
  });

  const formatPriceLakh = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
      return "Unavailable";
    }

    const amount = Number(value);

    if (amount >= 100) {
      return `₹${(amount / 100).toFixed(2)} Cr`;
    }

    return `₹${amount.toFixed(2)} lakh`;
  };

  const getNearbyLocalities = async (city) => {
    if (!city) {
      setNearbyLocalities([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/nearby`, {
        params: { city },
      });

      const list = (response.data?.localities || []).slice();
      list.sort((a, b) => (b.avg_price || 0) - (a.avg_price || 0));

      setNearbyLocalities(list);
    } catch (error) {
      console.error("Failed to fetch nearby localities:", error);
      setNearbyLocalities([]);
    }
  };

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_BASE_URL}/city-comparison`)
      .then((response) => {
        if (active) {
          setCityComparison(response.data?.cities || []);
          setComparisonError(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load city comparison:", error);

        if (active) {
          setCityComparison([]);
          setComparisonError(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    getNearbyLocalities(formData.city);
  }, [formData.city]);

  const totalSlides = 3;

  const nextSlide = () =>
    setCurrentSlide((previous) => (previous + 1) % totalSlides);

  const prevSlide = () =>
    setCurrentSlide((previous) =>
      previous === 0 ? totalSlides - 1 : previous - 1
    );

  useEffect(() => {
    if (isPaused || !result) return undefined;

    const timer = setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % totalSlides);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused, result]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "city" ? value : value,
      ...(name === "city" ? { location: "" } : {}),
    }));

    setErrorMessage("");
  };
  const handlePredict = async () => {
    setErrorMessage("");
    setResult(null);

    if (
      !formData.city ||
      !formData.location ||
      !formData.sqft ||
      !formData.bhk ||
      !formData.bath ||
      formData.balcony === ""
    ) {
      setErrorMessage("Please fill in all property details.");
      return;
    }

    const sqft = Number(formData.sqft);
    const bhk = Number(formData.bhk);
    const bath = Number(formData.bath);
    const balcony = Number(formData.balcony);

    if (
      !Number.isFinite(sqft) ||
      !Number.isFinite(bhk) ||
      !Number.isFinite(bath) ||
      !Number.isFinite(balcony) ||
      sqft <= 0 ||
      bhk <= 0 ||
      bath <= 0 ||
      balcony < 0
    ) {
      setErrorMessage(
        "Enter valid property details. Area and room counts must be positive; balconies cannot be negative."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, {
        city: formData.city,
        location: formData.location,
        sqft,
        bhk,
        bath,
        balcony,
      });

      setResult(response.data);
      setCurrentSlide(0);
    } catch (error) {
      console.error("Prediction failed:", error);

      setErrorMessage(
        error.response?.data?.detail ||
          "Prediction failed. Check that the BrickLens backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const similarProperties = result?.similar_properties || [];

  const slides = [
    {
      title: "Property Market Insights",
      content: (
        <div className="slide-content-card slide-decision-card">
          <div className="decision-grid">
            <div>
              <span>Predicted Property Value</span>
              <h3>{formatPriceLakh(result?.predicted_price_lakh)}</h3>
            </div>

            <div>
              <span>Locality Listings</span>
              <h3>{result?.locality_count ?? "Unavailable"}</h3>
            </div>

            <div>
              <span>Price per Sqft</span>
              <h3>
                {result?.price_per_sqft != null
                  ? `₹${Number(result.price_per_sqft).toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}`
                  : "Unavailable"}
              </h3>
            </div>
          </div>

          {result?.market_average != null &&
          result?.difference_percent != null ? (
            <p className="decision-copy">
              The model estimate is{" "}
              {Math.abs(result.difference_percent).toFixed(1)}%{" "}
              {result.difference_percent > 0 ? "above" : "below"} the
              recorded average for {formData.location}, based on the available
              locality data. This comparison is indicative, not a guarantee of
              market value.
            </p>
          ) : result?.locality_count != null ? (
            <p className="decision-copy">
              A prediction is available, but the locality comparison is based on
              only {result.locality_count} listing(s) in the processed market
              data, so this difference is low-sample and should be treated as
              indicative only.
            </p>
          ) : (
            <p className="decision-copy">
              A prediction is available, but a reliable locality comparison
              could not be calculated from the available data.
            </p>
          )}
        </div>
      ),
    },
    {
      title: "Market Analysis",
      content: (
        <div className="slide-content-card slide-analysis-card">
          <div className="analysis-row">
            <div className="analysis-box">
              <span>Locality Average</span>
              <h3>{formatPriceLakh(result?.market_average)}</h3>
            </div>

            <div className="analysis-box">
              <span>Your Estimate</span>
              <h3>{formatPriceLakh(result?.predicted_price_lakh)}</h3>
            </div>

            <div className="analysis-box">
              <span>Market Position</span>
              <h3
                style={{
                  color:
                    result?.difference_percent == null
                      ? "#64748b"
                      : result.difference_percent > 0
                      ? "#ef4444"
                      : "#10b981",
                }}
              >
                {result?.difference_percent == null
                  ? "Unavailable"
                  : `${Math.abs(result.difference_percent).toFixed(1)}% ${
                      result.difference_percent > 0 ? "Above" : "Below"
                    }`}
              </h3>
            </div>
          </div>

          <div className="analysis-chart-wrapper">
            <div style={{ marginBottom: 16 }}>
              <h3>Average Property Price by City</h3>
              <p style={{ color: "#64748b", fontSize: 13 }}>
                Dataset-derived locality averages · Values in ₹ lakh
              </p>
            </div>

            {comparisonError ? (
              <p>
                City comparison could not be loaded. Check the backend
                connection and refresh the page.
              </p>
            ) : cityComparison.length === 0 ? (
              <p>Loading city comparison...</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={cityComparison}
                  margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="cityPriceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#14b8a6"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="95%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.08}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    dataKey="city"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}L`}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `₹${Number(value).toFixed(2)} lakh`,
                      "Average property price",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#0ea5e9"
                    fill="url(#cityPriceGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Comparable Sales",
      content: (
        <div className="slide-content-card slide-comparable-card">
          <div className="comparable-header">
            <span>Comparable Properties</span>
          </div>

          {similarProperties.length > 0 ? (
            <div className="similar-grid slide-similar-grid">
              {similarProperties.map((property, index) => (
                <div
                  key={`${property.sqft}-${property.bhk}-${index}`}
                  className="property-card comparable-card"
                >
                  <div className="property-card-banner">
                    {property.bhk} BHK
                  </div>

                  <p>{Number(property.sqft).toLocaleString("en-IN")} sqft</p>

                  <strong className="property-price">
                    {formatPriceLakh(
                      property.price_lakh ?? property.price
                    )}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p>
              No exact city + locality matches were found in the processed
              property dataset for this selection.
            </p>
          )}

          <div className="comparison-card slide-comparison-card">
            <h3>Localities in {formData.city}</h3>

            <table>
              <tbody>
                {nearbyLocalities.length > 0 ? (
                  nearbyLocalities.map((locality, index) => (
                    <tr key={`${locality.name}-${index}`}>
                      <td>
                        <div>{locality.name}</div>
                        <small style={{ color: "#64748b" }}>
                          {locality.count ?? 0} listing
                          {Number(locality.count) === 1 ? "" : "s"}
                        </small>
                      </td>
                      <td>
                        <div>{formatPriceLakh(locality.avg_price)}</div>
                        {Number(locality.count) <= 1 && (
                          <small style={{ color: "#b45309" }}>
                            Low-sample average
                          </small>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">
                      No locality data available for this city.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="estimate-page">
      <div className="estimate-header">
        <h1>Property Valuation Engine</h1>
        <p>
          AI-powered property intelligence across India's major cities.
        </p>
      </div>

      <div className="estimate-grid">
        <div className="estimate-form">
          <div className="engine-info">
            <h2>AI Valuation Engine</h2>
            <p>
              Explore property estimates using historical listings from
              Mumbai, Hyderabad, and Bangalore.
            </p>
          </div>

          <h3>Property Details</h3>

          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          >
            <option value="">Select City</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Bangalore">Bangalore</option>
          </select>

          <select
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            disabled={!formData.city}
          >
            <option value="">Select Location</option>

            {formData.city &&
              locations[formData.city]?.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
          </select>

          <input
            type="number"
            name="sqft"
            placeholder="Square Feet"
            min="1"
            step="1"
            value={formData.sqft}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="bhk"
            placeholder="BHK"
            min="1"
            step="1"
            value={formData.bhk}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="bath"
            placeholder="Bathrooms"
            min="1"
            step="1"
            value={formData.bath}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="balcony"
            placeholder="Balconies"
            min="0"
            step="1"
            value={formData.balcony}
            onChange={handleChange}
            required
          />

          <button onClick={handlePredict} disabled={loading}>
            {loading ? "Calculating..." : "Estimate Property Value"}
          </button>

          {errorMessage && (
            <p role="alert" style={{ color: "#dc2626", marginTop: 12 }}>
              {errorMessage}
            </p>
          )}
        </div>

        <div className="result-card">
          <h3>Property Intelligence</h3>

          {result ? (
            <>
              <div className="premium-price-card">
                <span className="label">Estimated Property Value</span>

                <h1 className="main-price">
                  {formatPriceLakh(result.predicted_price_lakh)}
                </h1>

                <p className="sub-text">
                  Model estimate for {formData.location}, {formData.city}.
                  This is an estimate, not a guaranteed sale price.
                </p>
              </div>

              <div className="insight-grid">
                <div className="insight-item">
                  <span>Locality Average</span>
                  <strong>
                    {formatPriceLakh(result.market_average)}
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Price / Sqft</span>
                  <strong>
                    {result.price_per_sqft != null
                      ? `₹${Number(result.price_per_sqft).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 0 }
                        )}`
                      : "Unavailable"}
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Market Position</span>
                  <strong
                    style={{
                      color:
                        result.difference_percent == null
                          ? "#64748b"
                          : result.difference_percent > 0
                          ? "#ef4444"
                          : "#10b981",
                    }}
                  >
                    {result.difference_percent == null
                      ? "Unavailable"
                      : `${Math.abs(result.difference_percent).toFixed(1)}% ${
                          result.difference_percent > 0
                            ? "Above Market"
                            : "Below Market"
                        }`}
                  </strong>
                </div>

                <div className="insight-item">
                  <span>Locality Listings</span>
                  <strong>{result.locality_count ?? "Unavailable"}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="waiting-card">
              <h4>Ready for a property estimate?</h4>
              <p>
                Enter the property details and select{" "}
                <strong>Estimate Property Value</strong> to view the valuation
                and available market comparisons.
              </p>

              <div className="waiting-features">
                <span>Instant price estimate</span>
                <span>City and locality comparison</span>
                <span>Comparable property data when available</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="ai-carousel">
          <div className="carousel-header">
            <h3>Property Intelligence Center</h3>
          </div>

          <div
            className="carousel-window"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="carousel-track"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {slides.map((slide, index) => (
                <div
                  key={slide.title}
                  className={`carousel-slide ${
                    index === currentSlide ? "active" : ""
                  }`}
                >
                  <div className="slide-title-bar">
                    <span>{slide.title}</span>
                  </div>

                  <div className="slide-body">{slide.content}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="carousel-nav prev"
              onClick={prevSlide}
              aria-label="Previous slide"
            >
              ‹
            </button>

            <button
              type="button"
              className="carousel-nav next"
              onClick={nextSlide}
              aria-label="Next slide"
            >
              ›
            </button>
          </div>

          <div className="carousel-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={`carousel-dot ${
                  index === currentSlide ? "active" : ""
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to ${slide.title}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Estimate;
