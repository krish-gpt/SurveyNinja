import { useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useLocation } from 'wouter';

// Main subscription page
export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Handle checkout session creation
  const handleSubscribe = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/create-checkout-session");
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.success && data.message === "Already subscribed") {
        toast({
          title: "Already Subscribed",
          description: "You are already subscribed to the Pro plan.",
        });
        setLocation("/dashboard");
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start subscription process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Features included in the pro plan
  const features = [
    "Unlimited form submissions",
    "Advanced analytics",
    "Custom branding",
    "Priority support",
    "Export responses to CSV",
    "Conditional logic for forms",
  ];
  
  // If user is already on pro plan
  if (subscription?.plan === "pro") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <main className="py-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-900">You're already subscribed!</h1>
              <p className="mt-4 text-xl text-gray-600">
                You're currently on the Pro plan with all premium features.
              </p>
              
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center text-2xl">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mr-2" />
                      Pro Plan Active
                    </CardTitle>
                    <CardDescription className="text-center text-lg">
                      Thank you for your support!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-gray-700 mb-4">
                        Your subscription is active and automatically renews monthly.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Return to Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">Upgrade to Pro</h1>
            <p className="mt-4 text-xl text-gray-600">
              Get unlimited access to all premium features
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Features column */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Pro Plan Features</CardTitle>
                  <CardDescription>
                    Everything you need for professional form building
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-gray-500">
                    Cancel anytime. No long-term commitment.
                  </p>
                </CardFooter>
              </Card>
            </div>
            
            {/* Payment column */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Subscribe to Pro</CardTitle>
                  <CardDescription>
                    $19/month - Unlock all premium features
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center">
                  <p className="mb-6 text-gray-600">
                    Join our Pro plan today and take your form building to the next level. 
                    We use Stripe for secure payment processing.
                  </p>
                  
                  <Button 
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Subscribe Now - $19/month"
                    )}
                  </Button>
                  
                  <p className="mt-4 text-sm text-gray-500">
                    You'll be redirected to Stripe's secure checkout page.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}