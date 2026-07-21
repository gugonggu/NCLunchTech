import { useId } from "react";
import Form from "next/form";
import { FormField } from "@/components/ui/FormField";
import { RECENT_VISIT_WINDOW_DAYS, type RecommendConditions } from "@/lib/recommend/engine";
import { RADIUS_OPTIONS_M, RESTAURANT_CATEGORIES } from "@/lib/restaurants/constants";
import { RecommendationFilterSubmit } from "./RecommendationFilterSubmit";

const fieldClassName =
  "min-h-12 w-full rounded-control border border-line bg-surface px-4 py-3 text-ink disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted";

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-sm text-ink-muted">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-brand"
      />
      <span>{label}</span>
    </label>
  );
}

export function RecommendationFilters({
  idPrefix,
  conditions,
  radius,
  hasMenuData,
}: {
  idPrefix?: string;
  conditions: RecommendConditions;
  radius: number;
  hasMenuData: boolean;
}) {
  const generatedId = useId();
  const formId = idPrefix ?? generatedId;
  const unavailableHint = !hasMenuData
    ? "등록된 메뉴·가격 정보가 없어 현재 사용할 수 없습니다."
    : undefined;

  return (
    <Form action="/recommend" className="space-y-5">
      <FormField label="식당 이름" htmlFor={`${formId}-restaurant-name`}>
        <input
          id={`${formId}-restaurant-name`}
          type="text"
          name="q"
          defaultValue={conditions.restaurantName ?? ""}
          placeholder="식당 이름 검색"
          className={fieldClassName}
        />
      </FormField>

      <FormField label="메뉴 이름" htmlFor={`${formId}-menu-name`} hint={unavailableHint}>
        <input
          id={`${formId}-menu-name`}
          type="text"
          name="menuQ"
          defaultValue={conditions.menuName ?? ""}
          placeholder="메뉴 이름 검색"
          disabled={!hasMenuData}
          className={fieldClassName}
        />
      </FormField>

      <FormField label="음식 분류" htmlFor={`${formId}-category`}>
        <select
          id={`${formId}-category`}
          name="category"
          defaultValue={conditions.category ?? ""}
          className={fieldClassName}
        >
          <option value="">전체 분류</option>
          {RESTAURANT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="거리" htmlFor={`${formId}-radius`}>
        <select id={`${formId}-radius`} name="radius" defaultValue={String(radius)} className={fieldClassName}>
          {RADIUS_OPTIONS_M.map((option) => (
            <option key={option} value={option}>
              {option < 1000 ? `${option}m` : `${option / 1000}km`}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="희망 가격" htmlFor={`${formId}-max-price`} hint={unavailableHint}>
        <input
          id={`${formId}-max-price`}
          type="number"
          name="maxPrice"
          min={0}
          step={100}
          defaultValue={conditions.maxPriceWon ?? ""}
          placeholder="희망 가격(원) 이하"
          disabled={!hasMenuData}
          className={fieldClassName}
        />
      </FormField>

      <fieldset className="space-y-2 border-t border-line pt-5">
        <legend className="mb-3 text-sm font-semibold text-ink">제외 조건</legend>
        <CheckboxField
          name="excludeRecent"
          defaultChecked={conditions.excludeRecentVisits ?? false}
          label={`최근 방문 제외(최근 ${RECENT_VISIT_WINDOW_DAYS}일 이내 다녀온 식당 완전히 제외)`}
        />
        <CheckboxField
          name="excludeCongested"
          defaultChecked={conditions.excludeCongested ?? false}
          label="혼잡한 곳 제외(최근 혼잡 제보가 있는 식당 완전히 제외)"
        />
      </fieldset>

      <fieldset className="space-y-2 border-t border-line pt-5">
        <legend className="mb-2 text-sm font-semibold text-ink">우선 조건</legend>
        <p className="mb-3 text-xs text-ink-muted">
          아래 조건은 완전히 배제하지 않고 뽑힐 확률만 높여요(무작위성은 유지).
        </p>
        <CheckboxField
          name="preferFavorites"
          defaultChecked={conditions.preferFavorites ?? false}
          label="즐겨찾기 우선"
        />
        <CheckboxField
          name="preferGoodRating"
          defaultChecked={conditions.preferGoodRating ?? false}
          label="직원 평가 좋은 곳 우선"
        />
        <CheckboxField
          name="preferFast"
          defaultChecked={conditions.preferFast ?? false}
          label="빨리 나오는 곳 우선"
        />
        <CheckboxField
          name="preferUnvisited"
          defaultChecked={conditions.preferUnvisited ?? false}
          label="아직 가보지 않은 곳 우선"
        />
      </fieldset>

      <RecommendationFilterSubmit />
    </Form>
  );
}
