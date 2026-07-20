import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(process.cwd(), "supabase", "migrations", "0011_admin_atomic_operations.sql");
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

const signatures = [
  "admin_reset_employee_pin(uuid, uuid, text)",
  "admin_set_employee_active(uuid, uuid, boolean)",
  "admin_dismiss_report(uuid, uuid)",
  "admin_delete_reported_review(uuid, uuid)",
  "admin_apply_csv_batch(uuid, uuid)",
] as const;

describe("0011 관리자 원자 작업 마이그레이션", () => {
  it("승인된 업무별 security definer 함수 5개를 정의한다", () => {
    for (const name of signatures.map((signature) => signature.slice(0, signature.indexOf("(")))) {
      expect(sql).toContain(`function public.${name}`);
    }
    expect(sql.match(/security definer/g)).toHaveLength(signatures.length);
    expect(sql.match(/set search_path = ''/g)).toHaveLength(signatures.length);
  });

  it("일반 역할의 실행 권한을 제거하고 service_role에만 부여한다", () => {
    for (const signature of signatures) {
      expect(sql).toContain(`revoke all on function public.${signature} from public`);
      expect(sql).toContain(`revoke all on function public.${signature} from anon`);
      expect(sql).toContain(`revoke all on function public.${signature} from authenticated`);
      expect(sql).toContain(`grant execute on function public.${signature} to service_role`);
    }
  });

  it("CSV 반영을 직렬화하고 batch 행을 잠근다", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("for update");
    expect(sql).toMatch(/where id = p_batch_id\s+for update;\s+\n?\s*if not found then/);
  });
});
