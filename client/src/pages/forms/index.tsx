import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FilePlus,
  FileEdit,
  Share2,
  Loader2,
  PlusCircle,
  Trash2,
  Ellipsis,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ShareFormModal from "@/components/share-form-modal";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function FormsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<number | null>(null);

  // Define the form type
  interface FormSummary {
    id: number;
    title: string;
    description?: string;
    responseCount: number;
    createdAt: string;
    updatedAt: string;
    status?: string;
  }
  
  // Fetch forms
  const { data: allForms = [], isLoading } = useQuery<FormSummary[]>({
    queryKey: ["/api/forms"],
    enabled: !!user,
  });
  
  // Filter to only show unpublished forms (forms with no responses)
  const forms = allForms.filter(form => form.responseCount === 0);

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      await apiRequest("DELETE", `/api/forms/${formId}`);
    },
    onSuccess: () => {
      // Invalidate the forms query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      // Also invalidate stats query which shows form counts
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Form deleted",
        description: "The form has been successfully deleted",
      });
      setFormToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateForm = () => {
    setLocation("/forms/new");
  };

  const handleEditForm = (id: number) => {
    setLocation(`/forms/${id}/edit`);
  };

  const handleViewResponses = (id: number) => {
    setLocation(`/forms/${id}/responses`);
  };

  const handleShareForm = (id: number) => {
    setSelectedFormId(id);
    setIsShareModalOpen(true);
  };
  
  const handleDeleteForm = (id: number) => {
    setFormToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (formToDelete) {
      deleteFormMutation.mutate(formToDelete);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and edit your forms before publishing
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={handleCreateForm}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                New Form
              </Button>
            </div>
          </div>

          {/* Forms list */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="bg-white">
                  <CardHeader className="p-6 pb-3">
                    <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse mt-2"></div>
                  </CardHeader>
                  <CardFooter className="p-6 pt-3 bg-gray-50">
                    <div className="w-full flex justify-between">
                      <div className="h-4 w-1/5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-1/5 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-1/5 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : forms?.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form: FormSummary) => (
                <Card key={form.id} className="bg-white divide-y divide-gray-200">
                  <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium text-gray-900 truncate">
                        {form.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {form.responseCount} responses
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Ellipsis className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditForm(form.id)}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareForm(form.id)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteForm(form.id)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardFooter className="px-4 py-4 sm:px-6 bg-gray-50">
                    <div className="flex justify-between items-center text-sm w-full">
                      <Button
                        variant="link"
                        className="font-medium text-primary hover:text-primary/80 p-0"
                        onClick={() => handleEditForm(form.id)}
                      >
                        <FileEdit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        variant="link"
                        className="font-medium text-red-500 hover:text-red-600 p-0"
                        onClick={() => handleDeleteForm(form.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      
                      <Button
                        variant="link"
                        className="font-medium text-gray-500 hover:text-gray-700 p-0"
                        onClick={() => handleShareForm(form.id)}
                      >
                        Share <Share2 className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}

              {/* Create New Form Card */}
              <Card className="border-2 border-dashed border-gray-300 p-6 flex items-center justify-center">
                <Button
                  onClick={handleCreateForm}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  New Form
                </Button>
              </Card>
            </div>
          ) : (
            <div className="mt-4">
              <Alert>
                <AlertTitle className="text-lg font-semibold">No forms yet</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-4">
                    You haven't created any forms yet. Create your first form to start collecting responses.
                  </p>
                  <Button
                    onClick={handleCreateForm}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Create Your First Form
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </main>

      {/* Share Form Modal */}
      {selectedFormId && (
        <ShareFormModal
          formId={selectedFormId}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
              onClick={confirmDelete}
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