import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TuringTest from "@/pages/turing-test";
import Autonomy from "@/pages/autonomy";
import ARCPuzzles from "@/pages/arc-puzzles";
import NeuralTest from "@/pages/neural-test";
import SuperintelligenceTest from "@/pages/superintelligence-test";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/turing-test" component={TuringTest} />
      <Route path="/autonomy" component={Autonomy} />
      <Route path="/arc" component={ARCPuzzles} />
      <Route path="/neural-lab" component={NeuralTest} />
      <Route path="/si-test" component={SuperintelligenceTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
