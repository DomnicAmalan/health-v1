/**
 * Cube.js Configuration
 */

import type { CubeConfig } from '@cubejs-backend/server-core';

const config: CubeConfig = {
  // Database configuration
  driverFactory: ({ dataSource }) => {
    return {};
  },

  // Security context for multi-tenancy and access control
  contextToAppId: ({ securityContext }) => {
    return `CUBEJS_APP_${securityContext?.tenantId || 'default'}`;
  },

  // JWT-based security
  checkAuth: async (req, _auth) => {
    // Verify JWT token from your Rust backend
    // For now, allow all in dev mode
    if (process.env.CUBEJS_DEV_MODE === 'true') {
      return;
    }

    const token = req.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No authorization token provided');
    }

    // TODO: Verify token with your Rust backend
    // For production, validate JWT and extract user permissions
  },

  // Extend security context with user info
  extendContext: async (req) => {
    return {
      securityContext: {
        userId: req.securityContext?.userId,
        userRole: req.securityContext?.userRole,
        tenantId: req.securityContext?.tenantId,
        permissions: req.securityContext?.permissions || []
      }
    };
  },

  // Query rewrite for row-level security
  queryRewrite: (query, { securityContext }) => {
    // Example: Restrict data based on user role
    // if (securityContext.userRole === 'doctor') {
    //   query.filters.push({
    //     member: 'Patients.providerId',
    //     operator: 'equals',
    //     values: [securityContext.userId]
    //   });
    // }

    return query;
  },

  // Schema version for cache invalidation
  schemaVersion: ({ securityContext }) => {
    return securityContext?.userId || 'default';
  }
};

export default config;
