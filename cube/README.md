# Cube.js Analytics Setup

This directory contains Cube.js configuration for analytics dashboards.

## Quick Start

### 1. Add to Docker Compose

Add this service to your `docker-compose.dev.yml`:

```yaml
services:
  cube:
    image: cubejs/cube:latest
    ports:
      - "4000:4000"    # Cube.js API
      - "15432:15432"  # Dev playground
    environment:
      - CUBEJS_DB_TYPE=postgres
      - CUBEJS_DB_HOST=postgres
      - CUBEJS_DB_NAME=${POSTGRES_DB}
      - CUBEJS_DB_USER=${POSTGRES_USER}
      - CUBEJS_DB_PASS=${POSTGRES_PASSWORD}
      - CUBEJS_DEV_MODE=true
      - CUBEJS_API_SECRET=${CUBE_API_SECRET:-dev-secret}
      - CUBEJS_WEB_SOCKETS=true
    volumes:
      - ./cube:/cube/conf
    depends_on:
      - postgres
    networks:
      - health-v1-network
```

### 2. Add Environment Variables

Add to root `.env`:

```bash
# Cube.js Configuration
CUBE_API_SECRET=your-secret-key-here
```

Add to `cli/packages/apps/client-app/.env`:

```bash
VITE_CUBE_API_URL=http://localhost:4000/cubejs-api/v1
VITE_CUBE_API_TOKEN=dev-token
```

### 3. Start Cube.js

```bash
make docker-dev
```

Or:

```bash
docker-compose -f docker-compose.dev.yml up cube
```

### 4. Access Cube Playground

Open http://localhost:4000 to explore your data and build queries.

## Using in React Components

### Import and Use

```tsx
import { CubeProvider } from '@cubejs-client/react';
import { cubejsApi } from '@/lib/analytics/cubeClient';
import { RevenueMetrics } from '@/components/analytics/RevenueMetrics';

export function MyDashboard() {
  return (
    <CubeProvider cubejsApi={cubejsApi}>
      <RevenueMetrics />
    </CubeProvider>
  );
}
```

### Available Components

#### Revenue Analytics
- `RevenueMetrics` - KPI cards (total, collected, outstanding, collection rate)
- `RevenueTrendChart` - 30-day revenue trend line chart
- `RevenueDashboard` - Complete revenue dashboard example

#### Clinical Analytics
- `ClinicalMetrics` - KPI cards (visits, patients, avg visits)
- `VisitTrendChart` - Visit volume by type (stacked bar chart)
- `DepartmentBreakdown` - Department visit distribution (pie chart)
- `ClinicalDashboardCube` - Complete clinical dashboard example

## Data Schemas

### Revenue Schema

**Measures:**
- `Revenue.totalRevenue` - Total billed amount
- `Revenue.collectedRevenue` - Total collected/paid amount
- `Revenue.outstandingRevenue` - Unpaid balance
- `Revenue.insuranceRevenue` - Insurance portion
- `Revenue.patientRevenue` - Patient out-of-pocket
- `Revenue.avgBillAmount` - Average bill size
- `Revenue.collectionRate` - Collection percentage
- `Revenue.billCount` - Number of bills

**Dimensions:**
- `Revenue.status` - Bill status (paid, pending, overdue)
- `Revenue.insuranceProvider` - Insurance company
- `Revenue.createdAt` - Bill creation date
- `Revenue.paidDate` - Payment date

### Clinical Schema

**Measures:**
- `Clinical.visitCount` - Total visits
- `Clinical.patientCount` - Unique patients
- `Clinical.avgVisitsPerPatient` - Average visits per patient
- `Clinical.avgPatientAge` - Average patient age

**Dimensions:**
- `Clinical.visitType` - Type of visit (consultation, follow-up, etc.)
- `Clinical.department` - Department name
- `Clinical.diagnosis` - Diagnosis code/name
- `Clinical.gender` - Patient gender
- `Clinical.ageGroup` - Age bracket (pediatric, adult, senior)
- `Clinical.visitDate` - Visit date

### Patients Schema

**Measures:**
- `Patients.count` - Total patients
- `Patients.newPatients` - New patients (last 30 days)

**Dimensions:**
- `Patients.name` - Patient name
- `Patients.gender` - Gender
- `Patients.insuranceProvider` - Insurance
- `Patients.createdAt` - Registration date

## Example Queries

### Total Revenue This Month

```typescript
const { resultSet } = useCubeQuery({
  measures: ['Revenue.totalRevenue'],
  timeDimensions: [{
    dimension: 'Revenue.createdAt',
    dateRange: 'This month'
  }]
}, { cubejsApi });
```

### Visit Trends by Department

```typescript
const { resultSet } = useCubeQuery({
  measures: ['Clinical.visitCount'],
  dimensions: ['Clinical.department'],
  timeDimensions: [{
    dimension: 'Clinical.visitDate',
    granularity: 'day',
    dateRange: 'Last 7 days'
  }]
}, { cubejsApi });
```

## Security

### Production Setup

1. **Disable Dev Mode:**
   ```yaml
   - CUBEJS_DEV_MODE=false
   ```

2. **Use JWT Authentication:**
   Update `cube/cube.js` to verify JWT tokens from your Rust backend.

3. **Row-Level Security:**
   Implement `queryRewrite` to filter data based on user role/permissions.

### Example Row-Level Security

```javascript
// cube/cube.js
queryRewrite: (query, { securityContext }) => {
  // Doctors only see their own patients
  if (securityContext.userRole === 'doctor') {
    query.filters.push({
      member: 'Patients.providerId',
      operator: 'equals',
      values: [securityContext.userId]
    });
  }
  return query;
}
```

## Performance

### Pre-Aggregations

Pre-aggregations are defined in the schemas for better performance:

- `Revenue.dailyRevenue` - Daily revenue rollup (refreshes hourly)
- `Clinical.dailyVisits` - Daily visit counts (refreshes hourly)

### Caching

Cube.js automatically caches query results. Configure cache refresh:

```javascript
refreshKey: {
  every: `1 hour`
}
```

## Troubleshooting

### Connection Issues

1. Check database credentials in docker-compose
2. Verify postgres is running: `docker ps | grep postgres`
3. Check Cube logs: `docker logs health-v1-cube-1`

### Schema Errors

1. Validate schema syntax in Cube Playground
2. Check table/column names match your database
3. Restart Cube after schema changes: `docker-compose restart cube`

### Frontend Errors

1. Verify `VITE_CUBE_API_URL` is correct
2. Check Cube.js is running: `curl http://localhost:4000/readyz`
3. Check browser console for CORS errors

## Resources

- [Cube.js Documentation](https://cube.dev/docs)
- [PostgreSQL Data Source](https://cube.dev/docs/product/configuration/data-sources/postgres)
- [React Integration](https://cube.dev/docs/frontend-introduction/react)
- [Building Dashboards with Recharts](https://dev.to/cubejs/building-a-recharts-dashboard-with-cube-5cco)
