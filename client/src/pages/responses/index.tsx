import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Loader2,
  ClipboardList,
  BarChart,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ResponsesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch forms with response counts
  const { data: forms = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/forms"],
    enabled: !!user,
  });

  const handleViewFormResponses = (formId: number) => {
    setLocation(`/forms/${formId}/responses`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Responses</h1>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Forms</TabsTrigger>
              <TabsTrigger value="recent">Recent Responses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : forms?.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Form Responses</CardTitle>
                    <CardDescription>
                      View and manage responses for all your forms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Form</TableHead>
                          <TableHead className="w-[100px]">Responses</TableHead>
                          <TableHead className="w-[150px]">Last Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forms.map((form: any) => (
                          <TableRow key={form.id}>
                            <TableCell className="font-medium">{form.title}</TableCell>
                            <TableCell>{form.responseCount || 0}</TableCell>
                            <TableCell>{new Date(form.updatedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFormResponses(form.id)}
                              >
                                <ClipboardList className="h-4 w-4 mr-2" />
                                View Responses
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertTitle className="text-lg font-semibold">No responses yet</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-4">
                      You don't have any form responses yet. Create and share a form to start collecting responses.
                    </p>
                    <Button
                      onClick={() => setLocation("/forms/new")}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Create a Form
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Responses</CardTitle>
                  <CardDescription>
                    Latest responses across all your forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* This would be populated with actual recent response data */}
                  <div className="flex items-center justify-center py-8 text-center text-gray-500">
                    <div>
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="mb-2 text-lg font-medium">No recent responses</p>
                      <p className="text-sm">
                        Recent responses from all your forms will appear here.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Stats Section */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    forms?.reduce((acc: number, form: any) => acc + (form.responseCount || 0), 0) || 0
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Forms with Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    forms?.filter((form: any) => form.responseCount > 0).length || 0
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Average per Form</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : forms?.length ? (
                    (forms.reduce((acc: number, form: any) => acc + (form.responseCount || 0), 0) / forms.length).toFixed(1)
                  ) : (
                    0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}