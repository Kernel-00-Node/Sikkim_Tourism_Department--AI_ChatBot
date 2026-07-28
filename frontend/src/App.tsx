/**
 * Root application component.
 * Wraps the router and shared UI providers (tooltip, toaster).
 */
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Destinations from "@/pages/destinations";
import Demo from "@/pages/demo";
import { Layout } from "@/components/layout";

function App() {
  return (
    <TooltipProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/destinations" component={Destinations} />
            <Route path="/demo" component={Demo} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
