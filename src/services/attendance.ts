// mobile/src/services/attendance.ts

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { AttendanceRecord } from "./types";
import { getAttendanceSettings } from "./attendanceSettings";

const attendanceCollection = collection(db, "attendance");

/** Utility: today's date (YYYY-MM-DD) */
export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/**
 * Normalize attendance records so UI never breaks
 */
function normalizeAttendance(data: any): AttendanceRecord {
  let inferredType: "in" | "out" = "in";
  if (data.checkOutTime) inferredType = "out";

  return {
    ...data,
    type: data.type ?? inferredType,
    checkInTime: data.checkInTime ?? null,
    checkOutTime: data.checkOutTime ?? null,
    status: data.status ?? "present",
  } as AttendanceRecord;
}

/**
 * Late calculation helper
 */
function isLate(checkInIso: string, lateAfter: string): boolean {
  const checkIn = new Date(checkInIso);
  const [h, m] = lateAfter.split(":").map(Number);

  const lateTime = new Date(checkIn);
  lateTime.setHours(h, m, 0, 0);

  return checkIn > lateTime;
}

/**
 * CREATE or UPDATE attendance entry — UI SAFE
 */
export async function recordAttendance(
  record: Partial<AttendanceRecord> & {
    studentId: string;
    classId: string;
    type: "in" | "out";
    date: string;
    biometric?: boolean;
  }
): Promise<AttendanceRecord> {
  const now = new Date().toISOString();

  /* ===============================
     UPDATE EXISTING RECORD
  =============================== */
  if (record.id) {
    const { id, createdAt, ...updateFields } = record;

    if (record.type === "in" && !record.checkInTime) {
      updateFields.checkInTime = now;
      updateFields.type = "in";
    }

    if (record.type === "out") {
      updateFields.checkOutTime = now;
      updateFields.type = "out";
    }

    updateFields.biometric = record.biometric ?? false;

    const ref = doc(db, "attendance", id);
    await updateDoc(ref, updateFields);

    return normalizeAttendance({
      id: ref.id,
      ...updateFields,
    });
  }

  /* ===============================
     CREATE NEW CHECK-IN
  =============================== */
  const settings = await getAttendanceSettings();

  const status = isLate(now, settings.lateAfter)
    ? "late"
    : "present";

  const data = {
    ...record,
    createdAt: serverTimestamp(),
    biometric: record.biometric ?? false,
    type: "in",
    checkInTime: now,
    checkOutTime: null,
    status,
  };

  const ref = await addDoc(attendanceCollection, data);

  return normalizeAttendance({
    id: ref.id,
    ...data,
  });
}

/**
 * Find attendance for a specific student/class/date
 */
export async function findAttendance(
  studentId: string,
  classId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const q = query(
    attendanceCollection,
    where("studentId", "==", studentId),
    where("classId", "==", classId),
    where("date", "==", date)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return normalizeAttendance({
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as any),
  });
}

/**
 * Unified attendance registration
 */
export async function registerAttendanceUnified({
  studentId,
  classId,
  mode,
  biometric,
}: {
  studentId: string;
  classId: string;
  mode: "in" | "out";
  biometric?: boolean;
}): Promise<AttendanceRecord | void> {
  const date = todayISO();

// 🔒 GLOBAL DAILY GUARD (NEW — SAFE)
const anyToday = await findAnyAttendanceForStudentOnDate(studentId, date);

if (mode === "in" && anyToday) {
  throw new Error(
    "Student already checked-in today. Please check-out first."
  );
}

// ⬇️ EXISTING LOGIC (UNCHANGED)
const existing = await findAttendance(studentId, classId, date);


  if (!existing) {
    if (mode === "in") {
      return await recordAttendance({
        studentId,
        classId,
        type: "in",
        date,
        biometric: biometric === true,
      });
    }
    throw new Error("Student must check-in before checking-out.");
  }

  const rec = normalizeAttendance(existing);

  if (mode === "in" && rec.checkInTime) {
    throw new Error("Student already checked-in today.");
  }

  if (mode === "out") {
    if (rec.checkOutTime) {
      throw new Error("Student already checked-out today.");
    }

    return await recordAttendance({
      id: rec.id,
      studentId,
      classId,
      date,
      type: "out",
      checkInTime: rec.checkInTime,
      biometric: biometric === true,
    });
  }

  throw new Error("Student already checked-in today.");
}
/**
 * Find ANY attendance for a student on a date (regardless of class)
 * SAFE: read-only helper
 */
async function findAnyAttendanceForStudentOnDate(
  studentId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const q = query(
    attendanceCollection,
    where("studentId", "==", studentId),
    where("date", "==", date)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return normalizeAttendance({
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as any),
  });
}

/**
 * Get attendance for student
 */
export async function getAttendanceForStudent(
  studentId: string,
  date?: string
): Promise<AttendanceRecord[]> {
  const filters: any[] = [where("studentId", "==", studentId)];
  if (date) filters.push(where("date", "==", date));

  const q = query(attendanceCollection, ...filters);
  const snap = await getDocs(q);

  return snap.docs.map((d) =>
    normalizeAttendance({
      id: d.id,
      ...(d.data() as any),
    })
  );
}

/**
 * Get attendance for a date
 */
export async function getAttendanceForDate(
  dateIso: string
): Promise<AttendanceRecord[]> {
  const q = query(
    attendanceCollection,
    where("date", "==", dateIso),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) =>
    normalizeAttendance({
      id: d.id,
      ...(d.data() as any),
    })
  );
}
