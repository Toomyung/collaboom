import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, loginInfluencer, registerInfluencer, loginAdmin, logout, AuthState } from "@/lib/auth";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: authState, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const influencerLoginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginInfluencer(email, password),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const influencerRegisterMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      registerInfluencer(email, password),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const adminLoginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginAdmin(email, password),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
  });

  return {
    user: authState?.user ?? null,
    influencer: authState?.influencer ?? null,
    admin: authState?.admin ?? null,
    isLoading: isLoading || authState?.isLoading,
    isAuthenticated: !!authState?.user,
    isInfluencer: authState?.user?.role === "influencer",
    isAdmin: authState?.user?.role === "admin",
    loginInfluencer: influencerLoginMutation.mutateAsync,
    registerInfluencer: influencerRegisterMutation.mutateAsync,
    loginAdmin: adminLoginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginInfluencerPending: influencerLoginMutation.isPending,
    registerInfluencerPending: influencerRegisterMutation.isPending,
    adminLoginPending: adminLoginMutation.isPending,
  };
}
