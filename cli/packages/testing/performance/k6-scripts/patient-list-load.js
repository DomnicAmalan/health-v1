/**
 * Patient List Load Test
 *
 * Simulates concurrent users browsing patient lists.
 * Tests pagination, search, and filtering performance.
 *
 * Run with: k6 run patient-list-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users over 30s
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 50 },  // Spike to 50 users
    { duration: '1m', target: 50 },   // Maintain spike
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],     // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],       // Less than 1% failures
    errors: ['rate<0.05'],                // Less than 5% errors
  },
};

// Test data
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test-bearer-token';

// Login and get token (run once per VU)
export function setup() {
  // Optionally perform login to get real token
  // For now, using test token from environment
  return { token: TEST_TOKEN };
}

// Main test scenario
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // 1. List patients (default pagination)
  let res = http.get(`${BASE_URL}/api/v1/patients?limit=20&page=1`, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has patients': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.items && body.data.items.length > 0;
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // 2. Search patients
  res = http.get(`${BASE_URL}/api/v1/patients?search=john&limit=20`, { headers });

  check(res, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // 3. Get patient details (assuming patient ID exists)
  res = http.get(`${BASE_URL}/api/v1/patients`, { headers });

  if (res.status === 200) {
    try {
      const patients = JSON.parse(res.body).data.items;
      if (patients && patients.length > 0) {
        const patientId = patients[0].id;

        res = http.get(`${BASE_URL}/api/v1/patients/${patientId}`, { headers });

        check(res, {
          'patient detail status is 200': (r) => r.status === 200,
          'patient detail response time < 300ms': (r) => r.timings.duration < 300,
        }) || errorRate.add(1);
      }
    } catch (e) {
      errorRate.add(1);
    }
  }

  sleep(1);

  // 4. Filter by status
  res = http.get(`${BASE_URL}/api/v1/patients?status=active&limit=20`, { headers });

  check(res, {
    'filter status is 200': (r) => r.status === 200,
    'filter response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(2);
}

// Teardown (runs once after all VUs complete)
export function teardown(data) {
  console.log('Test completed successfully');
}
