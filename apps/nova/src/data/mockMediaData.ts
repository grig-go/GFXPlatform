import { MediaAsset, SystemDistribution } from "../types/media";

export const mockMediaAssets: MediaAsset[] = [
  {
    id: "1",
    name: "stadium_night_v6.png",
    description: "Futuristic stadium night render with neon lights",
    file_url: "https://images.unsplash.com/photo-1716561388086-cbc1e07f9f65?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1716561388086-cbc1e07f9f65?w=400",
    file_type: "image",
    file_size: 2456789,
    dimensions: { width: 3840, height: 2160 },
    source: "ai-generated",
    ai_model_used: "SDXL Turbo v1.1",
    generation_prompt: "Futuristic stadium night render, neon lights",
    created_by: "auto:Pulsar",
    created_at: "2025-10-26T14:32:00Z",
    tags: ["stadium", "night", "LED", "architecture"],
    checksum: "a3f5b2c8d9e1f4a7b6c5d8e9f1a2b3c4",
    usage_count: 4,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "2",
    name: "athlete_portrait_001.jpg",
    description: "Professional athlete portrait for sports coverage",
    file_url: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=400",
    file_type: "image",
    file_size: 1876543,
    dimensions: { width: 2560, height: 3840 },
    source: "ai-generated",
    ai_model_used: "Midjourney v6",
    generation_prompt: "Professional athlete portrait, dramatic lighting, 4k",
    created_by: "auto:Pulsar",
    created_at: "2025-10-25T11:20:00Z",
    tags: ["athlete", "portrait", "sports", "professional"],
    checksum: "b4e6c3d9a1f5e8b7c6d9e2f3a4b5c6d7",
    usage_count: 2,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "3",
    name: "weather_graphics_pack.png",
    description: "Animated weather graphics for broadcast",
    file_url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400",
    file_type: "image",
    file_size: 3245678,
    dimensions: { width: 1920, height: 1080 },
    source: "ai-generated",
    ai_model_used: "DALL·E 3",
    generation_prompt: "Modern weather graphics overlay, clean design",
    created_by: "john@emergent.tv",
    created_at: "2025-10-24T16:45:00Z",
    tags: ["weather", "graphics", "broadcast", "overlay"],
    checksum: "c5f7d4e1a2b6f9c8d7e1f2a3b4c5d6e7",
    usage_count: 8,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "4",
    name: "election_map_render.png",
    description: "3D election results map visualization",
    file_url: "https://images.unsplash.com/photo-1604768530617-3364c3b0c3d9?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1604768530617-3364c3b0c3d9?w=400",
    file_type: "image",
    file_size: 4567890,
    dimensions: { width: 4096, height: 2304 },
    source: "ai-generated",
    ai_model_used: "Adobe Firefly",
    generation_prompt: "3D USA election map with data visualization",
    created_by: "auto:Pulsar",
    created_at: "2025-10-23T09:15:00Z",
    tags: ["election", "map", "3D", "visualization", "politics"],
    checksum: "d6a8e5f2b3c7a9d8e1f2a3b4c5d6e7f8",
    usage_count: 12,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "5",
    name: "stock_market_bg.jpg",
    description: "Dynamic stock market background animation",
    file_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
    file_type: "image",
    file_size: 2987654,
    dimensions: { width: 3840, height: 2160 },
    source: "user-uploaded",
    created_by: "sarah@emergent.tv",
    created_at: "2025-10-22T13:30:00Z",
    tags: ["finance", "stocks", "background", "market"],
    checksum: "e7b9f6a3c4d8b1e2f3a4b5c6d7e8f9a1",
    usage_count: 3,
    sync_status: "pending",
    last_synced: undefined
  },
  {
    id: "6",
    name: "news_studio_render.png",
    description: "Virtual news studio environment",
    file_url: "https://images.unsplash.com/photo-1522152302542-71a8e5172aa1?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1522152302542-71a8e5172aa1?w=400",
    file_type: "image",
    file_size: 5678901,
    dimensions: { width: 4096, height: 2304 },
    source: "ai-generated",
    ai_model_used: "Midjourney v6",
    generation_prompt: "Modern virtual news studio, LED walls, professional",
    created_by: "auto:Pulsar",
    created_at: "2025-10-21T10:00:00Z",
    tags: ["news", "studio", "virtual", "broadcast"],
    checksum: "f8c1a7d4b5e9c2f3a4b5c6d7e8f9a1b2",
    usage_count: 6,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "7",
    name: "sports_action_pack.jpg",
    description: "Dynamic sports action compilation",
    file_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
    file_type: "image",
    file_size: 3456789,
    dimensions: { width: 2560, height: 1440 },
    source: "ai-generated",
    ai_model_used: "SDXL Turbo v1.1",
    generation_prompt: "Sports action montage, motion blur, energy",
    created_by: "auto:Pulsar",
    created_at: "2025-10-20T15:20:00Z",
    tags: ["sports", "action", "dynamic", "energy"],
    checksum: "a1b2c3d4e5f6a7b8c9d1e2f3a4b5c6d7",
    usage_count: 5,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  },
  {
    id: "8",
    name: "data_visualization_set.png",
    description: "Infographic templates for data journalism",
    file_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    thumbnail_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
    file_type: "image",
    file_size: 2234567,
    dimensions: { width: 3840, height: 2160 },
    source: "user-uploaded",
    created_by: "mike@emergent.tv",
    created_at: "2025-10-19T12:45:00Z",
    tags: ["data", "visualization", "infographic", "journalism"],
    checksum: "b2c3d4e5f6a7b8c9d1e2f3a4b5c6d7e8",
    usage_count: 7,
    sync_status: "synced",
    last_synced: "2025-10-27T08:00:00Z"
  }
];

export const mockSystemDistributions: Record<string, SystemDistribution[]> = {
  "1": [
    {
      system_name: "Unreal Stage A",
      path: "D:\\Media\\Stadiums",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    },
    {
      system_name: "Pixara Node 3",
      path: "/mnt/render/cache",
      status: "pending"
    }
  ],
  "2": [
    {
      system_name: "Sports Production A",
      path: "/mnt/sports/portraits",
      status: "synced",
      last_sync: "2025-10-27T07:30:00Z"
    },
    {
      system_name: "Archive Server",
      path: "\\\\nas01\\media\\athletes",
      status: "synced",
      last_sync: "2025-10-27T06:15:00Z"
    }
  ],
  "3": [
    {
      system_name: "Weather Graphics System",
      path: "E:\\Broadcast\\Weather",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    }
  ],
  "4": [
    {
      system_name: "Election Graphics Node",
      path: "/var/media/elections",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    },
    {
      system_name: "Backup Storage",
      path: "Z:\\Archives\\Elections",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    }
  ],
  "5": [
    {
      system_name: "Finance Graphics Workstation",
      path: "C:\\MediaAssets\\Finance",
      status: "pending",
      last_sync: "2025-10-26T22:00:00Z"
    }
  ],
  "6": [
    {
      system_name: "News Studio System 1",
      path: "/opt/broadcast/news/assets",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    },
    {
      system_name: "News Studio System 2",
      path: "/opt/broadcast/news/assets",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    },
    {
      system_name: "Backup NAS",
      path: "\\\\backup01\\news_renders",
      status: "error"
    }
  ],
  "7": [
    {
      system_name: "Sports Graphics Node",
      path: "D:\\Sports\\ActionPacks",
      status: "synced",
      last_sync: "2025-10-27T07:45:00Z"
    },
    {
      system_name: "Render Farm Node 5",
      path: "/render/output/sports",
      status: "synced",
      last_sync: "2025-10-27T07:50:00Z"
    }
  ],
  "8": [
    {
      system_name: "Data Journalism Workstation",
      path: "E:\\Infographics\\DataViz",
      status: "synced",
      last_sync: "2025-10-27T08:00:00Z"
    },
    {
      system_name: "Editorial System",
      path: "/home/media/visualizations",
      status: "synced",
      last_sync: "2025-10-27T05:30:00Z"
    },
    {
      system_name: "Cloud Storage Sync",
      path: "s3://media-bucket/data-viz",
      status: "pending"
    }
  ]
};

export const mockAIModels = [
  "SDXL Turbo v1.1",
  "Midjourney v6",
  "DALL·E 3",
  "Adobe Firefly",
  "Stable Diffusion",
];

export const mockCreators = [
  "auto:Pulsar",
  "john@emergent.tv",
  "sarah@emergent.tv",
  "mike@emergent.tv"
];
