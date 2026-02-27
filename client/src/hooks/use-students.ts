import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useStudentsSearch(query: string = "", page: number = 1) {
  return useQuery({
    queryKey: ["/api/students", query, page],
    queryFn: () => {
      const q = new URLSearchParams({ page: page.toString() });
      if (query) q.append("query", query);
      return authFetch(`/api/students?${q.toString()}`);
    },
    enabled: true,
  });
}

export function useStudentDetails(id: string | number) {
  return useQuery({
    queryKey: ["/api/students", id],
    queryFn: () => authFetch(`/api/students/${id}`),
    enabled: !!id,
  });
}
