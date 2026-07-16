import fs from "node:fs";
import path from "node:path";

export interface RegistryEntry {
  table: string;
  id: string;
}

function resolvePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

function readRegistry(filePath: string): RegistryEntry[] {
  const abs = resolvePath(filePath);
  if (!fs.existsSync(abs)) return [];

  const raw = fs.readFileSync(abs, "utf8").trim();
  if (!raw) return [];

  return JSON.parse(raw) as RegistryEntry[];
}

function writeRegistry(filePath: string, entries: RegistryEntry[]): void {
  const abs = resolvePath(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(entries, null, 2));
}

/** 테스트가 실제로 생성한 정확한 id를 registry에 기록한다. */
export function recordEntity(filePath: string, table: string, id: string): void {
  const entries = readRegistry(filePath);
  entries.push({ table, id });
  writeRegistry(filePath, entries);
}

/** 개별 정리에 성공한 정확한 id만 registry에서 제거한다. */
export function clearEntity(filePath: string, table: string, id: string): void {
  const entries = readRegistry(filePath).filter((e) => !(e.table === table && e.id === id));
  writeRegistry(filePath, entries);
}

export function listEntities(filePath: string): RegistryEntry[] {
  return readRegistry(filePath);
}
