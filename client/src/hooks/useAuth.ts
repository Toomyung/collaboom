import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, loginInfluencer, registerInfluencer, loginAdmin, logout, AuthState } from "@/lib/auth";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: authState, isLoading, refetch } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const influencerLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await loginInfluencer(email, password);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      }
      return result;
    },
  });

  const influencerRegisterMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await registerInfluencer(email, password);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      }
      return result;
    },
  });

  const adminLoginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await loginAdmin(email, password);
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      }
      return result;
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
