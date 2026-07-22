import "server-only";
import { getSeoulMonthRange } from "@/lib/leaderboard";
import { selectRestaurantOfTheMonth, type RestaurantOfTheMonth } from "@/lib/restaurant-of-the-month";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function getRestaurantOfTheMonth(now = new Date()): Promise<RestaurantOfTheMonth | null> {
  const supabase = createServiceRoleClient();
  const range = getSeoulMonthRange(now);
  const [restaurants, visits, hostedAppointments, participantRows, reviews] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase.from("restaurants").select("id, name, category, is_active").eq("is_active", true).range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("visits")
        .select("restaurant_id, visit_date")
        .eq("status", "completed")
        .gte("visit_date", range.startDate)
        .lt("visit_date", range.endDate)
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointments")
        .select("restaurant_id, scheduled_at")
        .eq("host_attendance_status", "completed")
        .gte("scheduled_at", range.start)
        .lt("scheduled_at", range.end)
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("appointment_participants")
        .select("appointments(restaurant_id, scheduled_at)")
        .eq("status", "completed")
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("reviews")
        .select("restaurant_id, taste_rating, created_at")
        .gte("created_at", range.start)
        .lt("created_at", range.end)
        .range(from, to)
    ),
  ]);

  const participantVisits = participantRows.flatMap((row) => {
    const appointment = row.appointments as unknown as { restaurant_id: string; scheduled_at: string } | null;
    return appointment ? [{ restaurantId: appointment.restaurant_id, occurredAt: appointment.scheduled_at }] : [];
  });

  return selectRestaurantOfTheMonth(
    restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      category: restaurant.category,
      isActive: restaurant.is_active,
    })),
    {
      visits: [
        ...visits.map((visit) => ({
          restaurantId: visit.restaurant_id,
          occurredAt: new Date(`${visit.visit_date}T12:00:00+09:00`).toISOString(),
        })),
        ...hostedAppointments.map((appointment) => ({ restaurantId: appointment.restaurant_id, occurredAt: appointment.scheduled_at })),
        ...participantVisits,
      ],
      reviews: reviews.map((review) => ({
        restaurantId: review.restaurant_id,
        tasteRating: review.taste_rating,
        occurredAt: review.created_at,
      })),
    },
    now
  );
}
