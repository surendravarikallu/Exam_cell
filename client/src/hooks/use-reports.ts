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

export function useCumulativeResultsReport(filters: { branch?: string; batch?: string; year?: string } = {}) {
  return useQuery({
    queryKey: ["/api/reports/cumulative-results", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.batch) params.append("batch", filters.batch);
      if (filters.year) params.append("year", filters.year);

      const queryString = params.toString();
      return authFetch(`/api/reports/cumulative-results${queryString ? `?${queryString}` : ''}`);
    },
  });
}

export function useToppersReport(filters: { branch?: string; batch?: string; type: string; semester?: string; year?: string; topN?: number }) {
  return useQuery({
    queryKey: ["/api/reports/toppers", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.batch) params.append("batch", filters.batch);
      params.append("type", filters.type);
      if (filters.semester) params.append("semester", filters.semester);
      if (filters.year) params.append("year", filters.year);
      if (filters.topN) params.append("topN", filters.topN.toString());

      const queryString = params.toString();
      return authFetch(`/api/reports/toppers${queryString ? `?${queryString}` : ''}`);
    },
  });
}
