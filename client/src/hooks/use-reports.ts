import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useAnalytics() {
  return useQuery({
    queryKey: ["/api/reports/analytics"],
    queryFn: () => authFetch("/api/reports/analytics"),
  });
}

export function useBacklogReports(filters: { branch?: string; semester?: string; batch?: string } = {}) {
  return useQuery({
    queryKey: ["/api/reports/backlogs", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.batch) params.append("batch", filters.batch);

      const queryString = params.toString();
      return authFetch(`/api/reports/backlogs${queryString ? `?${queryString}` : ''}`);
    },
  });
}
