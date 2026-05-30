import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

import { cityData } from "../data/cityData";

function CityChart() {
  return (
    <div className="chart-card">

      <div className="chart-header">
        <h3>Average Property Price</h3>
        <span>Across Major Cities</span>
      </div>

      <ResponsiveContainer
        width="100%"
        height={320}
      >
        <BarChart data={cityData}>
          <defs>

            <linearGradient
              id="priceGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#14B8A6"
              />

              <stop
                offset="100%"
                stopColor="#3B82F6"
              />
            </linearGradient>

          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis dataKey="city" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="price"
            fill="url(#priceGradient)"
            radius={[12,12,0,0]}
          />

        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}

export default CityChart;