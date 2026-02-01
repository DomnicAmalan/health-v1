/**
 * Clinical Cube Schema
 * Defines metrics and dimensions for clinical analytics
 */

import { cube } from '@cubejs-backend/schema-compiler';

cube(`Clinical`, {
  sql: `
    SELECT
      v.id,
      v.patient_id,
      v.visit_type,
      v.visit_date,
      v.diagnosis,
      v.provider_id,
      v.department,
      v.status,
      v.created_at,
      p.name as patient_name,
      p.date_of_birth,
      p.gender,
      EXTRACT(YEAR FROM AGE(p.date_of_birth)) as patient_age
    FROM visits v
    LEFT JOIN patients p ON v.patient_id = p.id
  `,

  joins: {
    Patients: {
      sql: `${CUBE}.patient_id = ${Patients}.id`,
      relationship: `belongsTo`
    }
  },

  measures: {
    // Total visits
    visitCount: {
      type: `count`,
      drillMembers: [patientName, visitType, visitDate]
    },

    // Unique patients
    patientCount: {
      sql: `patient_id`,
      type: `countDistinct`
    },

    // Average visits per patient
    avgVisitsPerPatient: {
      sql: `${visitCount} / NULLIF(${patientCount}, 0)`,
      type: `number`,
      format: `percent`
    },

    // Average patient age
    avgPatientAge: {
      sql: `patient_age`,
      type: `avg`,
      format: `number`
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

    patientName: {
      sql: `patient_name`,
      type: `string`
    },

    visitType: {
      sql: `visit_type`,
      type: `string`
    },

    diagnosis: {
      sql: `diagnosis`,
      type: `string`
    },

    department: {
      sql: `department`,
      type: `string`
    },

    status: {
      sql: `status`,
      type: `string`
    },

    gender: {
      sql: `gender`,
      type: `string`
    },

    patientAge: {
      sql: `patient_age`,
      type: `number`
    },

    ageGroup: {
      sql: `
        CASE
          WHEN patient_age < 18 THEN 'Pediatric'
          WHEN patient_age BETWEEN 18 AND 65 THEN 'Adult'
          ELSE 'Senior'
        END
      `,
      type: `string`
    },

    visitDate: {
      sql: `visit_date`,
      type: `time`
    },

    createdAt: {
      sql: `created_at`,
      type: `time`
    }
  },

  preAggregations: {
    // Daily visit volume
    dailyVisits: {
      measures: [visitCount, patientCount],
      dimensions: [visitType, department],
      timeDimension: visitDate,
      granularity: `day`,
      refreshKey: {
        every: `1 hour`
      }
    }
  }
});
