-- Cleanup script to delete old routing rules that reference legacy categories
-- Run this before deploying the new schema that references categoryHierarchy

-- Show count before deletion
SELECT COUNT(*) as old_routing_rules_count FROM category_routing_rules;

-- Delete all routing rules
DELETE FROM category_routing_rules;

-- Verify deletion
SELECT COUNT(*) as remaining_count FROM category_routing_rules;

-- Note: You'll need to recreate routing rules using categories from Ticket Manager (categoryHierarchy table)
