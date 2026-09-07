import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Skill, AddSkillRequest } from "@workspace/api-client-react";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("opportunity_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ["/api/skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills", {
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error("Failed to fetch skills");
      return res.json();
    },
  });
}

export function useAddSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AddSkillRequest) => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders() 
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add skill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      // Invalidate leads so they refresh based on new skills
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/skills/${id}`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error("Failed to delete skill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}
