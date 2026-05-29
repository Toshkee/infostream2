import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The react-three-fiber layer deliberately mutates Float32Array geometry
  // buffers and material instances in-place inside useFrame each frame (the
  // canonical R3F pattern: write the buffer, then set needsUpdate). The React
  // Compiler's immutability rule can't model this GPU-buffer idiom, so it is
  // scoped off for the 3D layer only.
  {
    files: ["src/components/three/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
