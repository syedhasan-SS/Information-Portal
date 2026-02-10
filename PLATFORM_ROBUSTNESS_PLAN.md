# Platform Robustness Improvement Plan

## Current Issues Identified

### 1. ✅ FIXED: Ticket Filtering for Owner/Admin Roles
**Issue**: Owner users couldn't see tickets from departments other than their assigned department
**Root Cause**: Filtering logic didn't properly bypass department restrictions for Owner/Admin roles
**Fix Applied**: Added role-based bypass at the start of departmentFilteredTickets logic
**Files Modified**: `client/src/pages/all-tickets.tsx`

### 2. ⚠️ PENDING: BigQuery Vendor Sync Credentials
**Issue**: Vendor sync failing with "Could not load default credentials" error
**Root Cause**: Missing `GOOGLE_APPLICATION_CREDENTIALS_JSON` in Vercel environment
**Action Required**: Add service account credentials to Vercel environment variables
**Priority**: High - blocks vendor data synchronization

### 3. ⚠️ PENDING: Console Logging Cleanup
**Issue**: 83 files contain console.log/error/warn statements
**Impact**: Performance degradation, security risk (potential data leakage), cluttered logs
**Recommendation**: Implement structured logging system
**Priority**: Medium

### 4. ⚠️ PENDING: Error Handling Standardization
**Issue**: Inconsistent error handling across API endpoints
**Impact**: Poor user experience, difficult debugging
**Recommendation**: Standardize error responses and add comprehensive try-catch blocks
**Priority**: Medium

### 5. ⚠️ PENDING: Data Validation
**Issue**: Missing comprehensive validation on ticket creation/updates
**Impact**: Potential data corruption, invalid states
**Recommendation**: Add Zod schema validation for all API inputs
**Priority**: High

## Implementation Priorities

### Phase 1: Critical Fixes (Immediate)
1. ✅ Fix Owner/Admin ticket filtering
2. 🔄 Add BigQuery credentials to Vercel
3. 🔄 Add comprehensive error handling to ticket creation API
4. 🔄 Add data validation to critical endpoints

### Phase 2: Robustness Improvements (Short-term)
1. Implement structured logging system
2. Add request validation middleware
3. Standardize API error responses
4. Add comprehensive field validation
5. Improve database query error handling

### Phase 3: Quality Improvements (Medium-term)
1. Clean up console statements
2. Add performance monitoring
3. Implement rate limiting
4. Add request tracing
5. Improve error recovery mechanisms

## Detailed Recommendations

### Logging System
```typescript
// Implement structured logging with levels
enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class Logger {
  log(level: LogLevel, message: string, context?: Record<string, any>) {
    // Production: Send to logging service (Datadog, Sentry, etc.)
    // Development: Console output with color coding
  }
}
```

### Error Handling Pattern
```typescript
// Standardized error response format
interface ApiError {
  error: string;
  code: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

// Centralized error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const apiError: ApiError = {
    error: error.message,
    code: determineErrorCode(error),
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] as string
  };

  res.status(getStatusCode(error)).json(apiError);
});
```

### Data Validation
```typescript
import { z } from 'zod';

// Ticket creation schema
const createTicketSchema = z.object({
  vendorHandle: z.string().optional(),
  customer: z.string().optional(),
  department: z.enum(['Finance', 'Operations', 'Marketplace', 'Tech', 'Supply', 'Growth', 'Experience', 'CX']),
  issueType: z.enum(['Complaint', 'Request', 'Information']),
  categoryId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  description: z.string().min(1),
  fleekOrderIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional()
});

// Validate in API endpoint
app.post('/api/tickets', async (req, res) => {
  try {
    const validatedData = createTicketSchema.parse(req.body);
    // Proceed with creation
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    throw error;
  }
});
```

## Success Metrics

### Reliability
- 99.9% uptime
- < 1% error rate on API endpoints
- Zero critical data loss incidents

### Performance
- API response time < 200ms (p95)
- Database queries < 100ms (p95)
- Page load time < 2s

### Quality
- Zero production errors from missing validation
- All errors logged with full context
- All user-facing errors have clear messages

## Next Steps

1. **Immediate**: Add BigQuery credentials to Vercel
2. **Today**: Implement error handling for ticket creation
3. **This Week**: Add data validation to all ticket endpoints
4. **Next Week**: Implement structured logging system
5. **Ongoing**: Monitor error rates and user feedback
