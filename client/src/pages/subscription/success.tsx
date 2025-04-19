import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);

  // Verify subscription when the page loads
  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // We'll call our verification endpoint to make sure the subscription is active
        const response = await apiRequest(
          'POST', 
          '/api/test-subscription-verification', 
          {}
        );
        
        if (!response.ok) {
          throw new Error('Failed to verify subscription');
        }
        
        const result = await response.json();
        
        // Show subscription status change
        if (result.planChanged) {
          toast({
            title: 'Subscription Active!',
            description: 'Your account has been upgraded to the Pro plan.',
          });
        }
        
        setVerificationComplete(true);
      } catch (error) {
        console.error('Verification error:', error);
        toast({
          title: 'Verification Error',
          description: 'There was an issue verifying your subscription. Your account will be updated soon.',
          variant: 'destructive'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    if (!isSubscriptionLoading) {
      verifySubscription();
    }
  }, [isSubscriptionLoading, toast]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (isSubscriptionLoading || isVerifying) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">Verifying subscription...</h2>
        <p className="text-muted-foreground">This may take a few seconds</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-12">
      <Card className="border-primary">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription className="text-lg mt-2">
            {subscription?.plan === 'paid' 
              ? 'Your subscription has been successfully activated' 
              : 'Your payment has been processed successfully'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-6">
          <div className="border rounded-md p-4 bg-muted/30 space-y-3">
            <h3 className="font-medium">Pro Plan Features Now Available:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="text-primary h-4 w-4" />
                <span>Create unlimited forms</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-primary h-4 w-4" />
                <span>Advanced analytics and insights</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-primary h-4 w-4" />
                <span>Export responses to CSV</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="text-primary h-4 w-4" />
                <span>Up to 2000 responses per form</span>
              </li>
            </ul>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button onClick={handleContinue} size="lg">
            Continue to Dashboard
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Having issues with your subscription? <a href="#" className="underline">Contact our support team</a></p>
      </div>
    </div>
  );
}