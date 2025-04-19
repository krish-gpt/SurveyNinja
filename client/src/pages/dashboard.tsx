import { useState } from "react";
import { Link, useLocation } from "wouter";
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
  FilePlus,
  FileEdit,
  Share2,
  Loader2,
  BarChart3,
  FileText,
  Calendar,
  PlusCircle,
  Clock,
  ChevronRight,
  Ellipsis,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ShareFormModal from "@/components/share-form-modal";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);

  // Fetch forms
  const { data: forms, isLoading: isLoadingForms } = useQuery({
    queryKey: ["/api/forms"],
    enabled: !!user,
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

          {/* Subscription Banner */}
          {user?.plan === "free" && (
            <div className="mt-6 bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
              <div className="px-4 py-5 sm:px-6 bg-primary-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Free Plan</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You are currently on the Free plan with limited features.
                  </p>
                </div>
                <Link href="/upgrade">
                  <Button className="bg-primary hover:bg-primary/90">
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {isLoadingStats ? (
                    Array(3).fill(0).map((_, i) => (
                      <Card key={i} className="bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <div className="w-full h-12 flex justify-center items-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <>
                      <Card>
                        <CardContent className="px-4 py-5 sm:p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Forms Created</dt>
                                <dd className="text-lg font-medium text-gray-900">
                                  {stats?.formCount} / {stats?.maxForms}
                                </dd>
                              </dl>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="px-4 py-5 sm:p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                              <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Total Responses</dt>
                                <dd className="text-lg font-medium text-gray-900">
                                  {stats?.totalResponses} / {stats?.maxResponses}
                                </dd>
                              </dl>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="px-4 py-5 sm:p-6">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                              <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Recent Activity</dt>
                                <dd className="text-lg font-medium text-gray-900">Today</dd>
                              </dl>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Forms */}
          <h2 className="mt-8 text-lg font-medium text-gray-900">Recent Forms</h2>
          
          {isLoadingForms ? (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form: any) => (
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
                            <BarChart3 className="h-4 w-4 mr-2" />
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
    </div>
  );
}
