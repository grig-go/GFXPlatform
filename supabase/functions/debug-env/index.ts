import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve((req) => {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter")?.toLowerCase();

  const envVars = Deno.env.toObject();
  const safeKeys = Object.keys(envVars).sort();

  const envList = safeKeys
    .filter((key) => !filter || key.toLowerCase().includes(filter))
    .map((key) => {
      const value = envVars[key];
      const isSensitive = /key|secret|password|token/i.test(key);
      return `${key}: ${isSensitive ? "[REDACTED]" : value}`;
    });

  const output = {
    total: safeKeys.length,
    showing: envList.length,
    filter: filter || "none",
    vars: envList,
  };

  return new Response(JSON.stringify(output, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
