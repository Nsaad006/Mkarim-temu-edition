/**
 * Admin activity logger — fire-and-forget POST to /api/logs
 * Tracks dashboard user actions only (not customer interactions).
 * Never throws; silently swallows errors so it can't break the app.
 */
import apiClient from "./api-client";

export type LogAction =
  // Auth
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  // Orders — one specific type per status transition
  | "ORDER_STATUS_CHANGED" // kept for backward compat with existing logs
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_PENDING"
  | "ORDER_EDITED"
  | "ORDER_DELETED"
  | "ORDER_RETURN"
  // Products
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "PRODUCT_BULK_DELETED"
  | "PRODUCT_RESTORED"
  | "PRODUCT_RESTOCKED"
  // Categories
  | "CATEGORY_CREATED"
  | "CATEGORY_UPDATED"
  | "CATEGORY_DELETED"
  // Admin users
  | "ADMIN_USER_CREATED"
  | "ADMIN_USER_DELETED"
  | "ADMIN_USER_STATUS_CHANGED"
  | "ADMIN_USER_ROLE_CHANGED"
  | "ADMIN_USER_PASSWORD_CHANGED"
  // Wholesalers
  | "WHOLESALER_CREATED"
  | "WHOLESALER_UPDATED"
  | "WHOLESALER_DELETED"
  | "WHOLESALE_ORDER_CREATED"
  | "WHOLESALE_ORDER_UPDATED"
  | "WHOLESALE_ORDER_CANCELLED"
  | "WHOLESALE_PAYMENT_ADDED"
  // Suppliers
  | "SUPPLIER_CREATED"
  | "SUPPLIER_UPDATED"
  | "SUPPLIER_DELETED"
  // Procurements
  | "PROCUREMENT_CREATED"
  // Cities
  | "CITY_CREATED"
  | "CITY_UPDATED"
  | "CITY_DELETED"
  // Roles
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  // Settings
  | "SETTINGS_UPDATED";

interface LogPayload {
  action: LogAction;
  metadata?: Record<string, any>;
}

export const logEvent = (payload: LogPayload): void => {
  // Resolve current admin user from localStorage
  const userStr = localStorage.getItem("user");
  let userEmail: string | undefined;
  let userId: string | undefined;

  try {
    if (userStr) {
      const u = JSON.parse(userStr);
      userEmail = u.email;
      userId = u.id;
    }
  } catch {}

  apiClient
    .post("/api/logs", {
      action: payload.action,
      userType: "admin",
      userId,
      userEmail,
      metadata: payload.metadata || {},
    })
    .catch(() => {
      // Silently ignore — logging must never break the app
    });
};
