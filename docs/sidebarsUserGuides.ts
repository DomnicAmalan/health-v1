import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  userGuidesSidebar: [
    'overview',
    {
      type: 'category',
      label: 'Doctor',
      items: [
        'doctor/overview',
        'doctor/patient-management',
        'doctor/clinical-notes',
        'doctor/orders',
        'doctor/results-review',
      ],
    },
    {
      type: 'category',
      label: 'Nurse',
      items: [
        'nurse/overview',
        'nurse/vitals',
        'nurse/triage',
        'nurse/medication-admin',
      ],
    },
    {
      type: 'category',
      label: 'Front Desk',
      items: [
        'front-desk/overview',
        'front-desk/scheduling',
        'front-desk/check-in',
        'front-desk/registration',
      ],
    },
    {
      type: 'category',
      label: 'Admin',
      items: [
        'admin/overview',
        'admin/user-management',
        'admin/workflow-config',
        'admin/compliance',
        'admin/vault',
      ],
    },
    {
      type: 'category',
      label: 'Lab Tech',
      items: [
        'lab-tech/overview',
        'lab-tech/specimen-collection',
        'lab-tech/result-entry',
        'lab-tech/verification',
      ],
    },
    {
      type: 'category',
      label: 'Pharmacist',
      items: [
        'pharmacist/overview',
        'pharmacist/dispensing',
        'pharmacist/verification',
        'pharmacist/inventory',
      ],
    },
    {
      type: 'category',
      label: 'Billing',
      items: [
        'billing/overview',
        'billing/invoicing',
        'billing/payments',
        'billing/insurance',
      ],
    },
    {
      type: 'category',
      label: 'Patient',
      items: [
        'patient/overview',
        'patient/portal',
      ],
    },
  ],
};

export default sidebars;
