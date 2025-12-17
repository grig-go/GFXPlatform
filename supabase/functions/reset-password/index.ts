// ============================================================================
// /supabase/functions/reset-password/index.ts
// Resets a user's password (admin only)
// ============================================================================
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

// ----------------------------------------------------------------------------
// Supabase clients
// ----------------------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ----------------------------------------------------------------------------
// App setup
// ----------------------------------------------------------------------------
const app = new Hono().basePath("/reset-password");

app.use("*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "apikey"],
}));

// ============================================================================
// POST / - Reset a user's password
// ============================================================================
app.post("/", async (c) => {
  try {
    // Get authorization header
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Missing authorization header" }, 401);
    }

    // Verify caller is authenticated
    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if caller has permission to reset passwords
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from("u_users")
      .select("id, is_superuser")
      .eq("auth_user_id", caller.id)
      .single();

    if (callerError || !callerData) {
      console.error("Caller lookup error:", callerError);
      return c.json({ error: "User not found in system" }, 403);
    }

    if (!callerData.is_superuser) {
      // Check for admin permission via groups
      const { data: groupMembers } = await supabaseAdmin
        .from("u_group_members")
        .select("group_id")
        .eq("user_id", callerData.id);

      if (groupMembers && groupMembers.length > 0) {
        const groupIds = groupMembers.map((gm: any) => gm.group_id);
        const { data: groupPerms } = await supabaseAdmin
          .from("u_group_permissions")
          .select("u_permissions(app_key, resource, action)")
          .in("group_id", groupIds);

        const hasAdminPermission = groupPerms?.some((gp: any) =>
          gp.u_permissions?.app_key === "system" &&
          gp.u_permissions?.resource === "users" &&
          gp.u_permissions?.action === "admin"
        );

        if (!hasAdminPermission) {
          return c.json({ error: "Permission denied. Admin access required." }, 403);
        }
      } else {
        return c.json({ error: "Permission denied. Admin access required." }, 403);
      }
    }

    // Parse request body
    const body = await c.req.json();
    const { userId, newPassword } = body;

    console.log("Resetting password for user:", userId);

    // Validate required fields
    if (!userId || !newPassword) {
      return c.json({ error: "User ID and new password are required" }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Get user's auth_user_id from u_users
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("u_users")
      .select("id, auth_user_id, email")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      console.error("Target user lookup error:", targetError);
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent resetting superuser password unless caller is also superuser
    const { data: targetUserFull } = await supabaseAdmin
      .from("u_users")
      .select("is_superuser")
      .eq("id", userId)
      .single();

    if (targetUserFull?.is_superuser && !callerData.is_superuser) {
      return c.json({ error: "Cannot reset superuser password" }, 403);
    }

    // Reset password using admin API
    console.log("Updating auth user password...");
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return c.json({ error: updateError.message || "Failed to reset password" }, 500);
    }

    // Log the action
    await supabaseAdmin.from("u_audit_log").insert({
      user_id: caller.id,
      action: "password_reset",
      table_name: "auth.users",
      record_id: targetUser.auth_user_id,
      new_values: { target_email: targetUser.email },
    });

    console.log("Password reset successfully for:", targetUser.email);

    return c.json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return c.json({ error: "Internal server error: " + (error as Error).message }, 500);
  }
});

// ============================================================================
// Export
// ============================================================================
Deno.serve(app.fetch);
