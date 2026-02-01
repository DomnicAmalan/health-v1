/**
 * Patients Cube Schema
 * Defines metrics and dimensions for patient analytics
 */

import { cube } from '@cubejs-backend/schema-compiler';

cube(`Patients`, {
  sql: `SELECT * FROM patients`,

  measures: {
    count: {
      type: `count`,
      drillMembers: [id, name, createdAt]
    },

    newPatients: {
      sql: `id`,
      type: `count`,
      filters: [
        {
          sql: `${CUBE}.created_at >= CURRENT_DATE - INTERVAL '30 days'`
        }
      ]
    }
  },

  dimensions: {
    id: {
      sql: `id`,
      type: `string`,
      primaryKey: true
    },

    name: {
      sql: `name`,
      type: `string`
    },

    email: {
      sql: `email`,
      type: `string`
    },

    phone: {
      sql: `phone`,
      type: `string`
    },

    dateOfBirth: {
      sql: `date_of_birth`,
      type: `time`
    },

    gender: {
      sql: `gender`,
      type: `string`
    },

    insuranceProvider: {
      sql: `insurance_provider`,
      type: `string`
    },

    createdAt: {
      sql: `created_at`,
      type: `time`
    }
  }
});
