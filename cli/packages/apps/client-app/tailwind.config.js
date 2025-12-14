/** @type {import('tailwindcss').Config} */
import sharedConfig from "@health-v1/shared/styles/tailwind.config";

export default {
  ...sharedConfig,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../libs/components/src/**/*.{js,ts,jsx,tsx}",
  ],
};
