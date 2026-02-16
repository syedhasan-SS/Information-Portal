// Ticket Access Control and Permissions
// Defines who can view and edit tickets based on department and role

import type { User, Ticket } from "@shared/schema";

/**
 * Check if user can view a specific ticket based on department rules
 *
 * Rules:
 * - CX users: Can view ALL tickets (across all departments)
 * - Non-CX users: Can ONLY view tickets in their own department
 * - Admins/Owners: Can view ALL tickets
 */
export function canViewTicket(user: User, ticket: Ticket): boolean {
  // Admin/Owner can view everything
  if (user.role === "Admin" || user.role === "Owner") {
    return true;
  }

  // CX department users can view all tickets
  if (user.department === "CX") {
    return true;
  }

  // Non-CX users can only view tickets in their department
  return ticket.department === user.department;
}

/**
 * Filter tickets based on user's department access
 *
 * @param tickets - Array of all tickets
 * @param user - Current user
 * @returns Filtered array of tickets user can access
 */
export function filterTicketsByDepartmentAccess(tickets: Ticket[], user: User): Ticket[] {
  // Admin/Owner can see everything
  if (user.role === "Admin" || user.role === "Owner") {
    return tickets;
  }

  // CX department users can see all tickets
  if (user.department === "CX") {
    return tickets;
  }

  // Non-CX users can only see tickets in their department
  return tickets.filter(ticket => ticket.department === user.department);
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
  // Admin/Owner can edit everything
  if (user.role === "Admin" || user.role === "Owner") {
    return true;
  }

  // CX department users can edit all ticket details
  if (user.department === "CX") {
    return true;
  }

  // Non-CX users cannot edit core ticket details
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
  // Admin/Owner can do anything
  if (user.role === "Admin" || user.role === "Owner") {
    return true;
  }

  // CX users can do anything
  if (user.department === "CX") {
    return true;
  }

  // Non-CX users can only update tickets in their department
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

  // CX users can update anything
  if (user.department === "CX") {
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
