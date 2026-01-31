import { db } from "./db";
import { configurationAuditLog, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

type EntityType =
  | "issueType"
  | "categoryHierarchy"
  | "categoryMapping"
  | "slaConfiguration"
  | "priorityConfiguration"
  | "tag"
  | "categorySettings"
  | "ticketFieldConfiguration";

type AuditAction = "create" | "update" | "delete" | "restore";

interface LogConfigChangeParams {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  version: number;
  userId: string;
  previousData?: any;
  newData: any;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Compares two objects and returns an array of changed field names
   */
  private getChangedFields(oldData: any, newData: any): string[] {
    const changedFields: string[] = [];

    if (!oldData) {
      // New record - all fields are "changed"
      return Object.keys(newData);
    }

    // Compare each field in newData
    for (const key in newData) {
      if (newData[key] !== oldData[key]) {
        // Handle null/undefined equality
        if (newData[key] == null && oldData[key] == null) {
          continue;
        }

        // Handle object/array comparison (shallow)
        if (typeof newData[key] === 'object' && typeof oldData[key] === 'object') {
          if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
            changedFields.push(key);
          }
        } else {
          changedFields.push(key);
        }
      }
    }

    return changedFields;
  }

  /**
   * Logs a configuration change to the audit trail
   */
  async logConfigChange(params: LogConfigChangeParams): Promise<void> {
    try {
      // Fetch user details
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      const user = userResults[0];

      if (!user) {
        console.error(`Audit log failed: User ${params.userId} not found`);
        return;
      }

      // Calculate changed fields
      const changedFields = this.getChangedFields(
        params.previousData || {},
        params.newData
      );

      // Insert audit log entry
      await db.insert(configurationAuditLog).values({
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        version: params.version,
        userId: params.userId,
        userEmail: user.email,
        userName: user.name,
        previousData: params.previousData || null,
        newData: params.newData,
        changedFields,
        changeReason: params.changeReason || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      });

      console.log(
        `✓ Audit log created: ${params.action} ${params.entityType} ${params.entityId} by ${user.name}`
      );
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logging should not break main operations
    }
  }

  /**
   * Retrieves the audit history for a specific entity
   */
  async getEntityHistory(
    entityType: EntityType,
    entityId: string,
    limit: number = 50
  ) {
    return await db
      .select()
      .from(configurationAuditLog)
      .where(
        and(
          eq(configurationAuditLog.entityType, entityType),
          eq(configurationAuditLog.entityId, entityId)
        )
      )
      .orderBy(desc(configurationAuditLog.timestamp))
      .limit(limit);
  }

  /**
   * Retrieves all audit logs for a specific user
   */
  async getUserActivityLog(userId: string, limit: number = 100) {
    return await db
      .select()
      .from(configurationAuditLog)
      .where(eq(configurationAuditLog.userId, userId))
      .orderBy(desc(configurationAuditLog.timestamp))
      .limit(limit);
  }

  /**
   * Retrieves recent audit logs across all entities
   */
  async getRecentActivity(limit: number = 50) {
    return await db
      .select()
      .from(configurationAuditLog)
      .orderBy(desc(configurationAuditLog.timestamp))
      .limit(limit);
  }

  /**
   * Retrieves audit logs filtered by entity type
   */
  async getActivityByEntityType(entityType: EntityType, limit: number = 50) {
    return await db
      .select()
      .from(configurationAuditLog)
      .where(eq(configurationAuditLog.entityType, entityType))
      .orderBy(desc(configurationAuditLog.timestamp))
      .limit(limit);
  }
}

// Export singleton instance
export const auditService = new AuditService();
