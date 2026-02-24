import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import UploadResults from "@/pages/upload";
import Students from "@/pages/students";
import StudentProfile from "@/pages/student-profile";
import Reports from "@/pages/reports";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // Handled by Layout
  if (!user) return <Redirect to="/login" />;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/upload" component={() => <ProtectedRoute component={UploadResults} />} />
      <Route path="/students" component={() => <ProtectedRoute component={Students} />} />
      <Route path="/students/:id" component={() => <ProtectedRoute component={StudentProfile} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />

      {/* Fallback to 404 */}
      <Route component={() => (
        <Layout>
          <NotFound />
        </Layout>
      )} />
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
