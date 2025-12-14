/** @type {import('tailwindcss').Config} */
import sharedConfig from "@lazarus-life/shared/styles/tailwind.config";

export default {
  ...sharedConfig,
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
