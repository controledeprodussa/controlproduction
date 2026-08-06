import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xzutnkbvzuxnesysdidj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1eReFb-cOsju1hFsNiHW-w_yOTydZSO";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log("Logging in as admin2303...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin2303@lufati.internal",
    password: "admin2303"
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  console.log("Auth success!");

  const { data: machines, error: fetchError } = await supabase
    .from("machines")
    .select("id, nome, numero_serie, cliente")
    .ilike("cliente", "%jomarca%");

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  console.log(`Found ${machines.length} machines matching 'jomarca':`);
  console.log(JSON.stringify(machines, null, 2));
}

run();
