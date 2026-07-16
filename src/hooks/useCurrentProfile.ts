import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentProfile() {
  return useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_id, nome, usuario, role")
        .eq("id", userData.user.id)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        company_id: string;
        nome: string | null;
        usuario: string | null;
        role: "admin" | "user";
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
