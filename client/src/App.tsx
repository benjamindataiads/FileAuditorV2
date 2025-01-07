import { Switch, Route } from "wouter";
import { Navigation } from "@/components/Navigation";
import React, { Suspense } from "react";
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
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
          <Suspense fallback={<div>Loading...</div>}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/rules" component={RuleLibrary} />
              <Route path="/create-rule" component={CreateRule} />
              <Route path="/audit/:id" component={AuditResults} />
              <Route path="/audits" component={AuditHistory} />
              <Route>404 Not Found</Route>
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default App;
