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

export const PERMISSIONS_LABELS: Record<string, string> = {
    'products:view': 'Voir les produits',
    'products:create': 'Créer des produits',
    'products:edit': 'Modifier les produits',
    'products:delete': 'Supprimer les produits',
    'products:stock_manage': 'Gérer le stock',
    'products:cost_view': 'Voir prix d\'achat',

    'categories:view': 'Voir les catégories',
    'categories:create': 'Créer des catégories',
    'categories:edit': 'Modifier les catégories',
    'categories:delete': 'Supprimer les catégories',
    'categories:manage': 'Gestion totale catégories',

    'orders:view': 'Voir les commandes',
    'orders:create': 'Créer des commandes',
    'orders:edit': 'Modifier les commandes',
    'orders:delete': 'Supprimer les commandes',
    'orders:confirm': 'Confirmer les commandes',
    'orders:ship': 'Expédier les commandes',
    'orders:deliver': 'Marquer comme livré',
    'orders:cancel': 'Annuler les commandes',
    'orders:return': 'Traiter les retours',
    'orders:pdf': 'Générer facture PDF',
    'orders:email': 'Envoyer facture email',
    'orders:manage': 'Gestion totale commandes',

    'customers:view': 'Voir les clients',
    'customers:create': 'Créer des clients',
    'customers:edit': 'Modifier les clients',
    'customers:delete': 'Supprimer les clients',
    'customers:manage': 'Gestion totale clients',

    'wholesalers:view': 'Voir les grossistes',
    'wholesalers:create': 'Créer des grossistes',
    'wholesalers:edit': 'Modifier les grossistes',
    'wholesalers:delete': 'Supprimer les grossistes',
    'wholesalers:payments': 'Gérer les paiements',

    'analytics:view': 'Voir les statistiques',

    'settings:view': 'Voir les paramètres',
    'settings:manage': 'Modifier les paramètres',

    'users:view': 'Voir les utilisateurs',
    'users:manage': 'Gérer les utilisateurs',

    'roles:view': 'Voir les rôles',
    'roles:manage': 'Gérer les rôles',

    'messages:view': 'Voir les messages',
    'messages:manage': 'Gérer les messages',

    'logistics:view': 'Voir logistique',
    'logistics:manage': 'Gérer logistique (villes/fournisseurs)',
};

export const CATEGORY_LABELS: Record<string, string> = {
    PRODUCTS: "PRODUITS",
    CATEGORIES: "CATÉGORIES",
    ORDERS: "COMMANDES",
    CUSTOMERS: "CLIENTS",
    WHOLESALERS: "GROSSISTES",
    ANALYTICS: "STATISTIQUES",
    SETTINGS: "PARAMÈTRES",
    USERS: "UTILISATEURS",
    ROLES: "RÔLES",
    MESSAGES: "MESSAGES",
    LOGISTICS: "LOGISTIQUE",
};
