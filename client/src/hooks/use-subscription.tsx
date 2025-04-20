import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type SubscriptionContextType = {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: Error | null;
  createSubscriptionMutation: any;
  cancelSubscriptionMutation: any;
  syncSubscriptionMutation: any;
};

type SubscriptionData = {
  plan: string;
  subscriptionId: string | null;
  customerId: string | null;
};

export const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const {
    data: subscription = null,
    error,
    isLoading,
  } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/create-subscription");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Subscription created",
        description: "Your subscription has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cancel-subscription");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const syncSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/sync");
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate queries in sequence to prevent race conditions
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Only show toast on manual syncs, not on automatic ones
      if (data.showToast !== false) {
        toast({
          title: "Subscription synchronized",
          description: data.message || "Your subscription details have been updated",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Synchronization failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        error,
        createSubscriptionMutation,
        cancelSubscriptionMutation,
        syncSubscriptionMutation,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
