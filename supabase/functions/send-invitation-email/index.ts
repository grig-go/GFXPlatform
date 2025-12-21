import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, inviterName, organizationName, role, inviteUrl } = await req.json() as InvitationEmailRequest;

    if (!email || !inviteUrl || !organizationName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, inviteUrl, organizationName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Sending invitation email to:", email, "for org:", organizationName);

    // Use Supabase's inviteUserByEmail which sends an email automatically
    // The user will receive an email with a link to set their password
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
      data: {
        invitation_url: inviteUrl,
        organization_name: organizationName,
        inviter_name: inviterName,
        role: role,
      }
    });

    if (error) {
      console.error("Error sending invite:", error);

      // Check if user already exists (common case)
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        // For existing users, we can't use inviteUserByEmail
        // The invitation link they have will work - they just need to log in
        return new Response(
          JSON.stringify({
            success: true,
            warning: "User already has an account. They can use the invitation link to join the organization.",
            inviteUrl: inviteUrl
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          inviteUrl: inviteUrl
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Invitation email sent successfully to:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        userId: data.user?.id,
        inviteUrl: inviteUrl
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
