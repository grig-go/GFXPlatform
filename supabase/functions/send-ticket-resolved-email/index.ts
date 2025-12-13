import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  ticketTitle: string;
  ticketId: string;
  userName?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, ticketTitle, ticketId, userName } = await req.json() as EmailRequest;

    if (!to || !ticketTitle || !ticketId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, ticketTitle, ticketId" }),
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

    const greeting = userName ? `Hi ${userName}` : "Hi there";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Ticket Resolved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8B5CF6, #6366F1); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Your Ticket Has Been Resolved</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin-top: 0;">${greeting},</p>

    <p>Great news! Your support ticket has been resolved.</p>

    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket</p>
      <p style="margin: 5px 0 0; font-weight: 600; font-size: 16px;">${ticketTitle}</p>
      <p style="margin: 10px 0 0; color: #6b7280; font-size: 12px;">ID: ${ticketId}</p>
    </div>

    <p>If you have any further questions or if the issue persists, please don't hesitate to submit a new ticket.</p>

    <p style="margin-bottom: 0;">Thank you for using Emergent Platform!</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
      This is an automated message from Emergent Platform Support.
    </p>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
${greeting},

Great news! Your support ticket has been resolved.

Ticket: ${ticketTitle}
ID: ${ticketId}

If you have any further questions or if the issue persists, please don't hesitate to submit a new ticket.

Thank you for using Emergent Platform!

---
This is an automated message from Emergent Platform Support.
    `.trim();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Emergent Platform <support@emergentplatform.com>",
        to: [to],
        subject: `Your support ticket has been resolved: ${ticketTitle}`,
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
