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
import { Loader2, Save, Eye, Settings } from "lucide-react";

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
  const isEditMode = !!id;

  // Fetch form if in edit mode
  const { data: form, isLoading: isLoadingForm } = useQuery<FormType>({
    queryKey: [`/api/forms/${id}`],
    enabled: isEditMode && !!user,
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
    event.dataTransfer.setData("element-type", elementType);
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
                  disabled={saveFormMutation.isPending}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={saveFormMutation.isPending}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveForm}
                  disabled={saveFormMutation.isPending}
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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-[400px] grid-cols-3">
                  <TabsTrigger value="build">Build</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="logic">Logic</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <TabsContent value="build" className="flex-1 flex">
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
          
          <TabsContent value="design" className="p-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Design Settings</h2>
              <p className="text-gray-500">Customize the look and feel of your form (Coming soon)</p>
            </div>
          </TabsContent>
          
          <TabsContent value="logic" className="p-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium mb-4">Form Logic</h2>
              <p className="text-gray-500">Add conditional logic to your form (Coming soon)</p>
            </div>
          </TabsContent>
        </div>

        {/* Right sidebar (element properties) */}
        <ElementProperties
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElementFromProperties}
        />
      </div>
    </div>
  );
}
