import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", "guidelines/**", "postcss.config.mjs", "src/**"],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default config;
