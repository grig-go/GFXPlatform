import { isSupabaseConfigured, directRestSelect, directRestInsert, directRestDelete } from '@emergent-platform/supabase-client';
import type { AIChanges } from '@emergent-platform/types';
import { useAuthStore } from '@/stores/authStore';

export interface StoredChatMessage {
  id: string;
  project_id: string;
  user_id: string | null;
  context_template_id: string | null;
  context_element_ids: string[] | null;
  role: 'user' | 'assistant';
  content: string;
  attachments: ChatAttachment[] | null;
  changes_applied: AIChanges | null;
  error: boolean;
  created_at: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'screenshot';
  name: string;
  data: string;
  preview?: string;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Timeout for REST operations (ms)
const REST_TIMEOUT = 8000;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// Load chat history for a project using direct REST
export async function loadChatHistory(projectId: string): Promise<StoredChatMessage[]> {
  // Skip if Supabase is not configured
  if (!isSupabaseConfigured()) {
    console.log('Skipping chat history load - Supabase not configured');
    return [];
  }

  // Skip if project ID is not a valid UUID (local/demo project)
  if (!isValidUUID(projectId)) {
    console.log('Skipping chat history load - project ID is not a UUID:', projectId);
    return [];
  }

  // Use direct REST API for reliable loading with timeout
  const result = await directRestSelect<StoredChatMessage>(
    'gfx_chat_messages',
    '*',
    { column: 'project_id', value: projectId },
    REST_TIMEOUT
  );

  if (result.error) {
    console.error('Error loading chat history:', result.error);
    return [];
  }

  // Sort by created_at ascending
  const messages = result.data || [];
  return messages.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// Save a new chat message using direct REST
export async function saveChatMessage(
  projectId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
    attachments?: ChatAttachment[];
    changes_applied?: AIChanges | null;
    error?: boolean;
    context_template_id?: string | null;
    context_element_ids?: string[] | null;
  },
  accessToken?: string
): Promise<StoredChatMessage | null> {
  // Return mock if Supabase is not configured or project is local
  if (!isSupabaseConfigured() || !isValidUUID(projectId)) {
    console.log('Skipping chat message save - Supabase not configured or local project');
    // Return a mock saved message for local state
    return {
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: null,
      context_template_id: message.context_template_id || null,
      context_element_ids: message.context_element_ids || null,
      role: message.role,
      content: message.content,
      attachments: message.attachments || null,
      changes_applied: message.changes_applied || null,
      error: message.error || false,
      created_at: new Date().toISOString(),
    };
  }

  // Get current user ID from authStore (this is the u_users.id, not auth.users.id)
  // The foreign key on gfx_chat_messages references u_users(id), not auth.users
  const userId = useAuthStore.getState().user?.id || null;

  // Strip large base64 data from attachments before saving to database
  // We only store metadata (id, type, name) to avoid payload size limits
  const sanitizedAttachments = message.attachments?.map(att => ({
    id: att.id,
    type: att.type,
    name: att.name,
    // Don't store full base64 data in DB - just store a flag that data existed
    data: att.data ? '[IMAGE_DATA_STRIPPED]' : '',
    preview: undefined, // Don't store preview either
  })) || [];

  // Use direct REST API for reliable insert with timeout
  // Pass access token for authenticated RLS policies
  const result = await directRestInsert<StoredChatMessage>(
    'gfx_chat_messages',
    {
      project_id: projectId,
      user_id: userId,
      role: message.role,
      content: message.content,
      attachments: sanitizedAttachments,
      changes_applied: message.changes_applied || null,
      error: message.error || false,
      context_template_id: message.context_template_id || null,
      context_element_ids: message.context_element_ids || null,
    },
    REST_TIMEOUT,
    accessToken
  );

  if (result.error || !result.data?.[0]) {
    console.error('Error saving chat message:', result.error);
    // Return a mock message so the UI doesn't break
    return {
      id: crypto.randomUUID(),
      project_id: projectId,
      user_id: userId,
      context_template_id: message.context_template_id || null,
      context_element_ids: message.context_element_ids || null,
      role: message.role,
      content: message.content,
      attachments: message.attachments || null,
      changes_applied: message.changes_applied || null,
      error: message.error || false,
      created_at: new Date().toISOString(),
    };
  }

  return result.data[0];
}

// Delete a chat message using direct REST API
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  // Skip if Supabase not configured or message ID is not a valid UUID
  if (!isSupabaseConfigured() || !isValidUUID(messageId)) {
    return true;
  }

  const result = await directRestDelete(
    'gfx_chat_messages',
    { column: 'id', value: messageId },
    REST_TIMEOUT
  );

  if (!result.success) {
    console.error('Error deleting chat message:', result.error);
    return false;
  }

  return true;
}

// Clear all chat history for a project using direct REST API
export async function clearChatHistory(projectId: string): Promise<boolean> {
  // Skip if Supabase not configured or project ID is not a valid UUID
  if (!isSupabaseConfigured() || !isValidUUID(projectId)) {
    return true;
  }

  const result = await directRestDelete(
    'gfx_chat_messages',
    { column: 'project_id', value: projectId },
    REST_TIMEOUT
  );

  if (!result.success) {
    console.error('Error clearing chat history:', result.error);
    return false;
  }

  return true;
}
