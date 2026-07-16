import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";
import baseConfigExport from "./vitest.config";

const baseConfig = baseConfigExport as ViteUserConfig;

// @/ 경로 별칭, server-only 별칭, 기본 설정은 baseConfig에서 그대로 상속한다.
const merged = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.ts"],
      setupFiles: ["./tests/integration/setup.ts"],
      globalSetup: ["./tests/integration/global-setup.ts"],
    },
  })
);

// mergeConfig은 exclude 배열을 이어붙이므로, baseConfig의 "tests/**" 제외가 그대로 남아
// 통합 테스트 파일까지 제외해버린다. 이 설정에서는 명시적으로 다시 지정한다.
if (merged.test) {
  merged.test.exclude = ["**/node_modules/**", "**/.git/**", "**/.next/**"];
}

export default merged;
