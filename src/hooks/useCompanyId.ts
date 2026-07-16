import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanyId() {
  const q = useQuery({
    queryKey: ["current-company-id"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .single();
      if (error) throw error;
      return data.company_id as string;
    },
    staleTime: 5 * 60 * 1000,
  });
  return q.data ?? null;
}
