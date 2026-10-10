
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function CityChart() {
  const [cityData, setCityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/city-comparison`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load city comparison");
        }
        return response.json();
      })
      .then((data) => {
        if (active) setCityData(data.cities || []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatLakhs = (value) =>
    `₹${Number(value).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}L`;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Average Property Price</h3>
        <span>Across Major Cities · ₹ lakh</span>
      </div>

      {loading ? (
        <p>Loading city comparison...</p>
      ) : error ? (
        <p>Unable to load city data. Please try again later.</p>
      ) : cityData.length === 0 ? (
        <p>No city comparison data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={cityData}>
            <defs>
              <linearGradient
                id="priceGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis tickFormatter={formatLakhs} />
            <Tooltip
              formatter={(value) => [
                `₹${Number(value).toFixed(2)} lakh`,
                "Average price",
              ]}
            />
            <Bar
              dataKey="price"
              name="Average price"
              fill="url(#priceGradient)"
              radius={[12, 12, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default CityChart;
