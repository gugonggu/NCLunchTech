import { z } from "zod";

export const monthlyLeaderboardMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .transform((month) => `${month}-01`);
