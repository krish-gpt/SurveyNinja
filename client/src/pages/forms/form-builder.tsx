import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FormElement, Form as FormType } from "@shared/schema";
import { nanoid } from "nanoid";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import ElementSidebar from "@/components/form-builder/element-sidebar";
import FormCanvas from "@/components/form-builder/form-canvas";
import ElementProperties from "@/components/form-builder/element-properties";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Eye, Send, Trash2, CirclePause, Lock, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const isPaidUser = subscription?.plan === "paid";
  const [activeTab, setActiveTab] = useState("build");
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [formElements, setFormElements] = useState<FormElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<FormElement | null>(null);
  const [formLogo, setFormLogo] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloseFormDialogOpen, setIsCloseFormDialogOpen] = useState(false);
  const isEditMode = !!id;

  // Fetch form if in edit mode
  const { data: form, isLoading: isLoadingForm } = useQuery<FormType>({
    queryKey: [`/api/forms/${id}`],
    enabled: isEditMode && !!user,
  });
  
  // Form status is checked directly where needed in the UI

  // Fetch responses count to determine if the form is a draft (can be deleted)
  // Using the same endpoint we use for responses, but we only need the total count
  interface ResponsesData {
    responses: any[];
    total: number;
    limit: number;
  }
  
  const { data: responsesData } = useQuery<ResponsesData>({
    queryKey: [`/api/forms/${id}/responses`],
    enabled: isEditMode && !!user && !!form,
  });
  
  // Form is considered a draft if its status is not published
  const isDraftForm = form?.status !== "published" && form?.status !== "closed";
  
  // Form is considered closed if its status is closed
  const isClosedForm = form?.status === "closed";

  // Publish form mutation
  const publishFormMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const res = await apiRequest("PATCH", `/api/forms/${id}`, { status: "published" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form published",
        description: "Your form has been published and is now available for responses",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error publishing form",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Unpublish form mutation
  const unpublishFormMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const res = await apiRequest("PATCH", `/api/forms/${id}`, { status: "draft" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form unpublished",
        description: "Your form has been unpublished and is no longer accepting responses",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error unpublishing form",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Close form mutation
  const closeFormMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const res = await apiRequest("PATCH", `/api/forms/${id}`, { status: "closed" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/forms/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({
        title: "Form closed",
        description: "Your form has been closed and is no longer accepting responses",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error closing form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await apiRequest("DELETE", `/api/forms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Form deleted",
        description: "Your form has been successfully deleted",
      });
      // Navigate back to forms page
      setLocation("/forms");
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save form mutation
  const saveFormMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (isEditMode) {
        const res = await apiRequest("PUT", `/api/forms/${id}`, formData);
        return await res.json();
      } else {
        const res = await apiRequest("POST", `/api/forms`, formData);
        return await res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      if (!isEditMode) {
        setLocation(`/forms/${data.id}/edit`);
      }
      toast({
        title: "Form saved",
        description: "Your form has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save form",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // AI generation mutation
  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle || !formDescription) {
        throw new Error("Both title and description are required to generate questions");
      }
      
      const res = await apiRequest("POST", "/api/forms/generate-questions", {
        title: formTitle,
        description: formDescription
      });
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Convert API response format to form elements format
      const generatedElements = data.questions.map((question: any) => ({
        id: nanoid(),
        type: question.type,
        label: question.label,
        required: question.required,
        options: question.options,
        properties: {},
      }));
      
      // Add the new elements to the form
      setFormElements((prev) => [...prev, ...generatedElements]);
      
      toast({
        title: "AI Generation Complete",
        description: `Successfully generated ${generatedElements.length} questions for your form`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "AI Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Initialize form data if editing
  useEffect(() => {
    if (form) {
      setFormTitle(form.title);
      setFormDescription(form.description || "");
      setFormElements(form.elements as FormElement[] || []);
      setFormLogo(form.logo || null);
    }
  }, [form]);

  // Handle element drag start
  const handleDragStart = (event: React.DragEvent, elementType: string) => {
    // Set data for HTML5 drag and drop
    event.dataTransfer.setData("element-type", elementType);
    
    // Required to make elements draggable in most browsers
    event.dataTransfer.effectAllowed = "copy";
  };

  // Add element to form
  const handleAddElement = (element: FormElement) => {
    setFormElements((prevElements) => [...prevElements, element]);
    setSelectedElement(element);
  };

  // Update element
  const handleUpdateElement = (elementId: string, updatedElement: FormElement) => {
    setFormElements((prevElements) => 
      prevElements.map((element) => 
        element.id === elementId ? updatedElement : element
      )
    );
    if (selectedElement?.id === elementId) {
      setSelectedElement(updatedElement);
    }
  };

  // Update element from properties panel
  const handleUpdateElementFromProperties = (updatedElement: FormElement) => {
    setFormElements((prevElements) =>
      prevElements.map((element) =>
        element.id === updatedElement.id ? updatedElement : element
      )
    );
  };

  // Duplicate element
  const handleDuplicateElement = (elementId: string) => {
    const elementToDuplicate = formElements.find((element) => element.id === elementId);
    if (elementToDuplicate) {
      const duplicatedElement = {
        ...elementToDuplicate,
        id: nanoid(),
        label: `${elementToDuplicate.label} (Copy)`,
      };
      setFormElements((prevElements) => [...prevElements, duplicatedElement]);
    }
  };

  // Remove element
  const handleRemoveElement = (elementId: string) => {
    setFormElements((prevElements) => 
      prevElements.filter((element) => element.id !== elementId)
    );
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  };

  // Save form
  const handleSaveForm = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save a form",
        variant: "destructive",
      });
      return;
    }

    const formData = {
      userId: user.id,
      title: formTitle,
      description: formDescription,
      logo: formLogo,
      elements: formElements,
    };

    saveFormMutation.mutate(formData);
  };

  // Preview form
  const handlePreviewForm = () => {
    if (isEditMode) {
      window.open(`/form/${id}`, '_blank');
    } else {
      toast({
        title: "Save Required",
        description: "Please save the form first to preview it",
      });
    }
  };

  // Select element for editing properties
  const handleSelectElement = (element: FormElement | null) => {
    setSelectedElement(element);
  };
  
  // Handle delete form (opens confirm dialog)
  const handleDeleteForm = () => {
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete form
  const confirmDeleteForm = () => {
    deleteFormMutation.mutate();
    setIsDeleteDialogOpen(false);
  };
  
  // Handle publish form
  const handlePublishForm = () => {
    if (formElements.length === 0) {
      toast({
        title: "Cannot publish empty form",
        description: "Please add at least one form element before publishing",
        variant: "destructive",
      });
      return;
    }
    
    // First save the form and then publish it
    handleSaveForm();
    publishFormMutation.mutate();
  };
  
  // Handle AI generation
  const handleAiGenerate = () => {
    if (!isPaidUser) {
      toast({
        title: "Pro Plan Required",
        description: "AI generation is available only for Pro plan users. Please upgrade to access this feature.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formTitle || !formDescription) {
      toast({
        title: "Information Required",
        description: "Please provide both a title and description for your form to generate relevant questions.",
        variant: "destructive"
      });
      return;
    }
    
    aiGenerateMutation.mutate();
  };
  
  // Handle unpublish form
  const handleUnpublishForm = () => {
    // Check if form has responses
    if (responsesData && responsesData.total > 0) {
      toast({
        title: "Warning",
        description: "Unpublishing this form will prevent new responses. Existing responses will be preserved.",
      });
    }
    
    // Unpublish the form
    unpublishFormMutation.mutate();
  };
  
  // Handle close form (opens confirm dialog)
  const handleCloseForm = () => {
    setIsCloseFormDialogOpen(true);
  };
  
  // Confirm close form
  const confirmCloseForm = () => {
    closeFormMutation.mutate();
    setIsCloseFormDialogOpen(false);
  };

  if (isLoadingForm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex">
        {/* Left sidebar (form elements) - only shown for non-closed forms */}
        {!isClosedForm && <ElementSidebar onDragStart={handleDragStart} />}

        {/* Main form building area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 min-w-0">
                {isClosedForm ? (
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-semibold text-gray-900">{formTitle}</h1>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Closed
                    </span>
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={formTitle} 
                    onChange={(e) => setFormTitle(e.target.value)} 
                    className="border-0 focus:ring-0 text-xl font-semibold text-gray-900 w-full focus:outline-none" 
                    placeholder="Form Title"
                  />
                )}
              </div>
              <div className="flex space-x-3">
                {/* Different button sets based on form status */}
                {isClosedForm ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePreviewForm}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Form
                  </Button>
                ) : form?.status === "published" ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePreviewForm}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleUnpublishForm}
                      disabled={unpublishFormMutation.isPending || closeFormMutation.isPending}
                      className="text-amber-600 border-amber-600 hover:bg-amber-50"
                    >
                      {unpublishFormMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Unpublishing...
                        </>
                      ) : (
                        <>
                          <CirclePause className="mr-2 h-4 w-4" />
                          Unpublish
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCloseForm}
                      disabled={unpublishFormMutation.isPending || closeFormMutation.isPending}
                      className="text-red-500 border-red-500 hover:bg-red-50"
                    >
                      {closeFormMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Closing...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Close Form
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 1. Save button */}
                    <Button 
                      size="sm" 
                      onClick={handleSaveForm}
                      disabled={saveFormMutation.isPending || deleteFormMutation.isPending}
                    >
                      {saveFormMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    
                    {/* 2. Preview button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePreviewForm}
                      disabled={saveFormMutation.isPending || deleteFormMutation.isPending || publishFormMutation.isPending}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    
                    {/* 3. Publish button */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePublishForm}
                      disabled={saveFormMutation.isPending || deleteFormMutation.isPending || publishFormMutation.isPending}
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      {publishFormMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Publish
                        </>
                      )}
                    </Button>
                    
                    {/* 4. Delete button */}
                    {isEditMode && (
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={handleDeleteForm}
                        disabled={saveFormMutation.isPending || deleteFormMutation.isPending || publishFormMutation.isPending}
                        className="text-red-500 border-red-500 hover:bg-red-50"
                      >
                        {deleteFormMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Form settings tabs - Hide tabs for closed forms */}
            {isClosedForm ? (
              <div className="px-4 py-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Lock className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Form is closed</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>
                          This form has been closed and can no longer be edited or receive new responses.
                          You can still view all collected responses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  {/* Read-only view of form elements */}
                  <h2 className="text-xl font-medium mb-4">{formTitle}</h2>
                  {formDescription && <p className="text-gray-600 mb-6">{formDescription}</p>}
                  
                  <div className="space-y-6">
                    {formElements.map((element) => (
                      <div key={element.id} className="border border-gray-200 rounded-md p-4 bg-white">
                        <h3 className="font-medium">{element.label}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Type: {element.type.charAt(0).toUpperCase() + element.type.slice(1)}
                          {element.required && ' • Required'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-2 border-b border-gray-200">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-[400px] grid-cols-3">
                    <TabsTrigger value="build">Build</TabsTrigger>
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="logic">Logic</TabsTrigger>
                  </TabsList>

                  <TabsContent value="build" className="mt-4 flex-1 flex">
                    <FormCanvas
                      formTitle={formTitle}
                      formDescription={formDescription}
                      elements={formElements}
                      onUpdateTitle={setFormTitle}
                      onUpdateDescription={setFormDescription}
                      onAddElement={handleAddElement}
                      onUpdateElement={handleUpdateElement}
                      onDuplicateElement={handleDuplicateElement}
                      onRemoveElement={handleRemoveElement}
                      onSelectElement={handleSelectElement}
                      selectedElementId={selectedElement?.id || null}
                    />
                  </TabsContent>
                  
                  <TabsContent value="design" className="mt-4 p-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium mb-4">Design Settings</h2>
                      <p className="text-gray-500">Customize the look and feel of your form (Coming soon)</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="logic" className="mt-4 p-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-lg font-medium mb-4">Form Logic</h2>
                      <p className="text-gray-500">Add conditional logic to your form (Coming soon)</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar (element properties) - hide for closed forms */}
        {!isClosedForm && (
          <ElementProperties
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElementFromProperties}
          />
        )}
      </div>
      
      {/* Delete Form Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your form and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteForm}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteFormMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Close Form Confirmation Dialog */}
      <AlertDialog open={isCloseFormDialogOpen} onOpenChange={setIsCloseFormDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to close this form?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Closing a form will:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Permanently prevent new responses</li>
                <li>Lock the form from further editing</li>
                <li>Keep all existing responses available for viewing</li>
              </ul>
              <p className="mt-2 font-medium text-red-500">
                This action cannot be undone. Once closed, a form cannot be reopened.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCloseForm}
              className="bg-red-500 hover:bg-red-600"
            >
              {closeFormMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                "Close Form"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
