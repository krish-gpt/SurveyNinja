import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FormElement, Form as FormType } from "@shared/schema";
import { nanoid } from "nanoid";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";
import ElementSidebar from "@/components/form-builder/element-sidebar";
import FormCanvas from "@/components/form-builder/form-canvas";
import ElementProperties from "@/components/form-builder/element-properties";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Eye, Send, Trash2, CirclePause } from "lucide-react";
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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("build");
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [formElements, setFormElements] = useState<FormElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<FormElement | null>(null);
  const [formLogo, setFormLogo] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
  
  // Form is considered a draft if it has no responses and is not published
  const isDraftForm = responsesData?.total === 0 && form?.status !== "published";

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
        {/* Left sidebar (form elements) */}
        <ElementSidebar onDragStart={handleDragStart} />

        {/* Main form building area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex-1 min-w-0">
                <input 
                  type="text" 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  className="border-0 focus:ring-0 text-xl font-semibold text-gray-900 w-full focus:outline-none" 
                  placeholder="Form Title"
                />
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreviewForm}
                  disabled={saveFormMutation.isPending || deleteFormMutation.isPending || publishFormMutation.isPending || unpublishFormMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                {/* Show Publish button only if form is not already published */}
                {(form?.status !== "published") && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePublishForm}
                    disabled={saveFormMutation.isPending || deleteFormMutation.isPending || publishFormMutation.isPending || unpublishFormMutation.isPending}
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
                )}
                {/* Show Unpublish button only for published forms */}
                {form?.status === "published" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUnpublishForm}
                    disabled={saveFormMutation.isPending || unpublishFormMutation.isPending}
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
                )}
                {/* Show Delete button only for draft forms */}
                {isEditMode && isDraftForm && (
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={handleDeleteForm}
                    disabled={saveFormMutation.isPending || deleteFormMutation.isPending || unpublishFormMutation.isPending}
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
              </div>
            </div>
            
            {/* Form settings tabs */}
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
          </div>
        </div>

        {/* Right sidebar (element properties) */}
        <ElementProperties
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElementFromProperties}
        />
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
    </div>
  );
}
