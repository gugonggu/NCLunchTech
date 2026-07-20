"use server";

import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveEmployeesByNickname } from "@/lib/appointments/queries";
import { memoSchema, parseNicknameList, parseSeoulDateTimeLocal } from "@/lib/appointments/validation";
import { createNotification } from "@/lib/notifications/queries";
import { buildAppointmentInvitedMessage } from "@/lib/notifications/validation";
import { getPollDetail } from "@/lib/polls/queries";
import { isValidRestaurantPollBridge } from "@/lib/polls/validation";

function redirectToNewForm(restaurantId: string, status: string): never {
  redirect(`/appointments/new?restaurantId=${restaurantId}&status=${status}`);
}

export async function createAppointment(restaurantId: string, formData: FormData) {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent(`/appointments/new?restaurantId=${restaurantId}`)}`);
  }

  const supabase = createServiceRoleClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, is_active")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirectToNewForm(restaurantId, "not_found");
  }
  if (!restaurant.is_active) {
    redirectToNewForm(restaurantId, "inactive_restaurant");
  }

  const scheduledAt = parseSeoulDateTimeLocal(String(formData.get("scheduledAt") ?? ""));
  if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
    redirectToNewForm(restaurantId, "invalid_time");
  }

  const parsedMemo = memoSchema.safeParse(formData.get("memo"));
  if (!parsedMemo.success) {
    redirectToNewForm(restaurantId, "invalid_memo");
  }

  // 독립 식당 투표가 결정된 결과로 약속을 만드는 경우: 그 투표가 실제로 이 식당으로
  // 결정됐고 아직 다른 약속에 연결되지 않았는지 서버에서 재검증한다(주소창 조작 방지).
  const fromPollId = String(formData.get("fromPollId") ?? "").trim();
  if (fromPollId) {
    const linkedPoll = await getPollDetail(fromPollId, employee.id);
    const decidedOption = linkedPoll?.options.find((o) => o.id === linkedPoll.decidedOptionId);
    const isValidLink =
      !!linkedPoll &&
      isValidRestaurantPollBridge({
        pollType: linkedPoll.pollType,
        status: linkedPoll.status,
        appointmentId: linkedPoll.appointmentId,
        decidedOptionRestaurantId: decidedOption?.restaurantId,
        targetRestaurantId: restaurantId,
      });

    if (!isValidLink) {
      redirectToNewForm(restaurantId, "invalid_poll_link");
    }
  }

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      host_employee_id: employee.id,
      restaurant_id: restaurantId,
      scheduled_at: scheduledAt.toISOString(),
      memo: parsedMemo.data ?? null,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    throw new Error("약속 생성에 실패했습니다.");
  }

  if (fromPollId) {
    await supabase
      .from("polls")
      .update({ appointment_id: appointment.id })
      .eq("id", fromPollId)
      .is("appointment_id", null);
  }

  const nicknames = parseNicknameList(String(formData.get("participantNicknames") ?? ""));
  if (nicknames.length > 0) {
    const matchedEmployees = await resolveEmployeesByNickname(nicknames, employee.id);
    if (matchedEmployees.length > 0) {
      await supabase.from("appointment_participants").insert(
        matchedEmployees.map((e) => ({
          appointment_id: appointment.id,
          employee_id: e.id,
          status: "pending",
        }))
      );

      const message = buildAppointmentInvitedMessage(restaurant.name);
      await Promise.all(
        matchedEmployees.map((e) =>
          createNotification({
            employeeId: e.id,
            type: "appointment_invited",
            message,
            relatedAppointmentId: appointment.id,
          })
        )
      );
    }
  }

  redirect(`/appointments/${appointment.id}?status=created`);
}
