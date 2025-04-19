import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ResponseDetailsModal from "@/components/response-details-modal";
import { BarChart, ChevronRight, Loader2, MessageSquare, Search } from "lucide-react";
import { Link } from "wouter";

export default function ResponsesPage() {
  const { user } = useAuth();
  
  // Define the form and response types
  interface FormSummary {
    id: number;
    title: string;
    description?: string;
    responseCount: number;
    lastResponseDate?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  interface ResponseData {
    id: number;
    createdAt: string;
    data: Record<string, any>;
    [key: string]: any;
  }
  
  interface FormWithElements extends FormSummary {
    elements: any[];
  }
  
  const [selectedResponse, setSelectedResponse] = useState<ResponseData | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormWithElements | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Fetch user's forms
  const { data: forms, isLoading: isLoadingForms } = useQuery<FormSummary[]>({
    queryKey: ["/api/forms"],
    enabled: !!user,
  });
  
  // Calculate total responses across all forms
  const totalResponses = forms?.reduce((total, form) => total + form.responseCount, 0) || 0;
  
  if (isLoadingForms) {
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Responses</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and analyze form responses
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button variant="outline">
                <Search className="mr-2 h-4 w-4" />
                Search Responses
              </Button>
            </div>
          </div>
          
          {/* Response analytics cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalResponses}</div>
                <p className="text-xs text-muted-foreground">
                  From {forms?.length || 0} forms
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Form responses list */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Responses</CardTitle>
              <CardDescription>
                View responses from all your forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forms?.length === 0 ? (
                <div className="py-12 text-center">
                  <BarChart className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No forms yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first form to start collecting responses.
                  </p>
                  <div className="mt-6">
                    <Link href="/forms/new">
                      <Button>Create Form</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form Name</TableHead>
                        <TableHead>Responses</TableHead>
                        <TableHead>Last Response</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forms?.map((form) => (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">{form.title}</TableCell>
                          <TableCell>{form.responseCount}</TableCell>
                          <TableCell>
                            {form.lastResponseDate 
                              ? new Date(form.lastResponseDate).toLocaleString() 
                              : "No responses yet"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/forms/${form.id}/responses`}>
                              <Button variant="ghost" size="sm">
                                View Details <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Response Details Modal */}
      {selectedForm && selectedResponse && (
        <ResponseDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          response={selectedResponse}
          form={selectedForm}
        />
      )}
    </div>
  );
}