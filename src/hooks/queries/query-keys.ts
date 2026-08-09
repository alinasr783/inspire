export const queryKeys = {
  units: {
    all: ["units"] as const,
    list: () => [...queryKeys.units.all, "list"] as const,
    filters: (filters: Record<string, string>) => [...queryKeys.units.all, "list", filters] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: () => [...queryKeys.clients.all, "list"] as const,
    filters: (filters: Record<string, string>) => [...queryKeys.clients.all, "list", filters] as const,
  },
  deals: {
    all: ["deals"] as const,
    list: () => [...queryKeys.deals.all, "list"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: () => [...queryKeys.tasks.all, "list"] as const,
    byEmployee: (employeeId: string) => [...queryKeys.tasks.all, "employee", employeeId] as const,
  },
  devices: {
    all: ["devices"] as const,
    list: () => [...queryKeys.devices.all, "list"] as const,
  },
  reports: {
    all: ["reports"] as const,
    monthly: (months: number) => [...queryKeys.reports.all, "monthly", months] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    me: () => [...queryKeys.profiles.all, "me"] as const,
    employees: () => [...queryKeys.profiles.all, "employees"] as const,
  },
  employees: {
    all: ["employees"] as const,
    list: () => [...queryKeys.employees.all, "list"] as const,
  },
  gallery: {
    all: ["gallery"] as const,
    byUnit: (unitId: string) => [...queryKeys.gallery.all, "unit", unitId] as const,
  },
  ads: {
    all: ["ads"] as const,
    byEmployee: (employeeId: string) => [...queryKeys.ads.all, "employee", employeeId] as const,
  },
  finances: {
    all: ["finances"] as const,
    list: (timeFilter?: string) => [...queryKeys.finances.all, "list", timeFilter ?? "all"] as const,
  },
  contracts: {
    all: ["contracts"] as const,
    templates: () => [...queryKeys.contracts.all, "templates"] as const,
    template: (id: string) => [...queryKeys.contracts.all, "template", id] as const,
    instances: () => [...queryKeys.contracts.all, "instances"] as const,
    instance: (id: string) => [...queryKeys.contracts.all, "instance", id] as const,
  },
  pendingCount: ["pendingCount"] as const,
};
