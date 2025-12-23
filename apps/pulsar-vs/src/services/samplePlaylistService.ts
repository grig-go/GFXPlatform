// Sample Playlist Service - Creates demo playlist with scheduled media events
import { supabase } from '../lib/supabase';
import * as playlistService from './supabase/playlistService';
import type { ScheduleConfig, DayOfWeek } from '../types/playlist';

// Sample media items with public domain / placeholder images
const SAMPLE_MEDIA = [
  {
    name: 'Morning Promo',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200',
  },
  {
    name: 'Weather Update Background',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=200',
  },
  {
    name: 'Sports Highlight Banner',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200',
  },
  {
    name: 'News Ticker Background',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=200',
  },
  {
    name: 'Evening Show Intro',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
  },
  {
    name: 'Weekend Special',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
  },
  {
    name: 'Breaking News Alert',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200',
  },
  {
    name: 'Tech Segment Graphic',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
  },
  {
    name: 'Business Hour Banner',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200',
  },
  {
    name: 'Night Program Bumper',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=200',
  },
  {
    name: 'Weekend Weather',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=200',
  },
  {
    name: 'Holiday Special',
    media_type: 'image',
    url: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=200',
  },
];

// Sample schedule configurations
const SAMPLE_SCHEDULES: { name: string; config: ScheduleConfig }[] = [
  {
    name: 'Morning Promo',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[],
      timeWindows: [{ start: '06:00', end: '09:00' }],
      priority: 1,
    },
  },
  {
    name: 'Weather Update Background',
    config: {
      enabled: true,
      ruleType: 'daily',
      timeWindows: [
        { start: '07:00', end: '07:30' },
        { start: '12:00', end: '12:30' },
        { start: '18:00', end: '18:30' },
      ],
      priority: 2,
    },
  },
  {
    name: 'Sports Highlight Banner',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['saturday', 'sunday'] as DayOfWeek[],
      timeWindows: [{ start: '14:00', end: '17:00' }],
      priority: 1,
    },
  },
  {
    name: 'News Ticker Background',
    config: {
      enabled: true,
      ruleType: 'daily',
      timeWindows: [
        { start: '08:00', end: '10:00' },
        { start: '17:00', end: '19:00' },
      ],
      priority: 3,
    },
  },
  {
    name: 'Evening Show Intro',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[],
      timeWindows: [{ start: '20:00', end: '20:30' }],
      priority: 2,
    },
  },
  {
    name: 'Weekend Special',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['saturday', 'sunday'] as DayOfWeek[],
      timeWindows: [{ start: '10:00', end: '12:00' }],
      priority: 1,
    },
  },
  {
    name: 'Breaking News Alert',
    config: {
      enabled: true,
      ruleType: 'daily',
      timeWindows: [{ start: '00:00', end: '23:59' }],
      priority: 10, // Highest priority
    },
  },
  {
    name: 'Tech Segment Graphic',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['tuesday', 'thursday'] as DayOfWeek[],
      timeWindows: [{ start: '15:00', end: '16:00' }],
      priority: 1,
    },
  },
  {
    name: 'Business Hour Banner',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayOfWeek[],
      timeWindows: [{ start: '09:00', end: '11:00' }, { start: '14:00', end: '16:00' }],
      priority: 1,
    },
  },
  {
    name: 'Night Program Bumper',
    config: {
      enabled: true,
      ruleType: 'daily',
      timeWindows: [{ start: '22:00', end: '23:30' }],
      priority: 1,
    },
  },
  {
    name: 'Weekend Weather',
    config: {
      enabled: true,
      ruleType: 'weekly',
      daysOfWeek: ['saturday', 'sunday'] as DayOfWeek[],
      timeWindows: [{ start: '08:00', end: '08:30' }, { start: '19:00', end: '19:30' }],
      priority: 2,
    },
  },
  {
    name: 'Holiday Special',
    config: {
      enabled: true,
      ruleType: 'specific_dates',
      specificDates: getUpcomingHolidays(),
      timeWindows: [{ start: '10:00', end: '22:00' }],
      priority: 5,
    },
  },
];

// Generate some upcoming dates for holidays
function getUpcomingHolidays(): string[] {
  const today = new Date();
  const holidays: string[] = [];

  // Add next few weekends as "special dates" for demo
  for (let i = 0; i < 4; i++) {
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7) + (i * 7));
    holidays.push(nextSaturday.toISOString().split('T')[0]);
  }

  return holidays;
}

export async function createSampleScheduledPlaylist(projectId: string): Promise<{ success: boolean; playlistId?: string; error?: string }> {
  try {
    // 1. Create the playlist using edge function
    const playlistResult = await playlistService.createPlaylist({
      name: 'Demo Schedule Playlist',
      description: 'Sample playlist demonstrating scheduled media events across different time slots and days',
      project_id: projectId,
      loop_enabled: true,
    });

    if (!playlistResult.success) throw new Error(playlistResult.error || 'Failed to create playlist');

    const playlistId = playlistResult.data?.id;
    if (!playlistId) throw new Error('No playlist ID returned');

    // 2. Add playlist items with schedules using edge function
    for (let index = 0; index < SAMPLE_MEDIA.length; index++) {
      const media = SAMPLE_MEDIA[index];
      const schedule = SAMPLE_SCHEDULES.find(s => s.name === media.name)?.config || {
        enabled: false,
        ruleType: 'daily' as const,
      };

      const itemResult = await playlistService.addPlaylistItem({
        playlist_id: playlistId,
        item_type: 'media',
        name: media.name,
        duration: 30 + (index * 5), // Varying durations
        metadata: {
          schedule_config: schedule,
          media_url: media.url,
          media_thumbnail: media.thumbnail,
          media_type: media.media_type,
        },
      });

      if (!itemResult.success) {
        console.error(`Error adding item ${media.name}:`, itemResult.error);
        // Continue adding other items even if one fails
      }
    }

    return { success: true, playlistId };
  } catch (error: any) {
    console.error('Error creating sample playlist:', error);
    return { success: false, error: error.message };
  }
}

// Alternative: Create local sample data without database
export function createLocalSamplePlaylist(): {
  playlist: any;
  items: any[];
} {
  const playlistId = `sample-${Date.now()}`;

  const items = SAMPLE_MEDIA.map((media, index) => {
    const schedule = SAMPLE_SCHEDULES.find(s => s.name === media.name)?.config || {
      enabled: false,
      ruleType: 'daily' as const,
    };

    return {
      id: `item-${index}-${Date.now()}`,
      playlist_id: playlistId,
      item_type: 'media',
      name: media.name,
      media_url: media.url,
      media_thumbnail: media.thumbnail,
      media_type: media.media_type,
      duration: 30 + (index * 5),
      sort_order: index,
      created_at: new Date().toISOString(),
      metadata: {
        schedule_config: schedule,
      },
    };
  });

  return {
    playlist: {
      id: playlistId,
      name: 'Demo Schedule Playlist',
      description: 'Sample playlist demonstrating scheduled media events',
      is_active: true,
      loop_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item_count: items.length,
    },
    items,
  };
}
