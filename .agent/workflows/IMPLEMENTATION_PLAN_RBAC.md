# Role-Based Access Control (RBAC) Implementation Plan

## Overview
This plan outlines the implementation of a dynamic role-based access control system. Administrators will be able to create custom roles, define granular permissions (page access, specific actions), and assign these roles to users.

## 1. Database Schema Updates
We will introduce a `Role` model to store role definitions and permissions.

### New Models
```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  // Permissions stored as JSON or string array
  // Format: "resource:action" (e.g., "products:create", "orders:read")
  permissions String[] 
  admins      Admin[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Updated Admin Model
```prisma
model Admin {
  // ... existing fields
  roleId    String?
  roleRel   Role?    @relation(fields: [roleId], references: [id])
  // We keep 'role' string temporarily or migrate it
}
```

## 2. Backend Implementation

### Permission Constants
Define a standard list of resources and actions in code to be used for validation and UI generation.
Example:
```typescript
export const PERMISSIONS = {
  PRODUCTS: {
    VIEW: 'products:view',
    CREATE: 'products:create',
    EDIT: 'products:edit',
    DELETE: 'products:delete',
  },
  ORDERS: { ... },
  USERS: { ... },
  SETTINGS: { ... },
  // ... etc
};
```

### API Endpoints
1.  **GET /api/roles**: List all roles.
2.  **GET /api/roles/:id**: Get details of a specific role.
3.  **POST /api/roles**: Create a new role with permissions.
4.  **PUT /api/roles/:id**: Update a role (name, permissions).
5.  **DELETE /api/roles/:id**: Delete a role (prevent if assigned to users).
6.  **GET /api/permissions**: Get list of all available permissions (for UI).

### Middleware Update
Update `authorize` middleware to:
1.  Fetch the user's role from the database (via `roleId`).
2.  Check if the role has the required permission.
3.  Support checking "ANY" permission strings vs simple role names.
   `authorizePermission('products:create')`

### Seeding
Update `seed.ts` to:
1.  Create default permissions list.
2.  Create 'Super Admin' role with ALL permissions.
3.  Create 'Editor' role with limited permissions.
4.  Assign existing users to appropriate roles.

## 3. Frontend Implementation

### State Management
- **AuthContext / UserContext**: Need to store the user's `permissions` list alongside their profile after login.
- **usePermission Hook**: A custom hook to check if the current user has a specific permission.
  ```typescript
  const { can } = usePermission();
  if (can('products:create')) { ... }
  ```

### Components
- **RequirePermission Component**: distinct wrapper for parts of UI.
  ```tsx
  <RequirePermission permission="products:create">
    <Button>Add Product</Button>
  </RequirePermission>
  ```
- **RoleManagement Page (`/admin/roles`)**:
  - List of Roles.
  - "Create/Edit Role" Dialog:
    - Name input.
    - Permission Matrix (Checkboxes grouped by Resource).

### Integration
- **Sidebar**: Hide links based on `can('resource:view')`.
- **User Management**: Update "Add/Edit User" form to select from dynamic roles (`Select` dropdown fetching from `/api/roles`).
- **Protected Routes**: Wrap routes with permission checks in `App.tsx`.

## 4. Execution Steps
1.  **Schema**: Modify `schema.prisma` and run migration.
2.  **Backend**: Implement `Role` routes and update `authorize` logic.
3.  **Seed**: Populate initial roles.
4.  **Frontend API**: Create `rolesApi`.
5.  **Frontend UI**: Create Role Management page.
6.  **Frontend Logic**: Implement `usePermission` and integrate into Sidebar/Routes.
7.  **User Assign**: Update User Management to use new roles.

