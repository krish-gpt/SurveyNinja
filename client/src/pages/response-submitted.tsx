import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function ResponseSubmitted() {
  const [, setLocation] = useLocation();
  const [formTitle, setFormTitle] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to get form title from sessionStorage if it was stored
    const storedFormTitle = sessionStorage.getItem("submittedFormTitle");
    if (storedFormTitle) {
      setFormTitle(storedFormTitle);
      // Clear it after reading
      sessionStorage.removeItem("submittedFormTitle");
    }
  }, []);

  const handleCreateNewResponse = () => {
    const formId = sessionStorage.getItem("submittedFormId");
    if (formId) {
      setLocation(`/form/${formId}`);
    } else {
      // If we don't have the form ID for some reason, go to home
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto my-4 bg-green-100 p-3 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          
          <CardTitle className="text-2xl font-bold">Thank You!</CardTitle>
          <CardDescription className="text-lg">
            Your response has been submitted successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center">
            {formTitle && (
              <p className="text-gray-600 mb-4">
                Form: <span className="font-medium">{formTitle}</span>
              </p>
            )}
            <p className="text-gray-600">
              Your feedback is valuable and has been recorded.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleCreateNewResponse} 
            className="w-full bg-primary hover:bg-primary/90"
          >
            Submit Another Response
          </Button>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return to Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}