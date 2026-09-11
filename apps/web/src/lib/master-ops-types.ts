export type PresenceStatus = "online" | "idle";

export interface LiveUserItem {
  id: string;
  sessionKey: string;
  status: PresenceStatus;
  user: {
    id: string;
    name: string | null;
    username: string;
    email: string;
    role: string | null;
  };
  tenant: { id: string | null; name: string; slug: string | null } | null;
  currentPath: string | null;
  currentModule: string | null;
  currentPageTitle: string | null;
  browserLabel: string | null;
  deviceLabel: string | null;
  startedAt: string;
  lastSeenAt: string;
  lastActivityAt: string;
  connectedDuration: string;
  connectedDurationMs: number;
  /** Outras sessões/dispositivos ativos do mesmo usuário (somente detalhe). */
  otherSessions?: LiveUserItem[];
}

export interface LiveUsersResponse {
  total: number;
  online: number;
  idle: number;
  items: LiveUserItem[];
  asOf: string;
}

export interface PlatformInsightRow {
  name: string;
  count: number;
}

export interface PlatformInsightsResponse {
  live: { online: number; idle: number; total: number };
  activeTodayUsers: number;
  totalUsers: number;
  activeTenantCount: number;
  hourlyActivity: Array<{ hour: string; users: number }>;
  byCompany: PlatformInsightRow[];
  byModule: PlatformInsightRow[];
  byRoleLive: PlatformInsightRow[];
  asOf: string;
}

export type AnnouncementType = "info" | "warning" | "success" | "danger";

export interface MasterAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetMode: "all" | "user";
  targetUser: { id: string; name: string | null; username: string } | null;
  dismissible: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; username: string };
  receiptsCount: number;
  active: boolean;
}

export interface UserAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  dismissible: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  deliveredAt: string;
  readAt: string | null;
}
