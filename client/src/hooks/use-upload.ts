import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useUploadResults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/upload/results", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        // DO NOT set Content-Type, browser sets it with boundary for FormData
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errorData.message || "Failed to upload results");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Successfully processed ${data.processed} records.`,
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/reports/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/backlogs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
