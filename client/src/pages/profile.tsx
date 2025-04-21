import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  organizationName: z.string().optional(),
  industry: z.string().optional(),
});

// Password update schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Common industry options
const industries = [
  "Technology",
  "Education",
  "Healthcare",
  "Financial Services",
  "Manufacturing",
  "Retail",
  "Media & Entertainment",
  "Government",
  "Nonprofit",
  "Other"
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState<string>("profile");
  const { user, isLoading } = useAuth();
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<boolean>(false);

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      organizationName: user?.organizationName || "",
      industry: user?.industry || "",
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileFormSchema>) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordFormSchema>) => {
      const res = await apiRequest("PUT", "/api/profile", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      setPasswordUpdateSuccess(true);
      setTimeout(() => setPasswordUpdateSuccess(false), 3000);
    },
  });

  // Handle profile form submission
  function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
    updateProfileMutation.mutate(data);
  }

  // Handle password form submission
  function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
    updatePasswordMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                {updateSuccess && (
                  <Alert className="mb-6 bg-green-50 border-green-500">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Profile updated</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your profile has been successfully updated.
                    </AlertDescription>
                  </Alert>
                )}

                {updateProfileMutation.isError && (
                  <Alert className="mb-6" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {updateProfileMutation.error?.message || "An error occurred while updating your profile."}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your full name as it will appear on your profile
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your unique username for the platform
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your email address for notifications and login
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-1 md:col-span-2">
                        <Separator className="my-4" />
                        <h3 className="text-lg font-medium mb-4">Organization Details</h3>
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your organization" {...field} />
                            </FormControl>
                            <FormDescription>
                              The name of your company or organization
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your industry" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industries.map((industry) => (
                                  <SelectItem key={industry} value={industry}>
                                    {industry}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Your industry or sector
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <div>
                        <h4 className="text-sm font-medium">Subscription Status</h4>
                        <Badge variant={user?.plan === "paid" ? "default" : "outline"} className="mt-1">
                          {user?.plan === "paid" ? "Pro Plan" : "Free Plan"}
                        </Badge>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="ml-auto"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordUpdateSuccess && (
                  <Alert className="mb-6 bg-green-50 border-green-500">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Password updated</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Your password has been successfully changed.
                    </AlertDescription>
                  </Alert>
                )}

                {updatePasswordMutation.isError && (
                  <Alert className="mb-6" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {updatePasswordMutation.error?.message || "An error occurred while updating your password."}
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>
                            At least 6 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center pt-2">
                      <Button 
                        variant="link" 
                        type="button" 
                        onClick={() => setActiveTab("profile")}
                        className="px-0 mr-auto"
                      >
                        Cancel
                      </Button>
                      
                      <Button 
                        type="submit"
                        className="ml-auto"
                        disabled={updatePasswordMutation.isPending}
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
                
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-sm font-medium mb-2">Forgot your password?</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    If you can't remember your current password, you can use the password reset option.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Use the same forgot password functionality as in auth page
                      window.location.href = "/auth";
                    }}
                  >
                    Reset Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}