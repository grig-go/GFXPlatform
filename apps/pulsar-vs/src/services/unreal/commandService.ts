// services/unreal/commandService.ts
import { supabase } from '../../lib/supabase';

interface CommandOptions {
  projectId?: string;
  metadata?: Record<string, any>;
}

export const sendCommandToUnreal = async (
  channelId: string, 
  messageObject: any,
  options: CommandOptions = {}
) => {
  console.log(`[v2] Sending command to channel ${channelId} via pulsar_commands table:`, messageObject);
  
  try {
    console.log('📤 Inserting command to database...');
    
    const insertData: Record<string, any> = {
      channel: channelId,
      payload: messageObject,
      created_at: new Date().toISOString()
    };

    if (options.projectId) {
      insertData.project_id = options.projectId;
      console.log(`📁 Command associated with project: ${options.projectId}`);
    }

    if (options.metadata) {
      insertData.metadata = options.metadata;
    }

    const { error } = await supabase
      .from('pulsar_commands')
      .insert(insertData);

    if (error) {
      console.error('Failed to insert command:', error);
      return { success: false, error };
    }

    console.log('✅ Command inserted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error sending command to Unreal:', error);
    return { success: false, error };
  }
};

export const fetchActiveChannels = async () => {
  return Promise.resolve([]);
};

export const getProjectCommandHistory = async (projectId: string, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('pulsar_commands')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch command history:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching command history:', error);
    return { success: false, error };
  }
};