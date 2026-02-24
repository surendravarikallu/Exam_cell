import { useQuery } from "@tanstack/react-query";
import { authFetch } from "./use-auth";

export function useStudentsSearch(query: string = "") {
  return useQuery({
    queryKey: ["/api/students", query],
    queryFn: () => authFetch(query ? `/api/students?query=${encodeURIComponent(query)}` : "/api/students"),
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
