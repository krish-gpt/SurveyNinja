import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle, X, Loader2 } from 'lucide-react';
import Navbar from '@/components/navbar';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('Missing Stripe public key!');
}

// Initialize Stripe outside the component
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

export default function UpgradePage() {
  const { user } = useAuth();
  const { subscription, syncSubscriptionMutation, cancelSubscriptionMutation } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  
  // Handle sync with Stripe
  const handleSyncSubscription = async () => {
    setSyncLoading(true);
    try {
      await syncSubscriptionMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation itself
      console.error("Sync error:", error);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!stripePromise) {
      toast({
        title: 'Configuration Error',
        description: 'Stripe is not properly configured. Please contact support.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setCheckoutError(null);

    try {
      // Create checkout session on server
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        priceId: import.meta.env.STRIPE_PRICE_ID || 'price_default', // Fallback ID just for safety
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/upgrade`
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCheckoutError(error.message || 'An unexpected error occurred');
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Could not initiate checkout. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDowngrade = async () => {
    if (!window.confirm("Are you sure you want to downgrade to the Free plan? You will lose access to premium features and any data exceeding free plan limits may become inaccessible.")) {
      return;
    }
    
    setIsDowngrading(true);
    try {
      await cancelSubscriptionMutation.mutateAsync();
      toast({
        title: "Plan Downgraded",
        description: "You have been successfully downgraded to the Free plan.",
      });
    } catch (error) {
      // Error handling is done in the mutation itself
      console.error("Downgrade error:", error);
    } finally {
      setIsDowngrading(false);
    }
  };

  // Features lists
  const freeFeatures = [
    'Up to 10 forms',
    'Up to 10 responses per form', 
    'Basic form builder',
    'Public form sharing'
  ];

  const proFeatures = [
    'Unlimited forms',
    'Up to 2000 responses per form',
    'Advanced analytics',
    'Export responses to CSV',
    'Priority support'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="relative">
            {subscription?.plan === 'free' && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Current Plan
              </div>
            )}
            <CardHeader>
              <CardTitle>Free Plan</CardTitle>
              <CardDescription>Get started with the basics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-6">$0 <span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="text-primary h-4 w-4" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {subscription?.plan === 'free' ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center bg-primary/10 text-primary rounded-md py-1.5 px-2 text-sm">
                    Current Plan
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  disabled 
                  className="w-full"
                >
                  Basic Plan
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-primary">
            {subscription?.plan === 'paid' && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                Current Plan
              </div>
            )}
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
              <CardDescription>Everything you need for serious form building</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-6">$9.99 <span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="text-primary h-4 w-4" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {subscription?.plan === 'paid' ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-center bg-primary/10 text-primary rounded-md py-1.5 px-2 text-sm">
                    Current Plan
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleDowngrade} 
                    disabled={isDowngrading}
                    className="w-full text-destructive border-destructive hover:bg-destructive/10"
                  >
                    {isDowngrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downgrading...
                      </>
                    ) : (
                      'Downgrade to Free'
                    )}
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleUpgrade} 
                  disabled={isLoading || !user} 
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade Now'
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {checkoutError && (
          <div className="mt-6 p-4 border border-destructive text-destructive rounded-md">
            <div className="flex gap-2 items-center">
              <X className="h-5 w-5" />
              <p>{checkoutError}</p>
            </div>
          </div>
        )}

        {/* Subscription Troubleshooting */}
        <div className="mt-8 p-4 border border-gray-200 rounded-md">
          <h3 className="font-medium text-lg mb-3">Subscription Troubleshooting</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you're experiencing issues with your subscription or you've paid but your plan status isn't reflecting correctly, 
            try syncing your subscription details with Stripe.
          </p>
          <Button 
            variant="outline" 
            onClick={handleSyncSubscription} 
            disabled={syncLoading}
            className="w-full sm:w-auto"
          >
            {syncLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing with Stripe...
              </>
            ) : (
              'Sync Subscription Status'
            )}
          </Button>
        </div>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Payments securely processed by Stripe</p>
          <p className="mt-2">
            Having issues? <a href="#" className="underline">Contact support</a>
          </p>
        </div>
      </main>
    </div>
  );
}