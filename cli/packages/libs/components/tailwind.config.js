/** @type {import('tailwindcss').Config} */
import sharedConfig from "@health-v1/shared/styles/tailwind.config";

export default {
  ...sharedConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
