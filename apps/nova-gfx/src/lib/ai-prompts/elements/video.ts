/**
 * Video Element Documentation
 * Updated: 2024-12
 */

export const VIDEO_ELEMENT_DOCS = `### Video Element

Video embeds supporting YouTube, Vimeo, direct files, and streaming URLs.

#### Basic Video:
\`\`\`json
{
  "element_type": "video",
  "name": "Video Player",
  "position_x": 100,
  "position_y": 100,
  "width": 640,
  "height": 360,
  "content": {
    "type": "video",
    "src": "https://example.com/video.mp4",
    "loop": false,
    "muted": true,
    "autoplay": true
  }
}
\`\`\`

#### Video Properties:
\`\`\`json
{
  "content": {
    "type": "video",
    "src": "video-url",
    "videoType": "file",       // Auto-detected: "file" | "youtube" | "vimeo" | "stream"
    "loop": true,
    "muted": true,
    "autoplay": true,
    "poster": "https://example.com/thumbnail.jpg"
  }
}
\`\`\`

#### Supported Sources:

**YouTube**:
\`\`\`json
{ "src": "https://www.youtube.com/watch?v=VIDEO_ID" }
{ "src": "https://youtu.be/VIDEO_ID" }
\`\`\`

**Vimeo**:
\`\`\`json
{ "src": "https://vimeo.com/VIDEO_ID" }
\`\`\`

**Direct File** (.mp4, .webm, .ogg, .mov, .avi, .mkv):
\`\`\`json
{ "src": "https://example.com/video.mp4" }
\`\`\`

**HLS/DASH Streams** (.m3u8, .mpd):
\`\`\`json
{ "src": "https://example.com/stream.m3u8" }
\`\`\`

**Supabase Storage**:
\`\`\`json
{ "src": "https://xxx.supabase.co/storage/v1/object/..." }
\`\`\`

#### Video Type Auto-Detection:
The system automatically detects video type from URL:
- YouTube URLs → embedded iframe with YouTube player
- Vimeo URLs → embedded iframe with Vimeo player
- Stream URLs (.m3u8, .mpd) → HLS/DASH player
- Other URLs → native HTML5 video

#### Notes:
- For broadcast, set \`muted: true\` to prevent audio conflicts
- Use \`poster\` for a thumbnail before playback
- YouTube/Vimeo embeds have limited control (no programmatic pause in preview)`;
