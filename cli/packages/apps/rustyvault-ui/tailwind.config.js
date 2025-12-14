/** @type {import('tailwindcss').Config} */
import sharedConfig from "@lazarus-life/shared/styles/tailwind.config";

export default {
  ...sharedConfig,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../libs/components/src/**/*.{js,ts,jsx,tsx}",
  ],
};
