import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, ChevronRight, Loader2, Edit, Share2, FileEdit, FilePlus, Ellipsis } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ShareFormModal from "@/components/share-form-modal";
import { Link } from "wouter";
import { Form as FormType, FormElement } from "@shared/schema";

export default function PublishedFormsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  
  // Define the form type
  interface FormSummary {
    id: number;
    title: string;
    description?: string;
    responseCount: number;
    createdAt: string;
    updatedAt: string;
    published?: boolean;
  }
  
  // Fetch forms
  const { data: allForms = [], isLoading } = useQuery<FormSummary[]>({
    queryKey: ["/api/forms"],
    enabled: !!user,
  });

  // Filter to only show published forms 
  // Note: In a real implementation, we would add a 'published' field to the form schema
  // For now we're assuming all forms with responses are published
  const publishedForms = allForms.filter(form => form.responseCount > 0);
  
  const handleEditForm = (id: number) => {
    setLocation(`/forms/${id}/edit`);
  };

  const handleViewResponses = (id: number) => {
    setLocation(`/published-forms/${id}/responses`);
  };

  const handleShareForm = (id: number) => {
    setSelectedFormId(id);
    setIsShareModalOpen(true);
  };

  if (isLoading) {
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Published Forms</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage your published forms
              </p>
            </div>
          </div>
          
          {/* Published forms grid */}
          {publishedForms.length === 0 ? (
            <div className="mt-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <BarChart className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No published forms yet</h3>
                  <p className="text-gray-500 text-center mt-2">
                    Forms appear here once they've received responses
                  </p>
                  <div className="mt-6">
                    <Link href="/forms">
                      <Button>Go to Forms</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {publishedForms.map((form: FormSummary) => (
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
                          <DropdownMenuItem onClick={() => handleViewResponses(form.id)}>
                            <FilePlus className="h-4 w-4 mr-2" />
                            View Responses
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareForm(form.id)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardFooter className="px-4 py-4 sm:px-6 bg-gray-50">
                    <div className="flex justify-between text-sm w-full">
                      <Button
                        variant="link"
                        className="font-medium text-primary hover:text-primary/80 p-0"
                        onClick={() => handleEditForm(form.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="link"
                        className="font-medium text-primary hover:text-primary/80 p-0"
                        onClick={() => handleViewResponses(form.id)}
                      >
                        View Responses
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
    </div>
  );
}