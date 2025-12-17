// file-server/server.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as path from "https://deno.land/std@0.168.0/path/mod.ts";
import { load } from "https://deno.land/std@0.168.0/dotenv/mod.ts";

// Load .env - try monorepo root first, then local directory
const scriptDir = path.dirname(path.fromFileUrl(import.meta.url));
const monorepoRoot = path.resolve(scriptDir, "../../..");
const rootEnvPath = path.join(monorepoRoot, ".env");
const localEnvPath = path.join(scriptDir, ".env");

let envVars: Record<string, string> = {};

// Try monorepo root .env first
try {
  envVars = await load({ envPath: rootEnvPath, export: true });
  console.log("✅ Loaded .env from:", rootEnvPath);
  console.log("   Variables:", Object.keys(envVars).join(", "));
} catch (e) {
  // Try local .env as fallback
  try {
    envVars = await load({ envPath: localEnvPath, export: true });
    console.log("✅ Loaded .env from:", localEnvPath);
    console.log("   Variables:", Object.keys(envVars).join(", "));
  } catch (e2) {
    console.log("ℹ️ No .env file found, using environment variables");
  }
}

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
  extension?: string;
}

interface BrowseRequest {
  action: "list" | "read" | "info";
  path?: string;
  relativePath?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

// Use envVars directly (loaded above) with Deno.env.get as fallback
const FILE_ROOT = envVars.FILE_ROOT || Deno.env.get("FILE_ROOT") || "/tmp/files";
const ALLOWED_EXTENSIONS = (envVars.ALLOWED_EXTENSIONS || Deno.env.get("ALLOWED_EXTENSIONS"))?.split(",") || [
  "csv",
  "tsv",
  "txt",
  "json",
  "xml",
  "xlsx",
  "xls",
];
const MAX_FILE_SIZE = parseInt(
  envVars.MAX_FILE_SIZE || Deno.env.get("MAX_FILE_SIZE") || "52428800"
); // 50MB default
const PORT = parseInt(envVars.PORT || Deno.env.get("PORT") || "8001");

console.log("=================================");
console.log("File Server Starting...");
console.log("FILE_ROOT:", FILE_ROOT);
console.log("PORT:", PORT);
console.log("ALLOWED_EXTENSIONS:", ALLOWED_EXTENSIONS);
console.log("MAX_FILE_SIZE:", MAX_FILE_SIZE);
console.log("=================================");

// Sanitize file paths to prevent directory traversal
function sanitizePath(inputPath: string): string {
  // Remove any leading/trailing whitespace
  let sanitized = inputPath.trim();

  // Remove any leading slashes
  sanitized = sanitized.replace(/^\/+/, "");

  // Split and filter path segments
  const segments = sanitized.split("/").filter((segment) => {
    // Remove empty segments and dangerous patterns
    return (
      segment &&
      segment !== "." &&
      segment !== ".." &&
      !segment.includes("\\") &&
      !segment.includes("\0")
    );
  });

  return segments.join("/");
}

// List directory contents with filtering
async function listDirectory(
  dirPath: string,
  rootPath: string,
  allowedExtensions: string[]
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    // Check if path exists and is a directory
    const dirInfo = await Deno.stat(dirPath);
    if (!dirInfo.isDirectory) {
      throw new Error("Path is not a directory");
    }

    // Read directory contents
    for await (const entry of Deno.readDir(dirPath)) {
      // Skip hidden files/directories (starting with .)
      if (entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, entryPath);

      try {
        const stat = await Deno.stat(entryPath);

        if (entry.isFile) {
          // Check file extension
          const ext = path.extname(entry.name).toLowerCase().slice(1);
          if (ext && !allowedExtensions.includes(ext)) {
            continue; // Skip files with disallowed extensions
          }

          entries.push({
            name: entry.name,
            path: relativePath,
            type: "file",
            size: stat.size,
            modified: stat.mtime?.toISOString(),
            extension: ext,
          });
        } else if (entry.isDirectory) {
          entries.push({
            name: entry.name,
            path: relativePath,
            type: "directory",
            modified: stat.mtime?.toISOString(),
          });
        }
      } catch (statError) {
        console.warn(`Could not stat ${entryPath}:`, statError);
        // Skip entries we can't stat
      }
    }

    // Sort: directories first, then files, alphabetically
    entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    throw new Error(`Could not read directory: ${error.message}`);
  }

  return entries;
}

// Detect file metadata for preview
async function detectFileMetadata(content: string, filePath: string) {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const lines = content.split("\n").slice(0, 5); // First 5 lines for preview

  const metadata: any = {
    extension: ext,
    lineCount: content.split("\n").length,
    preview: lines,
    encoding: "utf-8", // Assuming UTF-8 for text files
  };

  // Detect CSV/TSV structure
  if (ext === "csv" || ext === "tsv") {
    const delimiter = ext === "csv" ? "," : "\t";
    const firstLine = lines[0] || "";
    const columnCount = firstLine.split(delimiter).length;

    metadata.delimiter = delimiter;
    metadata.columnCount = columnCount;
    metadata.hasHeaders = detectHeaders(lines[0], lines[1], delimiter);

    if (metadata.hasHeaders) {
      metadata.headers = firstLine.split(delimiter).map((h) => h.trim());
    }
  }

  // Detect JSON structure
  if (ext === "json") {
    try {
      const parsed = JSON.parse(content);
      metadata.isArray = Array.isArray(parsed);
      metadata.recordCount = Array.isArray(parsed) ? parsed.length : undefined;

      if (Array.isArray(parsed) && parsed.length > 0) {
        metadata.sampleKeys = Object.keys(parsed[0]);
      } else if (typeof parsed === "object") {
        metadata.topLevelKeys = Object.keys(parsed);
      }
    } catch (e) {
      metadata.parseError = "Invalid JSON format";
    }
  }

  return metadata;
}

// Simple heuristic to detect if first row contains headers
function detectHeaders(
  firstLine: string,
  secondLine: string,
  delimiter: string
): boolean {
  if (!firstLine || !secondLine) return false;

  const firstCols = firstLine.split(delimiter);
  const secondCols = secondLine.split(delimiter);

  // Check if first row has any numeric values
  const firstHasNumbers = firstCols.some(
    (col) => !isNaN(parseFloat(col.trim()))
  );
  const secondHasNumbers = secondCols.some(
    (col) => !isNaN(parseFloat(col.trim()))
  );

  // If first row has no numbers but second row does, likely headers
  if (!firstHasNumbers && secondHasNumbers) return true;

  // Check if first row values look like headers (contain letters, no special chars)
  const headerPattern = /^[a-zA-Z][a-zA-Z0-9_\s-]*$/;
  const firstLooksLikeHeaders = firstCols.every(
    (col) => headerPattern.test(col.trim()) || col.trim() === ""
  );

  return firstLooksLikeHeaders;
}

// Main request handler
async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate FILE_ROOT is configured
    if (!FILE_ROOT) {
      throw new Error("FILE_ROOT environment variable not configured");
    }

    // Handle GET requests - serve files directly by URL path
    if (req.method === "GET") {
      const url = new URL(req.url);
      const relativePath = decodeURIComponent(url.pathname.slice(1)); // Remove leading /

      if (!relativePath) {
        // Root path - list directory
        const entries = await listDirectory(FILE_ROOT, FILE_ROOT, ALLOWED_EXTENSIONS);
        return new Response(
          JSON.stringify({ success: true, path: "", entries, root: FILE_ROOT }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      const sanitizedPath = sanitizePath(relativePath);
      const fullPath = path.join(FILE_ROOT, sanitizedPath);

      // Ensure the resolved path is within FILE_ROOT
      if (!fullPath.startsWith(FILE_ROOT)) {
        throw new Error("Access denied: Path traversal attempt detected");
      }

      const fileInfo = await Deno.stat(fullPath);

      if (fileInfo.isDirectory) {
        // List directory contents
        const entries = await listDirectory(fullPath, FILE_ROOT, ALLOWED_EXTENSIONS);
        return new Response(
          JSON.stringify({ success: true, path: sanitizedPath, entries, root: FILE_ROOT }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }

      // Serve file directly
      const ext = path.extname(fullPath).toLowerCase().slice(1);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`File type .${ext} is not allowed`);
      }

      if (fileInfo.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE} bytes`);
      }

      console.log(`GET: Serving file ${sanitizedPath} (${fileInfo.size} bytes)`);
      const content = await Deno.readTextFile(fullPath);

      // Return raw file content with appropriate content type
      const contentType = ext === "json" ? "application/json" :
                          ext === "xml" ? "application/xml" :
                          ext === "csv" ? "text/csv" :
                          ext === "tsv" ? "text/tab-separated-values" :
                          "text/plain";

      return new Response(content, {
        headers: { ...corsHeaders, "Content-Type": contentType },
        status: 200,
      });
    }

    // Handle POST requests - original JSON API
    const body: BrowseRequest = await req.json();
    const { action, relativePath = "" } = body;

    console.log(`Request: ${action} - ${relativePath || "(root)"}`);

    // Sanitize and validate the path
    const sanitizedPath = sanitizePath(relativePath);
    const fullPath = path.join(FILE_ROOT, sanitizedPath);

    // Ensure the resolved path is within FILE_ROOT
    if (!fullPath.startsWith(FILE_ROOT)) {
      throw new Error("Access denied: Path traversal attempt detected");
    }

    switch (action) {
      case "list": {
        // List directory contents
        const entries = await listDirectory(
          fullPath,
          FILE_ROOT,
          ALLOWED_EXTENSIONS
        );

        console.log(`Found ${entries.length} entries in ${sanitizedPath}`);

        return new Response(
          JSON.stringify({
            success: true,
            path: sanitizedPath,
            entries,
            root: FILE_ROOT,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "read": {
        // Read file contents
        const fileInfo = await Deno.stat(fullPath);

        if (!fileInfo.isFile) {
          throw new Error("Path is not a file");
        }

        // Check file size
        if (fileInfo.size > MAX_FILE_SIZE) {
          throw new Error(
            `File too large. Maximum size is ${MAX_FILE_SIZE} bytes`
          );
        }

        // Check extension
        const ext = path.extname(fullPath).toLowerCase().slice(1);
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          throw new Error(`File type .${ext} is not allowed`);
        }

        console.log(`Reading file: ${sanitizedPath} (${fileInfo.size} bytes)`);

        // Read the file
        const content = await Deno.readTextFile(fullPath);

        // Detect file format and metadata
        const metadata = await detectFileMetadata(content, fullPath);

        return new Response(
          JSON.stringify({
            success: true,
            path: sanitizedPath,
            content,
            metadata,
            size: fileInfo.size,
            modified: fileInfo.mtime?.toISOString(),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "info": {
        // Get file/directory information without reading content
        const info = await Deno.stat(fullPath);

        return new Response(
          JSON.stringify({
            success: true,
            path: sanitizedPath,
            info: {
              isFile: info.isFile,
              isDirectory: info.isDirectory,
              size: info.size,
              modified: info.mtime?.toISOString(),
              created: info.birthtime?.toISOString(),
            },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("File browser error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message?.includes("Access denied") ? 403 : 400,
      }
    );
  }
}

// Start the server
console.log(`\n🚀 File server listening on http://localhost:${PORT}\n`);
serve(handleRequest, { port: PORT });