import path from "path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // 통합/E2E 테스트(테스트 전용 Supabase 필요)는 기본 unit 테스트 실행에서 제외한다.
    exclude: [...configDefaults.exclude, "tests/**", ".worktrees/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only"는 Next.js의 react-server 번들 조건에서만 empty.js로 resolve된다.
      // Vitest는 이 조건을 모르므로 테스트에서는 항상 empty.js를 쓰도록 고정한다.
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
});
