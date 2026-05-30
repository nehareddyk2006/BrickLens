import CityChart from "./CityChart";

function Hero() {
  return (
    <section className="hero">

      <div className="hero-left">

        <div className="hero-badge">
          AI-Powered Property Intelligence
        </div>

        <h1>
          Understand India's
          <br />
          Real Estate Market
          <br />
          Before You Invest
        </h1>

        <p>
          Analyze property values across Mumbai,
          Bangalore and Hyderabad using machine
          learning trained on 89,000+ listings.
        </p>

        <div className="hero-buttons">
          <a href="/estimate" className="primary-btn">
            Get Property Estimate
          </a>

          <button className="secondary-btn">
            Explore Analytics
          </button>
        </div>

      </div>

      <div className="hero-right">
        <CityChart />
      </div>

    </section>
  );
}

export default Hero;