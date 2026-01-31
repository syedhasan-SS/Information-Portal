import "dotenv/config";
import { db } from "./db";
import { tickets, categories, tags, slaConfigurations } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Backfill script to populate snapshot data for existing tickets
 * This ensures backward compatibility after adding the snapshot architecture
 */

async function calculateHoursDiff(start: Date, end: Date): Promise<number> {
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60));
}

async function backfillTicketSnapshots() {
  console.log("Starting ticket snapshot backfill...\n");

  try {
    // Fetch all tickets that don't have snapshots
    const allTickets = await db
      .select()
      .from(tickets)
      .where(isNull(tickets.snapshotCapturedAt));

    console.log(`Found ${allTickets.length} tickets without snapshots`);

    if (allTickets.length === 0) {
      console.log("✓ All tickets already have snapshots");
      process.exit(0);
    }

    // Fetch all categories and tags for reference
    const allCategories = await db.select().from(categories);
    const allTags = await db.select().from(tags);
    const allSlaConfigs = await db.select().from(slaConfigurations);

    // Build lookup maps
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const tagMap = new Map(allTags.map((t) => [t.name, t]));

    let migrated = 0;
    let failed = 0;
    const errors: Array<{ ticketId: string; error: string }> = [];

    for (const ticket of allTickets) {
      try {
        const category = categoryMap.get(ticket.categoryId);

        // Build category snapshot (use "Unknown" for deleted categories)
        const categorySnapshot = category
          ? {
              categoryId: ticket.categoryId,
              issueType: ticket.issueType,
              l1: category.l1,
              l2: category.l2,
              l3: category.l3,
              l4: category.l4,
              path: category.path,
              departmentType: category.departmentType || undefined,
              issuePriorityPoints: category.issuePriorityPoints,
            }
          : {
              categoryId: ticket.categoryId,
              issueType: ticket.issueType,
              l1: "Unknown",
              l2: "Unknown",
              l3: "Unknown",
              l4: null,
              path: "Unknown > Unknown > Unknown",
              issuePriorityPoints: 0,
            };

        // Build SLA snapshot from existing SLA target dates
        const responseHours = ticket.slaResponseTarget
          ? await calculateHoursDiff(ticket.createdAt, ticket.slaResponseTarget)
          : null;

        const resolutionHours = ticket.slaResolveTarget
          ? await calculateHoursDiff(ticket.createdAt, ticket.slaResolveTarget)
          : 24;

        // Find matching SLA configuration (best effort)
        const slaConfig = allSlaConfigs.find(
          (config) =>
            config.isActive &&
            config.categoryId === ticket.categoryId &&
            (config.department === ticket.department ||
              config.department === "All")
        );

        const slaSnapshot = {
          configurationId: slaConfig?.id || undefined,
          responseTimeHours: responseHours,
          resolutionTimeHours: resolutionHours,
          useBusinessHours: slaConfig?.useBusinessHours || false,
          responseTarget: ticket.slaResponseTarget?.toISOString() || null,
          resolveTarget:
            ticket.slaResolveTarget?.toISOString() ||
            new Date(
              ticket.createdAt.getTime() + 24 * 60 * 60 * 1000
            ).toISOString(),
        };

        // Build priority snapshot from existing priority data
        const prioritySnapshot = {
          configurationId: undefined,
          score: ticket.priorityScore || 0,
          tier: ticket.priorityTier || "Low",
          badge: ticket.priorityBadge || "P3",
          breakdown: ticket.priorityBreakdown || {
            vendorTicketVolume: 0,
            vendorGmvTier: "Unknown",
            issuePriorityPoints: 0,
            gmvPoints: 0,
            ticketHistoryPoints: 0,
            issuePoints: 0,
          },
        };

        // Build tags snapshot from tag names
        const tagsSnapshot = (ticket.tags || [])
          .map((tagName: string) => {
            const tag = tagMap.get(tagName);
            return {
              id: tag?.id || `unknown-${tagName}`,
              name: tagName,
              color: tag?.color || undefined,
              departmentType: tag?.departmentType || undefined,
              appliedAt: ticket.createdAt.toISOString(),
            };
          });

        // Update ticket with snapshots
        await db
          .update(tickets)
          .set({
            categorySnapshot,
            slaSnapshot,
            prioritySnapshot,
            tagsSnapshot,
            snapshotVersion: 1,
            snapshotCapturedAt: ticket.createdAt,
          })
          .where(eq(tickets.id, ticket.id));

        migrated++;

        if (migrated % 10 === 0) {
          console.log(
            `Progress: ${migrated}/${allTickets.length} tickets migrated`
          );
        }
      } catch (error) {
        failed++;
        errors.push({
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`✗ Failed to backfill ticket ${ticket.ticketNumber}:`, error);
      }
    }

    console.log("\n=== Backfill Complete ===");
    console.log(`✓ Successfully migrated: ${migrated}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`Total tickets processed: ${allTickets.length}`);

    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach(({ ticketId, error }) => {
        console.log(`Ticket ${ticketId}: ${error}`);
      });
    }

    // Verify the backfill
    console.log("\n=== Verification ===");
    const verification = await db
      .select()
      .from(tickets)
      .where(isNull(tickets.snapshotCapturedAt));

    console.log(`Tickets still without snapshots: ${verification.length}`);

    if (verification.length === 0) {
      console.log("\n✅ All tickets now have snapshots!");
    } else {
      console.log(
        `\n⚠️  ${verification.length} tickets still need manual attention`
      );
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillTicketSnapshots();
