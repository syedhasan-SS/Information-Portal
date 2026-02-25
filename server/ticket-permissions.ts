// Ticket Access Control and Permissions
// Defines who can view and edit tickets based on department and role

import type { User, Ticket } from "@shared/schema";

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
 * - CX + Seller Support subDept: vendor tickets only (has vendorHandle)
 * - CX + Customer Support subDept: customer tickets only (has customer / no vendorHandle)
 * - CX + no subDept: all tickets
 * - Non-CX: only tickets in their own department
 */
export function canViewTicket(user: User, ticket: Ticket): boolean {
  if (user.role === "Admin" || user.role === "Owner") return true;

  // Users can always see tickets assigned to them, regardless of department
  if (ticket.assigneeId === user.id) return true;

  if (user.department === "CX") {
    return isCXTicketVisible(user, ticket);
  }

  return ticket.department === user.department;
}

/**
 * Filter tickets based on user's department access
 */
export function filterTicketsByDepartmentAccess(tickets: Ticket[], user: User): Ticket[] {
  if (user.role === "Admin" || user.role === "Owner") return tickets;

  if (user.department === "CX") {
    return tickets.filter(ticket =>
      ticket.assigneeId === user.id || isCXTicketVisible(user, ticket)
    );
  }

  // Always include tickets assigned to the user, plus all tickets in their department
  return tickets.filter(ticket =>
    ticket.assigneeId === user.id || ticket.department === user.department
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
  if (user.department === "CX") return isCXTicketVisible(user, ticket);
  return ticket.department === user.department;
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

  // Check if user is trying to update a ticket outside their department
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

  return {
    canViewAllDepartments: isAdmin || isCX,
    canEditAllTickets: isAdmin || isCX,
    departments: isAdmin || isCX ? ["All"] : [user.department || "None"],
    restrictions: isAdmin || isCX
      ? []
      : [
          "Can only view tickets in your department",
          "Can only update: assignee, status, tags",
          "Cannot edit: subject, description, category, priority"
        ]
  };
}
