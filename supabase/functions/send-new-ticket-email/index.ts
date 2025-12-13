import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "grig@emergent.new";

interface NewTicketRequest {
  ticketId: string;
  ticketTitle: string;
  ticketType: string;
  ticketPriority: string;
  ticketDescription: string;
  userEmail: string;
  userName?: string | null;
  projectName?: string | null;
  app?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      ticketId,
      ticketTitle,
      ticketType,
      ticketPriority,
      ticketDescription,
      userEmail,
      userName,
      projectName,
      app,
    } = await req.json() as NewTicketRequest;

    if (!ticketId || !ticketTitle || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const typeEmoji = {
      bug: "🐛",
      feature: "💡",
      question: "❓",
      other: "📋",
    }[ticketType] || "📋";

    const priorityColor = {
      low: "#64748b",
      medium: "#3b82f6",
      high: "#f59e0b",
      critical: "#ef4444",
    }[ticketPriority] || "#64748b";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Support Ticket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${typeEmoji} New Support Ticket</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">A new support ticket has been submitted.</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; width: 100px;">Title</td>
          <td style="padding: 8px 0; font-weight: 600;">${ticketTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Type</td>
          <td style="padding: 8px 0;">${typeEmoji} ${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Priority</td>
          <td style="padding: 8px 0;"><span style="background: ${priorityColor}20; color: ${priorityColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${ticketPriority.toUpperCase()}</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">From</td>
          <td style="padding: 8px 0;">${userName ? `${userName} (${userEmail})` : userEmail}</td>
        </tr>
        ${app ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">App</td>
          <td style="padding: 8px 0;">${app}</td>
        </tr>
        ` : ''}
        ${projectName ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Project</td>
          <td style="padding: 8px 0;">${projectName}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">ID</td>
          <td style="padding: 8px 0; font-size: 12px; color: #6b7280;">${ticketId}</td>
        </tr>
      </table>
    </div>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Description</p>
      <p style="margin: 0; white-space: pre-wrap;">${ticketDescription}</p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
      View and manage tickets in Nova GFX or Pulsar GFX Settings > Tickets
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
New Support Ticket

Title: ${ticketTitle}
Type: ${ticketType}
Priority: ${ticketPriority}
From: ${userName ? `${userName} (${userEmail})` : userEmail}
${app ? `App: ${app}` : ''}
${projectName ? `Project: ${projectName}` : ''}
ID: ${ticketId}

Description:
${ticketDescription}

---
View and manage tickets in Nova GFX or Pulsar GFX Settings > Tickets
    `.trim();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Emergent Platform <support@emergentplatform.com>",
        to: [ADMIN_EMAIL],
        subject: `${typeEmoji} New ${ticketType} ticket: ${ticketTitle}`,
        html: htmlContent,
        text: textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
