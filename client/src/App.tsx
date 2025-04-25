import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Profile from "@/pages/profile";
import ContactUs from "@/pages/contact-us";
import FormsPage from "@/pages/forms";
import FormBuilder from "@/pages/forms/form-builder";
import FormView from "@/pages/forms/form-view";
import ResponseViewer from "@/pages/forms/response-viewer";
import ResponseSubmitted from "@/pages/response-submitted";
import PublishedFormsPage from "@/pages/published-forms";
import Upgrade from "@/pages/subscription/upgrade";
import SubscriptionSuccess from "@/pages/subscription/success";
import { AuthProvider } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/contact" component={ContactUs} />
      <ProtectedRoute path="/forms" component={FormsPage} />
      <ProtectedRoute path="/forms/new" component={FormBuilder} />
      <ProtectedRoute path="/forms/:id/edit" component={FormBuilder} />
      <ProtectedRoute path="/forms/:id/responses" component={ResponseViewer} />
      <ProtectedRoute path="/published-forms" component={PublishedFormsPage} />
      <ProtectedRoute path="/published-forms/:id/responses" component={ResponseViewer} />
      <Route path="/form/:id" component={FormView} />
      <Route path="/response-submitted" component={ResponseSubmitted} />
      <ProtectedRoute path="/subscription/upgrade" component={Upgrade} />
      <ProtectedRoute path="/subscription/success" component={SubscriptionSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <SubscriptionProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
