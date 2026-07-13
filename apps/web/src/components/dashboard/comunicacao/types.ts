export type CommunicationChannelType =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "email"
  | "sms"
  | "internal";

export type CommunicationStatus = "open" | "pending" | "resolved" | "closed";

export interface CommunicationTag {
  id: string;
  tenantId: string;
  name: string;
  color: string | null;
}

export interface CommunicationConversationListItem {
  id: string;
  tenantId: string;
  channelType: string;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  subject: string | null;
  assignedToName: string | null;
  isFavorite: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  customer?: { id: string; name: string; phone: string | null; email: string | null } | null;
  venuePipelineLead?: {
    id: string;
    contactName: string;
    companyName: string | null;
    stage: string;
  } | null;
  tags?: Array<{ tag: CommunicationTag }>;
  tenant?: { id: string; name: string; slug: string };
  channelAccount?: {
    id: string;
    label: string;
    channelType: string;
    displayAddress: string | null;
  } | null;
}

export interface CommunicationMessage {
  id: string;
  conversationId: string;
  direction: string;
  messageType: string;
  body: string | null;
  mediaUrl: string | null;
  deliveryStatus: string | null;
  sentByName: string | null;
  createdAt: string;
}

export interface CommunicationNote {
  id: string;
  body: string;
  createdByName: string | null;
  createdAt: string;
}

export interface CommunicationActivity {
  id: string;
  type: string;
  summary: string;
  actorName: string | null;
  createdAt: string;
}

export interface CommunicationConversationDetail extends CommunicationConversationListItem {
  messages: CommunicationMessage[];
  notes: CommunicationNote[];
  activities: CommunicationActivity[];
}

export interface CommunicationStats {
  open: number;
  pending: number;
  unread: number;
  favorites: number;
}

export interface CommunicationChannelAccount {
  id: string;
  tenantId: string;
  channelType: string;
  label: string;
  externalId: string | null;
  displayAddress: string | null;
  isActive: boolean;
}

export interface CommunicationTemplate {
  id: string;
  tenantId: string;
  channelType: string;
  name: string;
  body: string;
  externalName: string | null;
  isActive: boolean;
}

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  email: "E-mail",
  sms: "SMS",
  internal: "Interno",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  closed: "Fechada",
};
