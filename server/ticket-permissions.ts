// Ticket Access Control and Permissions
// Defines who can view and edit tickets based on department and role

import type { User, Ticket } from "@shared/schema";

/**
 * Role hierarchy levels (higher = more access)
 * Owner > Admin > Head > Manager > Lead > Associate > Agent
 */
const ROLE_LEVEL: Record<string, number> = {
  Owner:     6,
  Admin:     5,
  Head:      4,
  Manager:   3,
  Lead:      2,
  Associate: 1,
  Agent:     0,
};

/**
 * Returns true if the user's role is at or above the given level.
 * Head / Manager / Lead are "elevated" — they get cross-department visibility.
 */
function isElevatedRole(user: User): boolean {
  const level = ROLE_LEVEL[user.role] ?? 0;
  return level >= ROLE_LEVEL["Lead"]; // Lead, Manager, Head, Admin, Owner
}

/**
 * Determine which ticket departments a CX user can access based on subDepartment.
 *
 * - subDepartment = "Seller Support"  → vendor-side tickets only (ownerTeam/department = "CX" + seller-support categories)
 *   In practice, we scope by checking the ticket's ownerTeam / department label.
 *   Seller Support tickets have vendorHandle set and no customer field.
 *   We use a simple heuristic: if ticket has a vendorHandle it is seller-side.
 * - subDepartment = "Customer Support" → customer-side tickets only (tickets with customer field set, no vendorHandle)
 * - subDepartment = null / undefined   → all CX tickets (fallback for unassigned CX agents)
 */
function isCXTicketVisible(user: User, ticket: Ticket): boolean {
  const sub = user.subDepartment;
  if (!sub) return true; // No subDept set → see everything in CX scope

  if (sub === "Seller Support") {
    // Seller-side: ticket was raised for a vendor (has vendorHandle OR dept is not CX-customer)
    return !!(ticket.vendorHandle);
  }
  if (sub === "Customer Support") {
    // Customer-side: ticket was raised for a customer (has customer field set, or no vendorHandle)
    return !!(ticket.customer) || !ticket.vendorHandle;
  }
  return true;
}

/**
 * Check if user can view a specific ticket based on department rules
 *
 * Rules:
 * - Admin/Owner: Can view ALL tickets
 * - Head/Manager/Lead: Can view ALL tickets across all departments
 * - CX + Seller Support subDept: vendor tickets only (has vendorHandle)
 * - CX + Customer Support subDept: customer tickets only (has customer / no vendorHandle)
 * - CX + no subDept: all tickets
 * - Non-CX (Associate/Agent): only tickets in their own department + assigned to them
 */
export function canViewTicket(user: User, ticket: Ticket): boolean {
  if (user.role === "Admin" || user.role === "Owner") return true;

  // Head / Manager / Lead can see all tickets across all departments
  if (isElevatedRole(user)) return true;

  // Users can always see tickets assigned to them, regardless of department
  if (ticket.assigneeId === user.id) return true;

  if (user.department === "CX") {
    return isCXTicketVisible(user, ticket);
  }

  // Match ticket department against user's department OR sub-department
  // e.g. user dept=Supply, subDept=Marketplace can see dept=Supply AND dept=Marketplace tickets
  return ticket.department === user.department ||
    (!!user.subDepartment && ticket.department === user.subDepartment);
}

/**
 * Filter tickets based on user's department access
 */
export function filterTicketsByDepartmentAccess(tickets: Ticket[], user: User): Ticket[] {
  if (user.role === "Admin" || user.role === "Owner") return tickets;

  // Head / Manager / Lead can see all tickets across all departments
  if (isElevatedRole(user)) return tickets;

  if (user.department === "CX") {
    return tickets.filter(ticket =>
      ticket.assigneeId === user.id || isCXTicketVisible(user, ticket)
    );
  }

  // Match by assignee, department, or sub-department
  // e.g. Supply/Marketplace user sees all Supply tickets, all Marketplace tickets, and their assigned tickets
  return tickets.filter(ticket =>
    ticket.assigneeId === user.id ||
    ticket.department === user.department ||
    (!!user.subDepartment && ticket.department === user.subDepartment)
  );
}

/**
 * Check if user can edit core ticket details
 *
 * Rules:
 * - CX users: Can edit core ticket details (category, description, subject, etc.)
 * - Non-CX users: CANNOT edit core details, only:
 *   - Add comments
 *   - Change assignee
 *   - Update status
 *   - Add/modify tags
 * - Admins/Owners: Can edit everything
 */
export function canEditTicketDetails(user: User, ticket: Ticket): boolean {
  if (user.role === "Admin" || user.role === "Owner") return true;
  if (user.department === "CX") return isCXTicketVisible(user, ticket);
  // Head/Manager/Lead can edit operational fields but not CX-specific details
  // (core detail editing still restricted to CX/Admin)
  return false;
}

/**
 * Check if user can perform limited ticket updates
 * (assignee, status, tags - even for non-CX users)
 *
 * Rules:
 * - All users in the ticket's department can update assignee/status/tags
 * - Must be in the same department as the ticket
 */
export function canPerformLimitedUpdate(user: User, ticket: Ticket): boolean {
  if (user.role === "Admin" || user.role === "Owner") return true;
  // Head/Manager/Lead can do limited updates on any ticket
  if (isElevatedRole(user)) return true;
  if (user.department === "CX") return isCXTicketVisible(user, ticket);
  // Associate/Agent: same department OR ticket is assigned to them
  return ticket.department === user.department || ticket.assigneeId === user.id;
}

/**
 * Validate which fields user is trying to update
 * Returns error message if trying to update restricted fields
 *
 * @param user - Current user
 * @param ticket - Ticket being updated
 * @param updates - Fields being updated
 * @returns null if allowed, error message if not allowed
 */
export function validateTicketUpdate(
  user: User,
  ticket: Ticket,
  updates: Record<string, any>
): string | null {
  // Admin/Owner can update anything
  if (user.role === "Admin" || user.role === "Owner") {
    return null;
  }

  // CX users can update tickets within their subDepartment scope
  if (user.department === "CX") {
    if (!isCXTicketVisible(user, ticket)) {
      return `Access denied. You can only update ${user.subDepartment || "CX"} tickets.`;
    }
    return null;
  }

  // Head / Manager / Lead can update any ticket's operational fields
  if (isElevatedRole(user)) {
    // They still cannot edit core CX-owned detail fields
    const restrictedForElevated = [
      "subject", "description", "categoryId", "issueType", "department",
      "ownerTeam", "priorityScore", "priorityTier", "vendorHandle",
      "customer", "fleekOrderIds", "attachments"
    ];
    const bad = Object.keys(updates).filter(f => restrictedForElevated.includes(f));
    if (bad.length > 0) {
      return `Access denied. Only CX users can edit: ${bad.join(", ")}.`;
    }
    return null;
  }

  // Fields that any authenticated non-CX user can update on ANY ticket
  // (cross-department safe operations: assigning to someone, labelling with tags)
  const crossDeptAllowedFields = ["assigneeId", "tags"];

  // If the user is ONLY updating cross-department-safe fields, allow it regardless of department
  const updatingFields = Object.keys(updates);
  const onlyCrossDeptFields = updatingFields.length > 0 &&
    updatingFields.every(f => crossDeptAllowedFields.includes(f));

  if (onlyCrossDeptFields) {
    return null; // Always allowed: reassigning or tagging any ticket
  }

  // If the ticket is assigned to this user, they can perform all limited operational
  // updates (status, assignee, tags, slaStatus) even if it's from another department.
  // (A cross-department assignment means they're explicitly responsible for it.)
  if (ticket.assigneeId === user.id) {
    // Still cannot edit core detail fields
    const restrictedFields = [
      "subject", "description", "categoryId", "issueType", "department",
      "ownerTeam", "priorityScore", "priorityTier", "vendorHandle",
      "customer", "fleekOrderIds", "attachments"
    ];
    const bad = Object.keys(updates).filter(f => restrictedFields.includes(f));
    if (bad.length > 0) {
      return `Access denied. Cannot edit core ticket details: ${bad.join(", ")}.`;
    }
    return null; // status / tags / assigneeId / slaStatus all allowed
  }

  // For all other operations (status changes, etc.) user must be in the same department
  if (ticket.department !== user.department) {
    return `Access denied. You can only update tickets in ${user.department} department.`;
  }

  // Non-CX users can only update limited fields
  const allowedFields = [
    "assigneeId",
    "status",
    "tags",
    "slaStatus"
  ];

  // Core ticket detail fields that non-CX users CANNOT edit
  const restrictedFields = [
    "subject",
    "description",
    "categoryId",
    "issueType",
    "department",
    "ownerTeam",
    "priorityScore",
    "priorityTier",
    "vendorHandle",
    "customer",
    "fleekOrderIds",
    "attachments"
  ];

  // Check if trying to update restricted fields
  const updatingRestrictedFields = Object.keys(updates).filter(field =>
    restrictedFields.includes(field)
  );

  if (updatingRestrictedFields.length > 0) {
    return `Access denied. Non-CX users cannot edit: ${updatingRestrictedFields.join(", ")}. You can only update: ${allowedFields.join(", ")}.`;
  }

  // Check if trying to update fields outside allowed list
  const updatingUnknownFields = Object.keys(updates).filter(field =>
    !allowedFields.includes(field) &&
    !restrictedFields.includes(field) &&
    field !== "updatedAt" // This is auto-set by system
  );

  if (updatingUnknownFields.length > 0) {
    return `Unknown fields: ${updatingUnknownFields.join(", ")}. Allowed fields for your role: ${allowedFields.join(", ")}.`;
  }

  return null; // Update allowed
}

/**
 * Get user's department access summary
 * Useful for frontend to show what user can see
 */
export function getUserDepartmentAccess(user: User): {
  canViewAllDepartments: boolean;
  canEditAllTickets: boolean;
  departments: string[];
  restrictions: string[];
} {
  const isAdmin = user.role === "Admin" || user.role === "Owner";
  const isCX = user.department === "CX";
  const elevated = isElevatedRole(user); // Lead, Manager, Head

  return {
    canViewAllDepartments: isAdmin || isCX || elevated,
    canEditAllTickets: isAdmin || isCX || elevated,
    departments: isAdmin || isCX || elevated ? ["All"] : [user.department || "None"],
    restrictions: isAdmin || isCX || elevated
      ? elevated && !isAdmin
        ? ["Cannot edit core ticket details (subject, description, category, department)"]
        : []
      : [
          "Can only view tickets in your department (+ assigned tickets)",
          "Can only update: assignee, status, tags on same-dept or assigned tickets",
          "Cannot edit: subject, description, category, priority"
        ]
  };
}
