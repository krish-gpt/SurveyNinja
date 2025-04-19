import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import FormsPage from "@/pages/forms";
import FormBuilder from "@/pages/forms/form-builder";
import FormView from "@/pages/forms/form-view";
import ResponseViewer from "@/pages/forms/response-viewer";
import ResponsesPage from "@/pages/responses";
import ResponseSubmitted from "@/pages/response-submitted";
import Upgrade from "@/pages/subscription/upgrade";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/forms" component={FormsPage} />
      <ProtectedRoute path="/forms/new" component={FormBuilder} />
      <ProtectedRoute path="/forms/:id/edit" component={FormBuilder} />
      <ProtectedRoute path="/forms/:id/responses" component={ResponseViewer} />
      <ProtectedRoute path="/responses" component={ResponsesPage} />
      <Route path="/form/:id" component={FormView} />
      <Route path="/response-submitted" component={ResponseSubmitted} />
      <ProtectedRoute path="/upgrade" component={Upgrade} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
