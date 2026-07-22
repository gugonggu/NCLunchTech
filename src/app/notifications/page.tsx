import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/session";
import { getNotifications, markAllNotificationsRead } from "@/lib/notifications/queries";
import { GradientBackdrop, GRADIENT_TEXT } from "@/components/ui/GradientBackdrop";

const displayFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotificationsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    redirect(`/login?returnTo=${encodeURIComponent("/notifications")}`);
  }

  const notifications = await getNotifications(employee.id);
  await markAllNotificationsRead(employee.id);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-hidden px-6 py-8">
      <GradientBackdrop />
      <Link href="/" className="text-sm text-ink-muted">
        ← 홈으로
      </Link>

      <h1 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${GRADIENT_TEXT}`}>알림</h1>

      {notifications.length === 0 ? (
        <p className="text-sm text-ink-muted">아직 알림이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id} className="rounded-card bg-surface px-4 py-3 shadow-card">
              {n.relatedAppointmentId || n.relatedRestaurantId ? (
                <Link
                  href={
                    n.relatedAppointmentId
                      ? `/appointments/${n.relatedAppointmentId}`
                      : `/restaurants/${n.relatedRestaurantId}`
                  }
                  className="block transition active:scale-[0.98]"
                >
                  <p className="text-sm text-ink">{n.message}</p>
                  <p className="mt-1 text-xs tabular-nums text-ink-muted">{displayFormatter.format(new Date(n.createdAt))}</p>
                </Link>
              ) : (
                <>
                  <p className="text-sm text-ink">{n.message}</p>
                  <p className="mt-1 text-xs tabular-nums text-ink-muted">{displayFormatter.format(new Date(n.createdAt))}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
