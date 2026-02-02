export const PERMISSIONS = {
    // Products
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_CREATE: 'products:create',
    PRODUCTS_EDIT: 'products:edit',
    PRODUCTS_DELETE: 'products:delete',

    // Orders
    ORDERS_VIEW: 'orders:view',
    ORDERS_MANAGE: 'orders:manage',

    // Customers
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_MANAGE: 'customers:manage',

    // Analytics
    ANALYTICS_VIEW: 'analytics:view',

    // Settings
    SETTINGS_VIEW: 'settings:view',
    SETTINGS_MANAGE: 'settings:manage',

    // Users
    USERS_VIEW: 'users:view',
    USERS_MANAGE: 'users:manage',

    // Roles
    ROLES_VIEW: 'roles:view',
    ROLES_MANAGE: 'roles:manage',

    // Messages/Contact
    MESSAGES_VIEW: 'messages:view',
    MESSAGES_MANAGE: 'messages:manage',

    // Logistics (Cities, Suppliers, Wholesalers)
    LOGISTICS_VIEW: 'logistics:view',
    LOGISTICS_MANAGE: 'logistics:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
