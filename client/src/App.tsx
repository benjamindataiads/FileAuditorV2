
import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { AuditResults } from "./pages/AuditResults";
import { RuleLibrary } from "./pages/RuleLibrary";
import { CreateRule } from "./pages/CreateRule";
import { EditRule } from "./pages/EditRule";
import { AuditHistory } from "./pages/AuditHistory";
import { Navigation } from "./components/Navigation";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation />
        <main className="container mx-auto py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rule-library" element={<RuleLibrary />} />
            <Route path="/create-rule" element={<CreateRule />} />
            <Route path="/rule-edit/:id" element={<EditRule />} />
            <Route path="/audit/:id" element={<AuditResults />} />
            <Route path="/audits" element={<AuditHistory />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
