import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
};
console.log("[media-library] Edge Function started");
serve(async (req)=>{
  console.log(`[media-library] Incoming request: ${req.method} ${req.url}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    console.log(`[DEBUG] Method: ${method}, Pathname: ${url.pathname}`);
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // ============================================================
    // ✅ GET /systems — fetch all systems
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/systems")) {
      const { data, error } = await supabase.from("systems").select("id, name, ip_address, port, system_type, description, channel, created_at").order("name", {
        ascending: true
      });
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch systems",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      return new Response(JSON.stringify({
        data: data || []
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // GET /distribute — fetch distributions for an asset
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/distribute")) {
      const media_asset_id = url.searchParams.get("media_asset_id");
      if (!media_asset_id) return new Response(JSON.stringify({
        error: "Missing required parameter: media_asset_id"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data, error } = await supabase.from("media_distribution").select(`
          id, path, status, last_sync,
          systems ( id, name, ip_address, port, system_type, channel )
        `).eq("media_id", media_asset_id).order("created_at", {
        ascending: false
      });
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch distributions",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      return new Response(JSON.stringify({
        data: data || []
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // GET — fetch and filter media
    // ============================================================
    if (method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 24;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const type = url.searchParams.get("type");
      const source = url.searchParams.get("source");
      const model = url.searchParams.get("model");
      const search = url.searchParams.get("search");
      let query = supabase.from("media_assets").select(`
          id, name, file_name, description, file_url, thumbnail_url, storage_path,
          media_type, created_by, ai_model_used, tags, created_at, metadata,
          latitude, longitude, on_map,
          media_distribution (
            id, path, status, last_sync,
            systems ( name, ip_address, port, system_type, channel )
          )
        `, {
        count: "exact"
      }).order("created_at", {
        ascending: false
      }).range(offset, offset + limit - 1);
      if (type) query = query.eq("media_type", type);
      if (source) query = query.ilike("created_by", `%${source}%`);
      if (model) query = query.ilike("ai_model_used", `%${model}%`);
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error, count } = await query;
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch media assets",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const formatted = (data || []).map((asset)=>{
        const dist = (asset.media_distribution || []).map((d)=>({
            system_name: d.systems?.name,
            system_type: d.systems?.system_type,
            ip_address: d.systems?.ip_address,
            port: d.systems?.port,
            path: d.path,
            status: d.status,
            last_sync: d.last_sync
          }));
        return {
          id: asset.id,
          name: asset.name,
          file_name: asset.file_name,
          file_url: asset.file_url,
          thumbnail_url: asset.thumbnail_url,
          storage_path: asset.storage_path,
          media_type: asset.media_type,
          created_by: asset.created_by,
          ai_model_used: asset.ai_model_used,
          tags: asset.tags,
          created_at: asset.created_at,
          size: asset.metadata?.size || null,
          latitude: asset.latitude,
          longitude: asset.longitude,
          on_map: asset.on_map === true,
          distribution: dist
        };
      });
      return new Response(JSON.stringify({
        data: formatted,
        count
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // POST /generate-thumbnail — Generate thumbnail for video
    // ============================================================
    if (method === "POST" && url.pathname.includes("/generate-thumbnail")) {
      console.log("🎬 Handling video thumbnail generation");
      const formData = await req.formData();
      const thumbnailFile = formData.get("thumbnail");
      const videoAssetId = formData.get("video_asset_id");
      if (!thumbnailFile || !videoAssetId) {
        return new Response(JSON.stringify({
          error: "Missing thumbnail file or video_asset_id"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Fetch the video asset to get its info
      const { data: videoAsset, error: fetchError } = await supabase.from("media_assets").select("id, name, storage_path").eq("id", videoAssetId).single();
      if (fetchError || !videoAsset) {
        return new Response(JSON.stringify({
          error: "Video asset not found"
        }), {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      const bucketName = "media";
      const timestamp = Date.now();
      const thumbnailPath = `video/thumbnails/${timestamp}_${crypto.randomUUID()}.jpg`;
      // Upload thumbnail to storage
      const { data: thumbnailUploadData, error: thumbnailUploadError } = await supabase.storage.from(bucketName).upload(thumbnailPath, thumbnailFile, {
        contentType: 'image/jpeg',
        upsert: false
      });
      if (thumbnailUploadError) {
        return new Response(JSON.stringify({
          error: "Failed to upload thumbnail",
          details: thumbnailUploadError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      const { data: thumbnailUrlData } = supabase.storage.from(bucketName).getPublicUrl(thumbnailUploadData.path);
      // Update the video asset with new thumbnail URL
      const { data: updatedAsset, error: updateError } = await supabase.from("media_assets").update({
        thumbnail_url: thumbnailUrlData.publicUrl
      }).eq("id", videoAssetId).select().single();
      if (updateError) {
        // Clean up uploaded thumbnail if DB update fails
        await supabase.storage.from(bucketName).remove([
          thumbnailUploadData.path
        ]);
        return new Response(JSON.stringify({
          error: "Failed to update asset",
          details: updateError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      console.log("✅ Video thumbnail generated successfully:", thumbnailUrlData.publicUrl);
      return new Response(JSON.stringify({
        success: true,
        thumbnail_url: thumbnailUrlData.publicUrl,
        data: updatedAsset
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // POST — upload or update media asset
    // ============================================================
    if (method === "POST") {
      console.log("📤 Handling media upload/update");
      const formData = await req.formData();
      const id = formData.get("id");
      const file = formData.get("file");
      const thumbnailFile = formData.get("thumbnail"); // Video thumbnail
      const name = formData.get("name");
      const description = formData.get("description") || "";
      const tagsStr = formData.get("tags") || "[]";
      const tags = JSON.parse(tagsStr);
      const mediaType = formData.get("media_type") || "image";
      const createdBy = formData.get("created_by") || "user";
      const aiModelUsed = formData.get("ai_model_used");
      // Parse latitude and longitude (optional fields)
      const latitudeStr = formData.get("latitude");
      const longitudeStr = formData.get("longitude");
      const latitude = latitudeStr && latitudeStr !== "" ? parseFloat(latitudeStr) : null;
      const longitude = longitudeStr && longitudeStr !== "" ? parseFloat(longitudeStr) : null;
      // Update metadata only
      if (id && !file) {
        const updateData = {};
        // Parse on_map (optional)
        const onMapStr = formData.get("on_map");
        if (onMapStr === "true") updateData.on_map = true;
        if (onMapStr === "false") updateData.on_map = false;
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags) updateData.tags = tags;
        if (mediaType) updateData.media_type = mediaType;
        if (createdBy) updateData.created_by = createdBy;
        if (aiModelUsed) updateData.ai_model_used = aiModelUsed;
        if (latitude !== null) updateData.latitude = latitude;
        if (longitude !== null) updateData.longitude = longitude;
        const { data, error } = await supabase.from("media_assets").update(updateData).eq("id", id).select().single();
        return new Response(JSON.stringify({
          data
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      if (!file) return new Response(JSON.stringify({
        error: "No file provided"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      // Upload — now with subfolders by type
      const bucketName = "media";
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const folder = mediaType === "video" ? "video" : mediaType === "audio" ? "audio" : "image";
      const storagePath = `${folder}/${timestamp}_${crypto.randomUUID()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) return new Response(JSON.stringify({
        error: "Failed to upload file",
        details: uploadError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
      // Handle video thumbnail upload
      let thumbnailUrl = urlData.publicUrl;
      if (mediaType === "video" && thumbnailFile) {
        try {
          console.log("🎬 Uploading video thumbnail...");
          const thumbnailPath = `${folder}/thumbnails/${timestamp}_${crypto.randomUUID()}.jpg`;
          // Upload thumbnail to storage
          const { data: thumbnailUploadData, error: thumbnailUploadError } = await supabase.storage.from(bucketName).upload(thumbnailPath, thumbnailFile, {
            contentType: 'image/jpeg',
            upsert: false
          });
          if (thumbnailUploadError) {
            console.error("⚠️ Failed to upload thumbnail:", thumbnailUploadError);
          } else {
            const { data: thumbnailUrlData } = supabase.storage.from(bucketName).getPublicUrl(thumbnailUploadData.path);
            thumbnailUrl = thumbnailUrlData.publicUrl;
            console.log("✅ Video thumbnail uploaded successfully:", thumbnailUrl);
          }
        } catch (thumbnailError) {
          console.error("⚠️ Failed to process video thumbnail:", thumbnailError);
        // Continue with video URL as fallback
        }
      }
      // Insert DB record
      const { data: assetData, error: dbError } = await supabase.from("media_assets").insert({
        name: name || file.name,
        file_name: file.name,
        description,
        storage_path: uploadData.path,
        file_url: urlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        media_type: mediaType,
        created_by: createdBy,
        ai_model_used: aiModelUsed,
        tags,
        metadata: {
          size: file.size,
          mimeType: file.type
        },
        latitude,
        longitude
      }).select().single();
      if (dbError) {
        await supabase.storage.from(bucketName).remove([
          uploadData.path
        ]);
        return new Response(JSON.stringify({
          error: "Failed to create database record",
          details: dbError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        data: assetData
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // DELETE /media/:id — delete asset + file
    // ============================================================
    if (method === "DELETE" && url.pathname.includes("/media/")) {
      const parts = url.pathname.split("/");
      const mediaId = parts[parts.length - 1];
      if (!mediaId) return new Response(JSON.stringify({
        error: "Missing media ID"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data: asset, error: fetchError } = await supabase.from("media_assets").select("storage_path").eq("id", mediaId).single();
      if (fetchError || !asset) return new Response(JSON.stringify({
        error: fetchError?.message || "Asset not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { error: dbError } = await supabase.from("media_assets").delete().eq("id", mediaId);
      if (dbError) return new Response(JSON.stringify({
        error: dbError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      if (asset?.storage_path) {
        const { error: storageError } = await supabase.storage.from("media").remove([
          asset.storage_path
        ]);
        if (storageError) console.warn("⚠️ File removal failed:", storageError.message);
      }
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // PATCH — bulk operations (delete, add tags, archive)
    // ============================================================
    if (method === "PATCH") {
      const body = await req.json();
      const { operation, ids, tags } = body;
      if (!operation || !Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({
          error: "Missing required parameters: operation and ids"
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      console.log(`📦 Bulk operation: ${operation} on ${ids.length} assets`);
      // Bulk delete
      if (operation === "delete") {
        const results = {
          success: 0,
          failed: 0,
          errors: []
        };
        for (const id of ids){
          try {
            // Fetch storage path
            const { data: asset, error: fetchError } = await supabase.from("media_assets").select("storage_path").eq("id", id).single();
            if (fetchError || !asset) {
              results.failed++;
              results.errors.push(`Asset ${id} not found`);
              continue;
            }
            // Delete from database
            const { error: dbError } = await supabase.from("media_assets").delete().eq("id", id);
            if (dbError) {
              results.failed++;
              results.errors.push(`DB delete failed for ${id}: ${dbError.message}`);
              continue;
            }
            // Delete from storage
            if (asset.storage_path) {
              const { error: storageError } = await supabase.storage.from("media").remove([
                asset.storage_path
              ]);
              if (storageError) {
                console.warn(`⚠️ Storage delete failed for ${id}:`, storageError.message);
              }
            }
            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        return new Response(JSON.stringify(results), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Bulk add tags
      if (operation === "add_tags") {
        if (!Array.isArray(tags) || tags.length === 0) {
          return new Response(JSON.stringify({
            error: "Tags array is required for add_tags operation"
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
        const results = {
          success: 0,
          failed: 0,
          errors: []
        };
        for (const id of ids){
          try {
            // Fetch current tags
            const { data: asset, error: fetchError } = await supabase.from("media_assets").select("tags").eq("id", id).single();
            if (fetchError || !asset) {
              results.failed++;
              results.errors.push(`Asset ${id} not found`);
              continue;
            }
            // Merge tags (avoid duplicates)
            const currentTags = asset.tags || [];
            const newTags = Array.from(new Set([
              ...currentTags,
              ...tags
            ]));
            // Update tags
            const { error: updateError } = await supabase.from("media_assets").update({
              tags: newTags
            }).eq("id", id);
            if (updateError) {
              results.failed++;
              results.errors.push(`Update failed for ${id}: ${updateError.message}`);
              continue;
            }
            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        return new Response(JSON.stringify(results), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      // Bulk archive (just marks items, doesn't delete)
      if (operation === "archive") {
        const results = {
          success: 0,
          failed: 0,
          errors: []
        };
        for (const id of ids){
          try {
            // Add "archived" tag
            const { data: asset, error: fetchError } = await supabase.from("media_assets").select("tags").eq("id", id).single();
            if (fetchError || !asset) {
              results.failed++;
              results.errors.push(`Asset ${id} not found`);
              continue;
            }
            const currentTags = asset.tags || [];
            if (!currentTags.includes("archived")) {
              const newTags = [
                ...currentTags,
                "archived"
              ];
              const { error: updateError } = await supabase.from("media_assets").update({
                tags: newTags
              }).eq("id", id);
              if (updateError) {
                results.failed++;
                results.errors.push(`Archive failed for ${id}: ${updateError.message}`);
                continue;
              }
            }
            results.success++;
          } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : String(err));
          }
        }
        return new Response(JSON.stringify(results), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        error: `Unknown operation: ${operation}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // Default — Method not allowed
    // ============================================================
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("❌ Error in media-library function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
