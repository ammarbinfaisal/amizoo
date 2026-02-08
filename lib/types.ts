export interface CourseRef {
  code: string;
  name: string;
}

export interface Attendance {
  attended: number;
  held: number;
}

export interface Marks {
  have: number;
  max: number;
}

export interface AttendanceRecord {
  attendance: Attendance;
  course: CourseRef;
}

export interface AttendanceRecords {
  records: AttendanceRecord[];
}

export interface ScheduledClass {
  course: CourseRef;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  faculty: string;
  room: string;
  attendance: AttendanceState;
}

export enum AttendanceState {
  PENDING = "PENDING",
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  NA = "NA",
  INVALID = "INVALID",
}

export interface ScheduledClasses {
  classes: ScheduledClass[];
}

export interface Profile {
  name: string;
  enrollmentNumber: string;
  enrollmentValidity: string;
  batch: string;
  program: string;
  dateOfBirth: string;
  bloodGroup: string;
  idCardNumber: string;
  uuid: string;
}

export interface Semester {
  name: string;
  ref: string;
}

export interface SemesterList {
  semesters: Semester[];
}

export interface Course {
  ref: CourseRef;
  type: string;
  attendance: Attendance;
  internalMarks: Marks;
  syllabusDoc: string;
}

export interface Courses {
  courses: Course[];
}
