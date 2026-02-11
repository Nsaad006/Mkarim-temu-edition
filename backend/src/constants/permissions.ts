export const PERMISSIONS = {
    // Products
    PRODUCTS_VIEW: 'products:view',
    PRODUCTS_CREATE: 'products:create',
    PRODUCTS_EDIT: 'products:edit',
    PRODUCTS_DELETE: 'products:delete',
    PRODUCTS_STOCK_MANAGE: 'products:stock_manage',
    PRODUCTS_COST_VIEW: 'products:cost_view',

    // Categories
    CATEGORIES_VIEW: 'categories:view',
    CATEGORIES_CREATE: 'categories:create',
    CATEGORIES_EDIT: 'categories:edit',
    CATEGORIES_DELETE: 'categories:delete',
    CATEGORIES_MANAGE: 'categories:manage',

    // Orders
    ORDERS_VIEW: 'orders:view',
    ORDERS_CREATE: 'orders:create',
    ORDERS_EDIT: 'orders:edit',
    ORDERS_DELETE: 'orders:delete',
    ORDERS_CONFIRM: 'orders:confirm',
    ORDERS_SHIP: 'orders:ship',
    ORDERS_DELIVER: 'orders:deliver',
    ORDERS_CANCEL: 'orders:cancel',
    ORDERS_RETURN: 'orders:return',
    ORDERS_PDF: 'orders:pdf',
    ORDERS_EMAIL: 'orders:email',
    ORDERS_MANAGE: 'orders:manage',

    // Customers
    CUSTOMERS_VIEW: 'customers:view',
    CUSTOMERS_CREATE: 'customers:create',
    CUSTOMERS_EDIT: 'customers:edit',
    CUSTOMERS_DELETE: 'customers:delete',
    CUSTOMERS_MANAGE: 'customers:manage',

    // Wholesalers
    WHOLESALERS_VIEW: 'wholesalers:view',
    WHOLESALERS_CREATE: 'wholesalers:create',
    WHOLESALERS_EDIT: 'wholesalers:edit',
    WHOLESALERS_DELETE: 'wholesalers:delete',
    WHOLESALERS_PAYMENTS: 'wholesalers:payments',

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

    // Logistics (Cities, Suppliers)
    LOGISTICS_VIEW: 'logistics:view',
    LOGISTICS_MANAGE: 'logistics:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
