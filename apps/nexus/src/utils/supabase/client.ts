// utils/supabase/client.ts

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://bgkjcngrslxyqjitksim.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJna2pjbmdyc2x4eXFqaXRrc2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDk2MDgsImV4cCI6MjA3NzU4NTYwOH0.7BWAMP7l3PoPr9NnTUz2WT5qo2sqt8ggA2AAHrqfrR0"
);
