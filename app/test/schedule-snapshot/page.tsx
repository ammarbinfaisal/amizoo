"use client";

import { AmizoneScheduleSnapshot } from "@/components/AmizoneScheduleSnapshot";
import { ScheduleScreenshotButton } from "@/components/ScheduleScreenshotButton";
import { ScheduledClasses, AttendanceState } from "@/lib/types";

const MOCK_SCHEDULE: ScheduledClasses = {
  classes: [
    {
      course: { code: "CSE301", name: "Software Engineering" },
      startTime: "2026-02-13T09:15:00",
      endTime: "2026-02-13T10:10:00",
      faculty: "Dr Rajni Sehgal Kaushik[2434]",
      room: "E3-218",
      attendance: AttendanceState.PRESENT,
    },
    {
      course: { code: "PSYC160", name: "PSYC160 - The Dynamics of Happiness" },
      startTime: "2026-02-13T10:15:00",
      endTime: "2026-02-13T11:10:00",
      faculty: "Dr Gurpreet Singh Saini (311507)\nGroup/Sec - AIPS-PSYC160-J",
      room: "F1 - G 03",
      attendance: AttendanceState.PENDING,
    },
    {
      course: { code: "CSE302", name: "Artificial Intelligence" },
      startTime: "2026-02-13T11:15:00",
      endTime: "2026-02-13T12:10:00",
      faculty: "Dr Rashmi [307871],Dr Sanjay Kumar Dubey[2436]",
      room: "E3-218",
      attendance: AttendanceState.PENDING,
    },
    {
      course: { code: "EPS100", name: "Employability and Problem-Solving Skills for Engineers" },
      startTime: "2026-02-13T12:15:00",
      endTime: "2026-02-13T13:10:00",
      faculty: "Dr Anant Kumar Jayswal[6491],Dr Bhupendra Singh[5224],Mr Giri Ratan Gaur[316848]",
      room: "E3-218",
      attendance: AttendanceState.PENDING,
    },
    {
      course: { code: "CSE303", name: "Essentials of Cyber Security" },
      startTime: "2026-02-13T13:15:00",
      endTime: "2026-02-13T14:10:00",
      faculty: "Dr Aakanshi Gupta[307870],Dr Neha Tyagi[309816],Ms Vrinda Ghosh[315967]",
      room: "C 108",
      attendance: AttendanceState.PENDING,
    },
  ],
};

const MOCK_DATE = new Date(2026, 1, 13); // Feb 13, 2026

export default function ScheduleSnapshotTestPage() {
  return (
    <div style={{ width: 520, margin: "0 auto", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 12 }}>
        <ScheduleScreenshotButton date={MOCK_DATE} schedule={MOCK_SCHEDULE} />
      </div>
      <div data-testid="visible-schedule-snapshot">
        <AmizoneScheduleSnapshot date={MOCK_DATE} schedule={MOCK_SCHEDULE} />
      </div>
    </div>
  );
}

