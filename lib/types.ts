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

export interface WifiInfo {
  macAddress: string;
}

export interface WifiMacInfo {
  addresses: string[];
  slots: number;
  freeSlots: number;
}

export interface Exam {
  course: CourseRef;
  date: string;
  time: string;
}

export interface ExamSchedule {
  exams: Exam[];
}

export interface ScheduledExam {
  course: CourseRef;
  time: string; // date-time
  mode: string;
  location?: string;
}

export interface ExaminationSchedule {
  title?: string;
  exams: ScheduledExam[];
}

export interface SemesterRef {
  semesterRef: string;
}

export interface Score {
  max: number;
  grade: string;
  gradePoint: number;
}

export interface Credits {
  acquired: number;
  effective: number;
  points: number;
}

export interface TypeDate {
  year: number;
  month: number;
  day: number;
}

export interface ExamResultRecord {
  course: CourseRef;
  score: Score;
  credits: Credits;
  publishDate?: TypeDate;
}

export interface OverallResult {
  semester: SemesterRef;
  semesterGradePointAverage: number;
  cumulativeGradePointAverage: number;
}

export interface ExamResultRecords {
  courseWise: ExamResultRecord[];
  overall: OverallResult[];
}

export interface FillFacultyFeedbackRequest {
  rating: number; // 1-5
  queryRating: number; // 1-3
  comment: string;
}

export interface FillFacultyFeedbackResponse {
  filledFor: number;
}
