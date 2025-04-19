import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { queryClient } from '@/lib/queryClient';

// Load Stripe outside component to avoid recreating on each render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Payment form component
const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/dashboard',
        },
      });
      
      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Success will redirect to return_url
        toast({
          title: "Payment Successful",
          description: "You are now subscribed to the Pro plan!",
        });
        
        // Refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Subscribe Now"
        )}
      </Button>
    </form>
  );
};

// Main subscription page
export default function UpgradePage() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { subscription } = useSubscription();
  
  useEffect(() => {
    // Don't create subscription if user already has one
    if (subscription?.plan === "pro") {
      setIsLoading(false);
      return;
    }
    
    // Create subscription
    setIsLoading(true);
    apiRequest("POST", "/api/get-or-create-subscription")
      .then((res) => res.json())
      .then((data) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Subscription error:", error);
        setIsLoading(false);
      });
  }, [subscription]);
  
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
                <CardContent>
                  {isLoading || !clientSecret ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <SubscribeForm />
                    </Elements>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}