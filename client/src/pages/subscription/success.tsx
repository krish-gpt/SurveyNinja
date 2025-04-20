import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '@/components/navbar';

export default function SubscriptionSuccessPage() {
  const [, setLocation] = useLocation();
  const { subscription, syncSubscriptionMutation } = useSubscription();
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncAttempts, setSyncAttempts] = useState(0);
  const MAX_SYNC_ATTEMPTS = 3;

  // Sync subscription with Stripe upon page load
  useEffect(() => {
    const syncSubscription = async () => {
      setIsSyncing(true);
      try {
        await syncSubscriptionMutation.mutateAsync();
        setIsSyncing(false);
      } catch (error) {
        console.error('Error syncing subscription:', error);
        setIsSyncing(false);
      }
    };

    syncSubscription();
  }, [syncSubscriptionMutation]);

  // If we still don't have paid status after first sync, try again
  useEffect(() => {
    if (!isSyncing && subscription && subscription.plan !== 'paid' && syncAttempts < MAX_SYNC_ATTEMPTS) {
      const timer = setTimeout(() => {
        setSyncAttempts(prev => prev + 1);
        syncSubscriptionMutation.mutate();
      }, 2000); // Try again after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [subscription, isSyncing, syncAttempts, syncSubscriptionMutation]);

  // Redirect if not a paid user after multiple sync attempts
  useEffect(() => {
    if (!isSyncing && syncAttempts >= MAX_SYNC_ATTEMPTS && subscription && subscription.plan !== 'paid') {
      setLocation('/subscription/upgrade');
    }
  }, [subscription, syncAttempts, isSyncing, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container max-w-md mx-auto px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-3 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-center text-lg mt-2">
              Your subscription was successful
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {isSyncing ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p>Updating your subscription status...</p>
                <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
              </div>
            ) : (
              <>
                <p className="mb-6">
                  Welcome to FormPulse Pro! Your subscription is now active, and you have access to all premium features.
                </p>
                
                <h3 className="font-medium text-lg mb-3">You now have access to:</h3>
                <ul className="text-left space-y-2 mb-6 mx-auto max-w-xs">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Unlimited forms</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Up to 2000 responses per form</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Export responses to CSV</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button asChild className="w-full" disabled={isSyncing}>
              <Link href="/forms">
                Create your first form <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full" disabled={isSyncing}>
              <Link href="/">
                Go to Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help? <a href="#" className="underline">Contact support</a>
        </p>
      </main>
    </div>
  );
}