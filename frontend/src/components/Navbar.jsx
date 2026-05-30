import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        BrickLens
      </div>

      <div className="nav-center">
        <a href="#analytics">Analytics</a>
        <a href="#cities">Cities</a>
        <a href="#insights">Insights</a>
      </div>

      <Link to="/estimate">
        <button className="nav-btn">
          Get Estimate
        </button>
      </Link>

    </nav>
  );
}

export default Navbar;