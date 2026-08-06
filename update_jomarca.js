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

  // Find all machines matching %jomarca%
  const { data: machines, error: fetchError } = await supabase
    .from("machines")
    .select("id, cliente")
    .ilike("cliente", "%jomarca%");

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  const machinesToUpdate = machines.filter(m => m.cliente !== "JOMARCA");
  console.log(`Found ${machines.length} machines matching 'jomarca'. ${machinesToUpdate.length} need updating.`);

  if (machinesToUpdate.length === 0) {
    console.log("No machines need updating.");
    return;
  }

  // Update them to JOMARCA
  const machineIds = machinesToUpdate.map(m => m.id);
  console.log("Updating machines to client 'JOMARCA'...");
  const { error: updateError } = await supabase
    .from("machines")
    .update({ cliente: "JOMARCA" })
    .in("id", machineIds);

  if (updateError) {
    console.error("Update error:", updateError);
    return;
  }

  console.log("Successfully updated all variations of Jomarca to 'JOMARCA'!");
}

run();
