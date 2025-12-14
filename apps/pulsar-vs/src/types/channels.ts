export type ChannelType = "Pixera" | "Vizrt" | "Unreal" | "Web";

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}
