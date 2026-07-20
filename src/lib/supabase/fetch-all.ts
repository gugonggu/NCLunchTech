import "server-only";

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Supabase(PostgREST) 프로젝트의 기본 최대 조회 행 수(보통 1,000건) 제한을 우회해
 * range()를 반복 호출하며 전체 행을 모은다. fetchPage(from, to)는 .range(from, to)를
 * 적용한 쿼리 결과를 반환해야 한다.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const results: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      break;
    }
    results.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return results;
}
