import { Switch, Route } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Home } from "@/pages/Home";
import { RuleLibrary } from "@/pages/RuleLibrary";
import { CreateRule } from "@/pages/CreateRule";
import { AuditResults } from "@/pages/AuditResults";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/rules" component={RuleLibrary} />
          <Route path="/create-rule" component={CreateRule} />
          <Route path="/audit/:id" component={AuditResults} />
          <Route>404 Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;
