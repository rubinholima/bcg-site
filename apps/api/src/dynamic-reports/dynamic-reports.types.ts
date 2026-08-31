export type DynamicReportPersonType = 'player' | 'employee';

export type DynamicReportGroupType = 'category' | 'department' | 'section';

export type DynamicReportFieldType = 'data' | 'calculated' | 'displayOnly';

export type DynamicReportSensitivity = 'public' | 'document' | 'bank' | 'rh';

export type DynamicReportFieldDefinition = {
  key: string;
  label: string;
  source: 'player' | 'employee' | 'computed' | 'display';
  group: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sensitivity: DynamicReportSensitivity;
  /** Módulos exigidos — vazio = acesso via página do relatório */
  requiredModules: string[];
  sortable: boolean;
  filterable: boolean;
  exportable: boolean;
  fieldType: DynamicReportFieldType;
  /** Populações que expõem o campo; vazio = todas aplicáveis à fonte */
  populations: string[];
};

export type DynamicReportPopulationDefinition = {
  key: string;
  label: string;
  source: 'player' | 'employee' | 'people';
  description?: string;
  filterKeys: string[];
};

export type DynamicReportPresetDefinition = {
  id: string;
  label: string;
  population: string;
  defaultFields: string[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  groupBy?: 'category' | 'department' | 'cafeteria' | 'none';
  lockedFields?: boolean;
};

export type DynamicReportRow = {
  personType: DynamicReportPersonType;
  personId: string;
  playerId?: string | null;
  employeeId?: string | null;
  groupType: DynamicReportGroupType;
  groupName: string;
  sectionTitle?: string | null;
  values: Record<string, string | number | null>;
};

export type DynamicReportGroup = {
  groupName: string;
  rows: DynamicReportRow[];
};

export type DynamicReportSection = {
  sectionTitle: string;
  groups: DynamicReportGroup[];
};

export type DynamicReportRunResult = {
  presetId?: string | null;
  population: string;
  tenantId: string;
  columns: Array<{ key: string; label: string }>;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  groupBy: string;
  sections: DynamicReportSection[];
  /** Campos solicitados mas removidos por ACL */
  strippedFields?: string[];
  filtersSummary: string;
};

export type DynamicReportMetaResult = {
  populations: DynamicReportPopulationDefinition[];
  presets: DynamicReportPresetDefinition[];
  fields: DynamicReportFieldDefinition[];
  sortOptions: Array<{ key: string; label: string; populations: string[] }>;
  groupOptions: Array<{ key: string; label: string; populations: string[] }>;
};

export type DynamicReportRunFilters = {
  category?: string;
  situation?: string;
  position?: string;
  departmentId?: string;
  employeeType?: string;
  season?: number;
  competition?: string;
  search?: string;
  /** Data de referência para salário/benefícios (YYYY-MM-DD) */
  referenceDate?: string;
};

export type DynamicReportRunInput = {
  tenantId: string;
  presetId?: string;
  population?: string;
  filters?: DynamicReportRunFilters;
  fields?: string[];
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  groupBy?: 'category' | 'department' | 'cafeteria' | 'none';
};
