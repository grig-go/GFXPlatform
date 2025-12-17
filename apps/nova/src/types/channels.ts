export type ChannelType = 'Pixera' | 'Vizrt' | 'Unreal' | 'Web';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string | null;
  status?: string;
  config?: any;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}