
export interface Avatar {
  id: string;
  name: string;
  description: string;
  primeDirective: string;
  imageDataUri: string;
  temperature: number;
  webAccess?: boolean;
}

export interface Attachment {
  name: string;
  dataUri: string;
  mimeType: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  attachment?: Attachment | null;
  sources?: Array<{ title: string; uri: string; }>;
}

export type ChatHistories = Record<string, ChatMessage[]>;