/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import React, { Suspense, lazy } from "react";

// @ts-ignore
import "./assets/app.sass";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Loading from "./components/common/Loading";

const Home = lazy(() => import("./pages/Home"));
const Admin = lazy(() => import("./pages/Admin"));

/**
 *
 * @returns
 */
function App() {
  return (
    <Router>
      <div className="App">
        <Suspense fallback={<Loading>Loading...</Loading>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default React.memo(App);
