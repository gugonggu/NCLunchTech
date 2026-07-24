import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

import { getRelevantAppointments } from "./queries";

describe("getRelevantAppointments", () => {
  it("keeps an active appointment created by the employee when the database null filter would omit it", async () => {
    let hostAttendanceWasFiltered = false;
    const hostedQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
    };
    hostedQuery.select.mockReturnValue(hostedQuery);
    hostedQuery.eq.mockReturnValue(hostedQuery);
    hostedQuery.is.mockImplementation(() => {
      hostAttendanceWasFiltered = true;
      return hostedQuery;
    });
    hostedQuery.order.mockImplementation(async () => ({
      data: hostAttendanceWasFiltered
        ? []
        : [
            {
              id: "appointment-1",
              scheduled_at: "2026-07-25T03:30:00.000Z",
              host_attendance_status: "pending",
              restaurants: { name: "테스트 식당" },
            },
          ],
    }));

    const expirationParticipantFilter = {
      eq: vi.fn().mockResolvedValue({ data: [] }),
    };
    const expirationParticipantsQuery = {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(expirationParticipantFilter) }),
    };
    const relevantParticipantsQuery = {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) }),
    };
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(expirationParticipantsQuery)
        .mockReturnValueOnce(hostedQuery)
        .mockReturnValueOnce(relevantParticipantsQuery),
    });

    await expect(getRelevantAppointments("employee-1", new Date("2026-07-24T00:00:00.000Z"))).resolves.toEqual([
      {
        id: "appointment-1",
        restaurantName: "테스트 식당",
        scheduledAt: "2026-07-25T03:30:00.000Z",
        role: "host",
        participantStatus: null,
        needsConfirmation: true,
      },
    ]);
  });

  it("hides a hosted appointment after the host confirms attendance", async () => {
    const hostedQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    hostedQuery.select.mockReturnValue(hostedQuery);
    hostedQuery.eq.mockReturnValue(hostedQuery);
    hostedQuery.order.mockResolvedValue({
      data: [
        {
          id: "appointment-1",
          scheduled_at: "2026-07-25T03:30:00.000Z",
          host_attendance_status: "completed",
          restaurants: { name: "테스트 식당" },
        },
      ],
    });

    const expirationParticipantFilter = {
      eq: vi.fn().mockResolvedValue({ data: [] }),
    };
    const expirationParticipantsQuery = {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(expirationParticipantFilter) }),
    };
    const relevantParticipantsQuery = {
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [] }) }) }),
    };
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce(expirationParticipantsQuery)
        .mockReturnValueOnce(hostedQuery)
        .mockReturnValueOnce(relevantParticipantsQuery),
    });

    await expect(getRelevantAppointments("employee-1", new Date("2026-07-24T00:00:00.000Z"))).resolves.toEqual([]);
  });
});
