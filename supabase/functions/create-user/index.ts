// ============================================================================
// /supabase/functions/create-user/index.ts
// Creates a new user in Supabase Auth and u_users table
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
const app = new Hono().basePath("/create-user");

app.use("*", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "apikey", "x-client-info", "cache-control", "pragma", "expires"],
}));

// ============================================================================
// POST / - Create a new user
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

    // Check if caller has permission to create users
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
    const { email, password, fullName, status = 'active', groupIds = [], sendWelcomeEmail = false, organizationId } = body;

    console.log("Creating user:", { email, fullName, status, groupIds: groupIds.length, organizationId });

    // Validate required fields
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Check if user already exists in u_users
    const { data: existingUser } = await supabaseAdmin
      .from("u_users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return c.json({ error: "A user with this email already exists" }, 400);
    }

    // Create user in auth.users
    console.log("Creating auth user...");
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !authData.user) {
      console.error("Error creating auth user:", createError);
      return c.json({ error: createError?.message || "Failed to create auth user" }, 500);
    }

    console.log("Auth user created:", authData.user.id);

    // Get the caller's organization if not provided
    let userOrgId = organizationId;
    if (!userOrgId) {
      // Get the caller's organization_id to assign new user to same org
      const { data: callerOrgData } = await supabaseAdmin
        .from("u_users")
        .select("organization_id")
        .eq("auth_user_id", caller.id)
        .single();

      userOrgId = callerOrgData?.organization_id;
    }

    // Create user in u_users
    const { data: userData, error: userError } = await supabaseAdmin
      .from("u_users")
      .insert({
        auth_user_id: authData.user.id,
        email: email,
        full_name: fullName || null,
        status: status,
        is_superuser: false,
        created_by: caller.id,
        organization_id: userOrgId,
        org_role: 'member',
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating u_users record:", userError);
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: "Failed to create user record: " + userError.message }, 500);
    }

    console.log("u_users record created:", userData.id);

    // Add user to groups
    if (groupIds.length > 0) {
      const groupMemberships = groupIds.map((groupId: string) => ({
        user_id: userData.id,
        group_id: groupId,
      }));

      const { error: groupError } = await supabaseAdmin
        .from("u_group_members")
        .insert(groupMemberships);

      if (groupError) {
        console.error("Error adding user to groups:", groupError);
        // Continue - user is created, just not in groups
      } else {
        console.log("User added to", groupIds.length, "groups");
      }
    }

    // Log the action
    await supabaseAdmin.from("u_audit_log").insert({
      user_id: caller.id,
      action: "create",
      table_name: "u_users",
      record_id: userData.id,
      new_values: { email, full_name: fullName, status, group_ids: groupIds },
    });

    // TODO: Send welcome email if requested
    if (sendWelcomeEmail) {
      console.log(`TODO: Send welcome email to ${email}`);
    }

    console.log("User created successfully");

    return c.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        status: userData.status,
      },
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
