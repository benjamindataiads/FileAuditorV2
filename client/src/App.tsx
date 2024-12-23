import { Switch, Route } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Home } from "@/pages/Home";
import { RuleLibrary } from "@/pages/RuleLibrary";
import { CreateRule } from "@/pages/CreateRule";
import { AuditResults } from "@/pages/AuditResults";
import { AuditHistory } from "@/pages/AuditHistory";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto py-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/rules" component={RuleLibrary} />
          <Route path="/create-rule" component={CreateRule} />
          <Route path="/audit/:id" component={AuditResults} />
          <Route path="/audits" component={AuditHistory} />
          <Route>404 Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;
