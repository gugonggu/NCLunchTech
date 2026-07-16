import { deleteEntityByTable } from "./db-helpers";
import { listEntities } from "./registry";

/**
 * registry에 남아있는 정확한 id만 정리한다(패턴/접두사 기반 일괄 삭제 없음).
 * 실행 시작 시 이전 실행의 잔여 데이터를 감지해 정리하는 용도와,
 * 실행 종료 시 각 테스트의 개별 정리가 놓친 항목을 마지막으로 정리하는 용도 양쪽에 쓰인다.
 * 하나라도 정리에 실패하면 예외를 던져 전체 실행을 실패로 처리한다.
 */
export async function cleanupLeftoverRegistry(registryPath: string, label: string): Promise<void> {
  const entries = listEntities(registryPath);
  if (entries.length === 0) return;

  console.warn(
    `[${label}] 정리되지 않은 테스트 데이터 ${entries.length}건을 발견했습니다. 정확한 id로 정리를 시도합니다.`
  );

  const failures: string[] = [];

  for (const entry of entries) {
    try {
      await deleteEntityByTable(registryPath, entry.table, entry.id);
    } catch (err) {
      failures.push(`${entry.table}:${entry.id} - ${(err as Error).message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`[${label}] 테스트 데이터 정리 실패:\n${failures.join("\n")}`);
  }
}
