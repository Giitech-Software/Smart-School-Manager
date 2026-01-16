// src/services/attendanceSummary.ts

import { query, where, getDocs, collection, getDoc, doc } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { AttendanceRecord } from "./types";

const attendanceCollection = collection(db, "attendance");
const studentsCollection = collection(db, "students");

export type AttendanceSummary = {
  studentId: string;

  presentCount: number;
  lateCount: number;
  absentCount: number;

  attendedSessions: number;   // present + late  ✅ NEW (UI “Total”)
  totalSchoolDays: number;    // present + late + absent (denominator)

  percentagePresent: number; // 0..100
};


export type GetAttendanceSummaryOptions = {
  days?: number;              // Default: last 5 school days
  fromIso?: string;           // Explicit YYYY-MM-DD
  toIso?: string;             // Explicit YYYY-MM-DD
  classId?: string;           // Filter by class (short classId OR class document id OR classDocId)
  includeStudentName?: boolean;
  studentId?: string;
  scope?: AttendanceScope; // ✅ added
};

/* -------------------------------------------------------------------------- */
/* Utility */
/* -------------------------------------------------------------------------- */

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
/** Normalize ISO date to "YYYY-MM-DD" */
function normalizeIsoDate(d?: string) {
  if (!d) return "";
  return d.length > 10 ? d.slice(0, 10) : d;
}

/** Returns the last N **school days** (Mon-Fri) */
function getLastNSchoolDays(n: number, today = new Date()): string[] {
  const result: string[] = [];
  let cursor = new Date(today);

  while (result.length < n) {
    const dow = cursor.getDay(); // 1–5 = Mon–Fri
    if (dow >= 1 && dow <= 5) {
      result.push(toIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return result.reverse();
}

/* -------------------------------------------------------------------------- */
/* RANGE → STUDENT RECORD FETCH */
/* -------------------------------------------------------------------------- */

export async function getAttendanceForStudentInRange(
  studentId: string,
  fromIso: string,
  toIso: string
): Promise<AttendanceRecord[]> {
  try {
    if (!studentId) return [];

    if (!fromIso || !toIso) {
      console.warn("getAttendanceForStudentInRange: date range missing", { fromIso, toIso });
      return [];
    }

   const from = normalizeIsoDate(fromIso);
const to = normalizeIsoDate(toIso);

// 🔍 TEMP DEBUG — safe to remove later
console.log("Normalized range", { from, to });

const q = query(
  attendanceCollection,
  where("studentId", "==", studentId),
  where("date", ">=", from),
  where("date", "<=", to)
);


    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as AttendanceRecord[];
  } catch (err) {
    console.error("getAttendanceForStudentInRange:", err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* COMPUTE SUMMARY FOR A SINGLE STUDENT */
/* -------------------------------------------------------------------------- */
export type AttendanceScope =
  | "daily"
  | "weekly"
  | "monthly"
  | "termly";

export async function computeAttendanceSummaryForStudent(
  studentId: string,
  fromIso: string,
  toIso: string
): Promise<AttendanceSummary> {
  const records = await getAttendanceForStudentInRange(studentId, fromIso, toIso);
console.log("Attendance range", { studentId, fromIso, toIso });

  let present = 0;
  let absent = 0;
  let late = 0;

  for (const r of records) {
    const s = r.status ?? (r.checkInTime ? "present" : "absent");
    if (s === "present") present++;
    else if (s === "absent") absent++;
    else if (s === "late") late++;
    console.log("Record date", r.date);
 
  }

  const totalSchoolDays = present + late + absent;
const attendedSessions = present + late;

const score = present + late * 0.5;

const percentage =
  totalSchoolDays === 0
    ? 0
    : Number(((score / totalSchoolDays) * 100).toFixed(2));

  return {
  studentId,
  presentCount: present,
  lateCount: late,
  absentCount: absent,

  attendedSessions,
  totalSchoolDays,

  percentagePresent: percentage,
};


}

/* -------------------------------------------------------------------------- */
/* COMPUTE SUMMARY FOR AN ENTIRE CLASS */
/* -------------------------------------------------------------------------- */

export async function computeClassSummary(
  classId: string,
  fromIso: string,
  toIso: string
): Promise<AttendanceSummary[]> {
  try {
    const q = query(
      attendanceCollection,
      where("classId", "==", classId),
      where("date", ">=", fromIso),
      where("date", "<=", toIso)
    );

    const snap = await getDocs(q);

    const byStudent = new Map<string, AttendanceRecord[]>();

    for (const d of snap.docs) {
      const rec = { id: d.id, ...(d.data() as any) } as AttendanceRecord;
      const arr = byStudent.get(rec.studentId) ?? [];
      arr.push(rec);
      byStudent.set(rec.studentId, arr);
    }

    const out: AttendanceSummary[] = [];

    for (const [studentId, recs] of byStudent.entries()) {
      let present = 0;
      let absent = 0;
      let late = 0;

      for (const r of recs) {
        const s = r.status ?? (r.checkInTime ? "present" : "absent");
        if (s === "present") present++;
        else if (s === "absent") absent++;
        else if (s === "late") late++;
      }

    const totalSchoolDays = present + late + absent;
const attendedSessions = present + late;

const score = present + late * 0.5;

const percentage =
  totalSchoolDays === 0
    ? 0
    : Number(((score / totalSchoolDays) * 100).toFixed(2));


           out.push({
  studentId,
  presentCount: present,
  lateCount: late,
  absentCount: absent,

  attendedSessions,
  totalSchoolDays,

  percentagePresent: percentage,
});

    }

    return out;
  } catch (err) {
    console.error("computeClassSummary:", err);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* HIGH-LEVEL SUMMARY → USED BY DAILY, WEEKLY, TERMLY */
/* -------------------------------------------------------------------------- */

export async function getAttendanceSummary(
  opts: GetAttendanceSummaryOptions = {}
): Promise<(AttendanceSummary & { studentName?: string })[]> {
  const days = opts.days ?? 5;

  let fromIso = "";
  let toIso = "";

  if (opts.fromIso && opts.toIso) {
    fromIso = opts.fromIso;
    toIso = opts.toIso;
  } else {
    const range = getLastNSchoolDays(days);
    if (!range || range.length === 0) {
      console.warn("getAttendanceSummary: failed to generate default date range");
      return [];
    }
    fromIso = range[0];
    toIso = range[range.length - 1];
  }

  try {
    /* -------------------------------------------- */
    /* STEP 1: Load students (with optional classId) */
    /* -------------------------------------------- */
    const studentSnap = await getDocs(studentsCollection);

    let students = studentSnap.docs.map((docx) => ({
      id: docx.id,
      ...(docx.data() as any),
    }));

    // If a classId filter is provided, support:
    // - classId stored on student doc (short class id)
    // - classDocId stored on student doc (reference to classes doc id)
    // - classId passed might actually be a class document id; try match against classDocId too
    if (opts.classId) {
      const filterId = opts.classId;
      students = students.filter((s) =>
        s.classId === filterId || s.classDocId === filterId || s.classDocId === String(filterId)
      );
    }

    // If there are no students after filtering, return empty (caller can show "no students")
    if (students.length === 0) return [];

    /* -------------------------------------------- */
    /* STEP 2: Compute summary for each student      */
    /* -------------------------------------------- */
    // Parallelise summaries for speed
    const summaries = await Promise.all(
      students.map(async (student) => {
        const summary = await computeAttendanceSummaryForStudent(student.id, fromIso, toIso);
        // pick the best available student name
        const studentName =
          opts.includeStudentName
            ? student.name ?? student.displayName ?? student.rollNo ?? student.shortId ?? student.id
            : undefined;
        return { ...summary, studentName };
      })
    );

    // Sort by highest attendance
    summaries.sort((a, b) => b.percentagePresent - a.percentagePresent);

    // Attach date range for UI convenience (non-enumerable-ish but accessible)
    (summaries as any).__fromIso = fromIso;
    (summaries as any).__toIso = toIso;

    return summaries;
  } catch (err) {
    console.error("getAttendanceSummary:", err);
    return [];
  }
}
