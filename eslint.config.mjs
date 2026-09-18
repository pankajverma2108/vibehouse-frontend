import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "guidelines/**", "postcss.config.mjs", "src/**", "backend/**", "docs/**", "scripts/**"],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default config;
