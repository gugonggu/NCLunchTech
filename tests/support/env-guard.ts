import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { extractProjectRefFromDbUrl, extractProjectRefFromUrl } from "./project-ref";

const DEV_ENV_PATH = path.resolve(process.cwd(), ".env.local");
const TEST_ENV_PATH = path.resolve(process.cwd(), ".env.test.local");

/**
 * 파일 전체를 파싱하지 않고 지정한 키 한 줄만 읽어서 반환한다.
 * 개발용 .env.local의 SUPABASE_SERVICE_ROLE_KEY 등 다른 비밀값을 절대 메모리에 올리지 않기 위함이다.
 */
function readSingleEnvValue(filePath: string, key: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf8");
  const line = content.split("\n").find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return null;

  return line.slice(line.indexOf("=") + 1).trim();
}

/** 테스트 프로세스(Vitest 통합테스트/Playwright)에 .env.test.local 값을 로드한다. */
export function loadTestEnv(): void {
  dotenv.config({ path: TEST_ENV_PATH, override: true });
}

/**
 * 개발 프로젝트와 테스트 프로젝트가 실제로 분리되어 있는지 검증한다.
 * 개발용 서비스 롤 키는 어떤 경우에도 읽지 않는다(URL의 project ref만 비교).
 */
export function assertTestSupabaseIsolated(): { testRef: string } {
  if (!fs.existsSync(TEST_ENV_PATH)) {
    throw new Error(".env.test.local이 없습니다. 테스트 전용 Supabase 프로젝트 값을 먼저 채워주세요.");
  }

  const testEnv = dotenv.parse(fs.readFileSync(TEST_ENV_PATH));

  if (testEnv.ALLOW_TEST_DB_WRITES !== "true") {
    throw new Error("ALLOW_TEST_DB_WRITES=true가 .env.test.local에 정확히 설정되어 있어야 합니다.");
  }

  const testUrl = testEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!testUrl) {
    throw new Error(".env.test.local에 NEXT_PUBLIC_SUPABASE_URL이 없습니다.");
  }

  const testRefFromUrl = extractProjectRefFromUrl(testUrl);
  if (!testRefFromUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL에서 project ref를 추출할 수 없습니다.");
  }

  if (!testEnv.TEST_PROJECT_REF || testEnv.TEST_PROJECT_REF !== testRefFromUrl) {
    throw new Error(
      "TEST_PROJECT_REF가 없거나 NEXT_PUBLIC_SUPABASE_URL의 project ref와 일치하지 않습니다."
    );
  }

  if (testEnv.SUPABASE_DB_URL) {
    const testRefFromDbUrl = extractProjectRefFromDbUrl(testEnv.SUPABASE_DB_URL);
    if (testRefFromDbUrl && testRefFromDbUrl !== testRefFromUrl) {
      throw new Error("SUPABASE_DB_URL의 project ref가 NEXT_PUBLIC_SUPABASE_URL과 일치하지 않습니다.");
    }
  }

  const devUrl = readSingleEnvValue(DEV_ENV_PATH, "NEXT_PUBLIC_SUPABASE_URL");
  const devRef = devUrl ? extractProjectRefFromUrl(devUrl) : null;

  if (devRef && devRef === testRefFromUrl) {
    throw new Error(
      "테스트 Supabase project ref가 개발용(.env.local)과 동일합니다. 반드시 별도 프로젝트를 사용하세요."
    );
  }

  return { testRef: testRefFromUrl };
}
