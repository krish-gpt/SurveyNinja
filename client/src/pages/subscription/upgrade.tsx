import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Make sure to load Stripe outside component render
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Payment failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
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
}

export default function Upgrade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  
  // Fetch subscription status
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });
  
  useEffect(() => {
    if (user && user.plan !== "paid" && !clientSecret) {
      // Create subscription session
      apiRequest("POST", "/api/create-subscription")
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Failed to initialize payment",
            description: error.message,
            variant: "destructive",
          });
        });
    }
  }, [user, clientSecret, toast]);
  
  // Handler for canceling subscription
  const handleCancelSubscription = async () => {
    try {
      await apiRequest("POST", "/api/cancel-subscription");
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will be cancelled at the end of the current billing period",
      });
    } catch (error: any) {
      toast({
        title: "Failed to cancel subscription",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="mt-2 text-lg text-gray-600">
            Choose the right plan for your needs
          </p>
          
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Free Plan */}
            <Card className={`border ${user?.plan === "free" ? "border-primary" : "border-gray-200"}`}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-bold">Free Plan</CardTitle>
                    <CardDescription className="mt-1">For individuals just getting started</CardDescription>
                  </div>
                  {user?.plan === "free" && (
                    <Badge className="bg-primary text-white">Current Plan</Badge>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-gray-500 ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Create up to 10 forms</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Collect up to 10 responses per form</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Basic form elements</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Export responses as CSV</span>
                  </li>
                </ul>
                
                {user?.plan === "paid" && (
                  <Button 
                    className="w-full mt-6" 
                    variant="outline"
                    onClick={handleCancelSubscription}
                  >
                    Downgrade to Free
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Pro Plan */}
            <Card className={`border ${user?.plan === "paid" ? "border-primary" : "border-gray-200"}`}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-bold">Pro Plan</CardTitle>
                    <CardDescription className="mt-1">For professionals and businesses</CardDescription>
                  </div>
                  {user?.plan === "paid" && (
                    <Badge className="bg-primary text-white">Current Plan</Badge>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-bold">$10</span>
                  <span className="text-gray-500 ml-1">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Create up to 1,000 forms</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Collect up to 2,000 responses per form</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Advanced form elements</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Advanced analytics and reporting</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
                
                {user?.plan !== "paid" && (
                  <div className="mt-6">
                    {!stripePromise ? (
                      <div className="bg-amber-100 p-4 rounded-md flex items-start gap-2 text-sm">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Stripe not configured</p>
                          <p className="text-amber-700">Payment functionality is unavailable in this demo.</p>
                        </div>
                      </div>
                    ) : clientSecret ? (
                      <Elements
                        stripe={stripePromise}
                        options={{ clientSecret, appearance: { theme: 'stripe' } }}
                      >
                        <CheckoutForm />
                      </Elements>
                    ) : (
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
            
            {isLoadingSubscription ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between pb-2 border-b">
                  <span className="font-medium">Current Plan:</span>
                  <span className="capitalize">{user?.plan || "Free"}</span>
                </div>
                
                {user?.plan === "paid" && (
                  <>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="font-medium">Billing Cycle:</span>
                      <span>Monthly</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b">
                      <span className="font-medium">Next Billing Date:</span>
                      <span>
                        {user.paymentDate 
                          ? new Date(new Date(user.paymentDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() 
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={handleCancelSubscription}>
                        Cancel Subscription
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
