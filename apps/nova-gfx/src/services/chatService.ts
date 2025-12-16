import { supabase, isSupabaseConfigured } from '@emergent-platform/supabase-client';
import type { AIChanges } from '@emergent-platform/types';

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

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// Load chat history for a project
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

  const { data, error } = await supabase
    .from('gfx_chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading chat history:', error);
    return [];
  }

  return data || [];
}

// Save a new chat message
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
  }
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

  // Get current user for user_id
  const { data: { user } } = await supabase.auth.getUser();

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

  const { data, error } = await supabase
    .from('gfx_chat_messages')
    .insert({
      project_id: projectId,
      user_id: user?.id || null,
      role: message.role,
      content: message.content,
      attachments: sanitizedAttachments,
      changes_applied: message.changes_applied || null,
      error: message.error || false,
      context_template_id: message.context_template_id || null,
      context_element_ids: message.context_element_ids || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving chat message:', error);
    return null;
  }

  return data;
}

// Delete a chat message
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  // Skip if Supabase not configured or message ID is not a valid UUID
  if (!isSupabaseConfigured() || !isValidUUID(messageId)) {
    return true;
  }

  const { error } = await supabase
    .from('gfx_chat_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting chat message:', error);
    return false;
  }

  return true;
}

// Clear all chat history for a project
export async function clearChatHistory(projectId: string): Promise<boolean> {
  // Skip if Supabase not configured or project ID is not a valid UUID
  if (!isSupabaseConfigured() || !isValidUUID(projectId)) {
    return true;
  }

  const { error } = await supabase
    .from('gfx_chat_messages')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }

  return true;
}

