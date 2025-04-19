import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Form as FormType, FormElement } from "@shared/schema";

// Extend FormType with the correct elements type
interface FormWithElements extends FormType {
  elements: FormElement[];
}
import { useAuth } from "@/hooks/use-auth";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ResponseDetailsModal from "@/components/response-details-modal";
import {
  BarChart as BarChartIcon,
  BarChart3,
  Download,
  Edit,
  FileDown,
  Loader2,
  User,
  Clock,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function ResponseViewer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("responses");
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Fetch form
  const { data: form, isLoading: isLoadingForm } = useQuery<FormWithElements>({
    queryKey: [`/api/forms/${id}`],
    enabled: !!user && !!id,
  });
  
  // Define the expected response data structure
  interface ResponsesData {
    responses: any[];
    total: number;
    limit: number;
  }
  
  // Fetch responses
  const { data: responsesData, isLoading: isLoadingResponses } = useQuery<ResponsesData>({
    queryKey: [`/api/forms/${id}/responses`],
    enabled: !!user && !!id,
  });
  
  const responses = responsesData?.responses || [];
  const isPlanLimited = user?.plan === "free" && responsesData?.total > responsesData?.limit;
  
  // Function to prepare data for charts
  const prepareChartData = (questionId: string) => {
    if (!responses || responses.length === 0) return [];
    
    const element = form?.elements.find((el: FormElement) => el.id === questionId);
    if (!element) return [];
    
    if (["multiple-choice", "checkbox", "dropdown"].includes(element.type)) {
      const counts: Record<string, number> = {};
      
      responses.forEach((response: any) => {
        const answer = response.data[questionId];
        
        if (Array.isArray(answer)) {
          // Handle checkbox (multiple answers)
          answer.forEach((option) => {
            counts[option] = (counts[option] || 0) + 1;
          });
        } else if (answer) {
          // Handle single answer
          counts[answer] = (counts[answer] || 0) + 1;
        }
      });
      
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    
    if (element.type === "rating") {
      const maxRating = element.properties?.maxRating || 5;
      const counts: Record<string, number> = {};
      
      // Initialize all ratings with 0
      for (let i = 1; i <= maxRating; i++) {
        counts[i.toString()] = 0;
      }
      
      // Count actual ratings
      responses.forEach((response: any) => {
        const rating = response.data[questionId];
        if (rating) {
          counts[rating] = (counts[rating] || 0) + 1;
        }
      });
      
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    
    return [];
  };
  
  // Function to render response value
  const renderResponseValue = (value: any) => {
    if (value === undefined || value === null) {
      return "-";
    }
    
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    
    return String(value);
  };
  
  // Function to handle exporting responses
  const handleExportResponses = () => {
    if (!responses || responses.length === 0) return;
    
    // Prepare CSV data
    const headers = ["Response ID", "Submission Date", ...form?.elements.map((el: FormElement) => el.label) || []];
    
    const rows = responses.map((response: any) => {
      const rowData = [
        response.id,
        new Date(response.createdAt).toLocaleString(),
      ];
      
      form?.elements.forEach((element: FormElement) => {
        const value = response.data[element.id];
        rowData.push(renderResponseValue(value));
      });
      
      return rowData;
    });
    
    // Convert to CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(","))
    ].join("\n");
    
    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${form?.title || "form"}-responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (isLoadingForm || isLoadingResponses) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }
  
  const CHART_COLORS = [
    "#4f46e5", // primary
    "#8b5cf6", // secondary
    "#f97316", // accent
    "#10b981", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#ec4899", // pink
  ];
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                {form?.title || "Form Responses"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {responses?.length} responses · Last response{" "}
                {responses?.length > 0
                  ? new Date(responses[0].createdAt).toLocaleString()
                  : "N/A"}
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button
                variant="outline"
                onClick={handleExportResponses}
                disabled={responses.length === 0}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={() => window.location.href = `/forms/${id}/edit`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Form
              </Button>
            </div>
          </div>
          
          {isPlanLimited && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-100">
              <AlertTriangle className="h-4 w-4 text-yellow-800" />
              <AlertTitle className="text-yellow-800">Free Plan Limitation</AlertTitle>
              <AlertDescription className="text-yellow-700">
                You're viewing {responsesData?.limit} of {responsesData?.total} responses.{" "}
                <a href="/upgrade" className="font-medium underline text-yellow-800 hover:text-yellow-900">
                  Upgrade to our Pro plan
                </a>{" "}
                to view all responses.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="border-b border-gray-200">
              <TabsList className="bg-transparent border-b-0">
                <TabsTrigger value="responses" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none">
                  Responses
                </TabsTrigger>
                <TabsTrigger value="summary" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none">
                  Summary
                </TabsTrigger>
                <TabsTrigger value="statistics" className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none">
                  Statistics
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="responses" className="space-y-4">
              {responses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No responses yet</h3>
                    <p className="text-gray-500 text-center mt-2">
                      Share your form to start collecting responses
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Respondent</TableHead>
                          <TableHead>Submission Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responses.map((response: any, index: number) => (
                          <TableRow key={response.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="mr-4 h-10 w-10 flex items-center justify-center rounded-full bg-primary-100 text-primary">
                                  <User className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-primary truncate">
                                    Anonymous User {index + 1}
                                  </p>
                                  {form?.elements.some((el: FormElement) => el.type === "rating" && response.data[el.id]) && (
                                    <p className="text-sm text-gray-500">
                                      Rating:{" "}
                                      <span className="font-medium">
                                        {form.elements
                                          .filter((el: FormElement) => el.type === "rating" && response.data[el.id])
                                          .map((el: FormElement) => `${response.data[el.id]}/${el.properties?.maxRating || 5}`)
                                          .join(", ")}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                {new Date(response.createdAt).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Complete
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedResponse(response);
                                  setIsModalOpen(true);
                                }}
                              >
                                View Details <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="summary" className="space-y-6">
              {form?.elements.map((element: FormElement) => {
                const chartData = prepareChartData(element.id);
                
                return (
                  <Card key={element.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {element.label}
                      </h3>
                      
                      {["multiple-choice", "checkbox", "dropdown", "rating"].includes(element.type) && chartData.length > 0 ? (
                        <div className="h-64 mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartData}
                              margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                              <YAxis allowDecimals={false} />
                              <RechartsTooltip />
                              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-center">
                          {responses.length === 0 
                            ? "No responses yet" 
                            : "Summary visualization not available for this question type"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
            
            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Response Statistics</h3>
                  
                  {responses.length === 0 ? (
                    <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-center">
                      No responses yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Response Overview</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[{ name: "Complete", value: responses.length }]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                dataKey="value"
                              >
                                <Cell fill="#4f46e5" />
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Response Timeline</h4>
                        <div className="h-64">
                          {responses.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[{ name: "Total", value: responses.length }]}
                                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                              No data available
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Response Details</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Metric</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>Total Responses</TableCell>
                              <TableCell>{responses.length}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>First Response</TableCell>
                              <TableCell>
                                {responses.length > 0
                                  ? new Date(responses[responses.length - 1].createdAt).toLocaleString()
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Latest Response</TableCell>
                              <TableCell>
                                {responses.length > 0
                                  ? new Date(responses[0].createdAt).toLocaleString()
                                  : "N/A"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Average Completion Rate</TableCell>
                              <TableCell>100%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Response Details Modal */}
      <ResponseDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        response={selectedResponse}
        form={form}
      />
    </div>
  );
}
