/**
 * Revenue Cube Schema
 * Defines metrics and dimensions for revenue analytics
 */

import { cube } from '@cubejs-backend/schema-compiler';

cube(`Revenue`, {
  sql: `
    SELECT
      b.id,
      b.patient_id,
      b.total_amount,
      b.paid_amount,
      b.insurance_amount,
      b.patient_amount,
      b.status,
      b.created_at,
      b.due_date,
      b.paid_date,
      p.name as patient_name,
      p.insurance_provider
    FROM billing b
    LEFT JOIN patients p ON b.patient_id = p.id
  `,

  joins: {
    Patients: {
      sql: `${CUBE}.patient_id = ${Patients}.id`,
      relationship: `belongsTo`
    }
  },

  measures: {
    // Total revenue
    totalRevenue: {
      sql: `total_amount`,
      type: `sum`,
      format: `currency`
    },

    // Collected revenue (paid)
    collectedRevenue: {
      sql: `paid_amount`,
      type: `sum`,
      format: `currency`
    },

    // Outstanding revenue
    outstandingRevenue: {
      sql: `total_amount - paid_amount`,
      type: `sum`,
      format: `currency`
    },

    // Insurance revenue
    insuranceRevenue: {
      sql: `insurance_amount`,
      type: `sum`,
      format: `currency`
    },

    // Patient out-of-pocket
    patientRevenue: {
      sql: `patient_amount`,
      type: `sum`,
      format: `currency`
    },

    // Average bill amount
    avgBillAmount: {
      sql: `total_amount`,
      type: `avg`,
      format: `currency`
    },

    // Collection rate (%)
    collectionRate: {
      sql: `CASE WHEN ${totalRevenue} > 0 THEN (${collectedRevenue} / ${totalRevenue}) * 100 ELSE 0 END`,
      type: `number`,
      format: `percent`
    },

    // Count of bills
    billCount: {
      type: `count`
    }
  },

  dimensions: {
    id: {
      sql: `id`,
      type: `string`,
      primaryKey: true
    },

    patientId: {
      sql: `patient_id`,
      type: `string`
    },

    status: {
      sql: `status`,
      type: `string`
    },

    insuranceProvider: {
      sql: `insurance_provider`,
      type: `string`
    },

    createdAt: {
      sql: `created_at`,
      type: `time`
    },

    dueDate: {
      sql: `due_date`,
      type: `time`
    },

    paidDate: {
      sql: `paid_date`,
      type: `time`
    }
  },

  preAggregations: {
    // Daily revenue rollup for performance
    dailyRevenue: {
      measures: [totalRevenue, collectedRevenue, billCount],
      timeDimension: createdAt,
      granularity: `day`,
      refreshKey: {
        every: `1 hour`
      }
    }
  }
});
