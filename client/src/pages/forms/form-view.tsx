import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Form as FormType, FormElement } from "@shared/schema";

// Extend FormType with the correct elements type
interface FormWithElements extends FormType {
  elements: FormElement[];
}
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Star, Loader2, AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FormView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Fetch form
  const { data: form, isLoading, error } = useQuery<FormWithElements>({
    queryKey: [`/api/forms/${id}`],
  });
  
  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (responseData: any) => {
      const res = await apiRequest("POST", `/api/forms/${id}/responses`, responseData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Response submitted",
        description: "Thank you for your submission!",
      });
      // Store form info in sessionStorage for the success page
      if (form) {
        sessionStorage.setItem("submittedFormTitle", form.title);
        sessionStorage.setItem("submittedFormId", id);
      }
      // Reset form
      setFormData({});
      // Redirect to success page
      setLocation("/response-submitted");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit response",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle field change
  const handleFieldChange = (questionId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = form?.elements ? form.elements.filter((element: FormElement) => element.required) : [];
    const missingFields = requiredFields.filter((field: FormElement) => 
      !formData[field.id] || 
      (Array.isArray(formData[field.id]) && formData[field.id].length === 0)
    );
    
    if (missingFields && missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
      return;
    }
    
    submitResponseMutation.mutate(formData);
  };

  // Render form elements
  const renderFormElement = (element: FormElement) => {
    switch (element.type) {
      case "short-text":
        return (
          <div className="mb-4">
            <Label htmlFor={element.id}>{element.label}</Label>
            <Input
              id={element.id}
              value={formData[element.id] || ""}
              onChange={(e) => handleFieldChange(element.id, e.target.value)}
              placeholder="Your answer"
              className="mt-1"
            />
          </div>
        );
      
      case "long-text":
        return (
          <div className="mb-4">
            <Label htmlFor={element.id}>{element.label}</Label>
            <Textarea
              id={element.id}
              value={formData[element.id] || ""}
              onChange={(e) => handleFieldChange(element.id, e.target.value)}
              placeholder="Your answer"
              className="mt-1"
              rows={4}
            />
          </div>
        );
      
      case "multiple-choice":
        return (
          <div className="mb-4">
            <Label>{element.label}</Label>
            <RadioGroup
              value={formData[element.id] || ""}
              onValueChange={(value) => handleFieldChange(element.id, value)}
              className="mt-2 space-y-2"
            >
              {element.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${element.id}-${index}`} />
                  <Label htmlFor={`${element.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      
      case "checkbox":
        return (
          <div className="mb-4">
            <Label>{element.label}</Label>
            <div className="mt-2 space-y-2">
              {element.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${element.id}-${index}`}
                    checked={formData[element.id]?.includes(option) || false}
                    onCheckedChange={(checked) => {
                      const currentValues = formData[element.id] || [];
                      const newValues = checked
                        ? [...currentValues, option]
                        : currentValues.filter((value: string) => value !== option);
                      handleFieldChange(element.id, newValues);
                    }}
                  />
                  <Label htmlFor={`${element.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case "dropdown":
        return (
          <div className="mb-4">
            <Label htmlFor={element.id}>{element.label}</Label>
            <Select
              value={formData[element.id] || ""}
              onValueChange={(value) => handleFieldChange(element.id, value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {element.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "rating":
        const maxRating = element.properties?.maxRating || 5;
        return (
          <div className="mb-4">
            <Label>{element.label}</Label>
            <div className="mt-2 flex space-x-2">
              {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={formData[element.id] === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFieldChange(element.id, rating)}
                  className="w-10 h-10 p-0 flex items-center justify-center"
                >
                  {element.properties?.style === "number" ? (
                    rating
                  ) : (
                    <Star className={formData[element.id] >= rating ? "fill-current" : ""} />
                  )}
                </Button>
              ))}
            </div>
          </div>
        );
      
      case "date":
        return (
          <div className="mb-4">
            <Label htmlFor={element.id}>{element.label}</Label>
            <Input
              id={element.id}
              type="date"
              value={formData[element.id] || ""}
              onChange={(e) => handleFieldChange(element.id, e.target.value)}
              className="mt-1"
            />
          </div>
        );
      
      case "file-upload":
        return (
          <div className="mb-4">
            <Label htmlFor={element.id}>{element.label}</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-md p-6">
              <Input
                id={element.id}
                type="file"
                onChange={(e) => {
                  // For a real implementation, we would handle file uploads differently
                  // This is a simplified version for the MVP
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFieldChange(element.id, files[0].name);
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90"
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData[element.id] ? `Selected: ${formData[element.id]}` : "No file selected"}
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load the form. The form may not exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b bg-white">
            <div className="flex items-center">
              {form.logo && (
                <div className="mr-4 h-12 w-12">
                  <img 
                    src={form.logo} 
                    alt="Form logo" 
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl font-bold">{form.title}</CardTitle>
                {form.description && (
                  <CardDescription className="mt-1">
                    {form.description}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              {form.elements.map((element: FormElement) => (
                <div key={element.id} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                  {renderFormElement(element)}
                  {element.required && (
                    <p className="text-xs text-red-500 mt-1">* Required</p>
                  )}
                </div>
              ))}
              
              <div className="mt-8">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto"
                  disabled={submitResponseMutation.isPending}
                >
                  {submitResponseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="bg-gray-50 text-center text-sm text-gray-500 py-3">
            Powered by FormPulse
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
