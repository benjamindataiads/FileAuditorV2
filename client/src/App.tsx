import React from "react";
import { Route, Switch } from "react-router-dom";
import { Home } from "./pages/Home";
import { AuditResults } from "./pages/AuditResults";
import { RuleLibrary } from "./pages/RuleLibrary";
import { CreateRule } from "./pages/CreateRule";
import { EditRule } from "./pages/EditRule";
import { AuditHistory } from "./pages/AuditHistory";

function App() {
  return (
    <div className="App">
      <main className="container mx-auto py-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/rule-library" component={RuleLibrary} />
          <Route path="/create-rule" component={CreateRule} />
          <Route path="/rule-edit" component={EditRule} />
          <Route path="/audit/:id" component={AuditResults} />
          <Route path="/audits" component={AuditHistory} />
        </Switch>
      </main>
    </div>
  );
}

export default App;