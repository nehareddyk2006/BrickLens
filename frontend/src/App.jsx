import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Estimate from "./pages/Estimate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/estimate"
          element={<Estimate />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;