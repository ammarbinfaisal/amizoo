import { TRPCError } from "@trpc/server";
import { type } from "arktype";

import type {
  AttendanceRecords,
  Courses,
  ExamResultRecords,
  ExaminationSchedule,
  FillFacultyFeedbackResponse,
  Profile,
  ScheduledClasses,
  SemesterList,
  WifiInfo,
  WifiMacInfo,
} from "@/lib/types";

import { amizoneRequest } from "../../amizone-api";
import { CACHE_TTL, cached, invalidate } from "../../cache";
import { fromAmizone, protectedProcedure, router } from "../init";

/** Cache resource identifiers, kept in one place so reads and invalidations agree. */
const resource = {
  profile: "profile",
  attendance: "attendance",
  semesters: "semesters",
  courses: (ref?: string) => (ref ? `courses:${ref}` : "courses"),
  classSchedule: (date: string) => `class_schedule:${date}`,
  examSchedule: "exam_schedule",
  examResult: (ref?: string) => (ref ? `exam_result:${ref}` : "exam_result"),
  wifiMac: "wifi_mac",
  wifiInfo: "wifi_mac_address",
} as const;

const freshInput = type({ "fresh?": "boolean" });
const semesterInput = type({ "semesterRef?": "string", "fresh?": "boolean" });
const scheduleInput = type({ date: "string", "fresh?": "boolean" });
const macInput = type({ address: "string", "overrideLimit?": "boolean" });
const feedbackInput = type({
  rating: "number",
  queryRating: "number",
  comment: "string",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function classSchedulePath(date: string): string {
  if (!ISO_DATE.test(date)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "date must be formatted as YYYY-MM-DD",
    });
  }
  const [year, month, day] = date.split("-");
  return `/api/v1/class_schedule/${year}/${month}/${day}`;
}

export const amizoneRouter = router({
  profile: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<Profile>({
      username: ctx.session.username,
      resource: resource.profile,
      ttlSeconds: CACHE_TTL.profile,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest("/api/v1/user_profile", ctx.session)),
    })
  ),

  attendance: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<AttendanceRecords>({
      username: ctx.session.username,
      resource: resource.attendance,
      ttlSeconds: CACHE_TTL.attendance,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest("/api/v1/attendance", ctx.session)),
    })
  ),

  semesters: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<SemesterList>({
      username: ctx.session.username,
      resource: resource.semesters,
      ttlSeconds: CACHE_TTL.semesters,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest("/api/v1/semesters", ctx.session)),
    })
  ),

  courses: protectedProcedure.input(semesterInput).query(({ ctx, input }) => {
    const path = input.semesterRef
      ? `/api/v1/courses/${encodeURIComponent(input.semesterRef)}`
      : "/api/v1/courses";
    return cached<Courses>({
      username: ctx.session.username,
      resource: resource.courses(input.semesterRef),
      ttlSeconds: CACHE_TTL.courses,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest(path, ctx.session)),
    });
  }),

  classSchedule: protectedProcedure.input(scheduleInput).query(({ ctx, input }) => {
    const path = classSchedulePath(input.date);
    return cached<ScheduledClasses>({
      username: ctx.session.username,
      resource: resource.classSchedule(input.date),
      ttlSeconds: CACHE_TTL.classSchedule,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest(path, ctx.session)),
    });
  }),

  examSchedule: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<ExaminationSchedule>({
      username: ctx.session.username,
      resource: resource.examSchedule,
      ttlSeconds: CACHE_TTL.examSchedule,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest("/api/v1/exam_schedule", ctx.session)),
    })
  ),

  examResult: protectedProcedure.input(semesterInput).query(({ ctx, input }) => {
    const path = input.semesterRef
      ? `/api/v1/exam_result/${encodeURIComponent(input.semesterRef)}`
      : "/api/v1/exam_result";
    return cached<ExamResultRecords>({
      username: ctx.session.username,
      resource: resource.examResult(input.semesterRef),
      ttlSeconds: CACHE_TTL.examResult,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest(path, ctx.session)),
    });
  }),

  wifiMac: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<WifiMacInfo>({
      username: ctx.session.username,
      resource: resource.wifiMac,
      ttlSeconds: CACHE_TTL.wifiMac,
      fresh: input.fresh,
      load: () => fromAmizone(() => amizoneRequest("/api/v1/wifi_mac", ctx.session)),
    })
  ),

  /** Legacy shape — some go-amizone deployments only expose `{ macAddress }`. */
  wifiInfo: protectedProcedure.input(freshInput).query(({ ctx, input }) =>
    cached<WifiInfo>({
      username: ctx.session.username,
      resource: resource.wifiInfo,
      ttlSeconds: CACHE_TTL.wifiMac,
      fresh: input.fresh,
      load: () =>
        fromAmizone(() => amizoneRequest("/api/v1/wifi_mac_address", ctx.session)),
    })
  ),

  registerWifiMac: protectedProcedure
    .input(macInput)
    .mutation(async ({ ctx, input }) => {
      await fromAmizone(() =>
        amizoneRequest<void>("/api/v1/wifi_mac", ctx.session, {
          method: "POST",
          body: {
            address: input.address,
            overrideLimit: input.overrideLimit ?? false,
          },
        })
      );
      await invalidate(ctx.session.username, [resource.wifiMac, resource.wifiInfo]);
      return { success: true } as const;
    }),

  deregisterWifiMac: protectedProcedure
    .input(type({ address: "string" }))
    .mutation(async ({ ctx, input }) => {
      await fromAmizone(() =>
        amizoneRequest<void>(
          `/api/v1/wifi_mac/${encodeURIComponent(input.address)}`,
          ctx.session,
          { method: "DELETE" }
        )
      );
      await invalidate(ctx.session.username, [resource.wifiMac, resource.wifiInfo]);
      return { success: true } as const;
    }),

  submitFacultyFeedback: protectedProcedure
    .input(feedbackInput)
    .mutation(({ ctx, input }) =>
      fromAmizone(() =>
        amizoneRequest<FillFacultyFeedbackResponse>(
          "/api/v1/faculty/feedback/submit",
          ctx.session,
          { method: "POST", body: input }
        )
      )
    ),
});
