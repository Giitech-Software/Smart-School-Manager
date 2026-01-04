// mobile/src/services/autoMarkAbsent.ts
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import { todayISO } from "./attendance";
import { getAttendanceSettings } from "./attendanceSettings";

/* -------------------------------------------------
   Metadata doc to prevent duplicate auto-runs
-------------------------------------------------- */
const META_REF = doc(db, "settings", "attendanceMeta");

/**
 * Check whether auto-mark already ran for a date
 */
async function hasAutoMarked(dateIso: string): Promise<boolean> {
  const snap = await getDoc(META_REF);
  if (!snap.exists()) return false;

  return snap.data()?.lastAutoMarkedDate === dateIso;
}

/**
 * Mark auto-mark as completed for a date
 */
async function setAutoMarked(dateIso: string, adminUid?: string) {
  await setDoc(
    META_REF,
    {
      lastAutoMarkedDate: dateIso,
      lastRunBy: adminUid ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* -------------------------------------------------
   CORE: Auto-mark ABSENT for ALL classes
-------------------------------------------------- */
export async function autoMarkAbsentAllClasses({
  dateIso = todayISO(),
  adminUid,
  force = false, // allow manual reruns
}: {
  dateIso?: string;
  adminUid?: string;
  force?: boolean;
}) {
  const settings = await getAttendanceSettings();

  /* --------------------------------
     Cutoff check (only for TODAY)
  -------------------------------- */
  if (!force && dateIso === todayISO()) {
    const now = new Date();
    const [h, m] = settings.lateAfter.split(":").map(Number);

    const cutoff = new Date();
    cutoff.setHours(h, m, 0, 0);

    if (now < cutoff) {
      console.warn("Auto-mark skipped: cutoff not reached");
      return;
    }
  }

  /* --------------------------------
     Prevent duplicate auto-runs
  -------------------------------- */
  if (!force && (await hasAutoMarked(dateIso))) {
    console.warn("Auto-mark already completed for", dateIso);
    return;
  }

  /* --------------------------------
     Load all classes
  -------------------------------- */
  const classesSnap = await getDocs(collection(db, "classes"));
  if (classesSnap.empty) return;

  /* --------------------------------
     Process each class
  -------------------------------- */
  for (const classDoc of classesSnap.docs) {
    const classId = classDoc.id;

    /* ---- students in class ---- */
    const studentsSnap = await getDocs(
      query(
        collection(db, "students"),
        where("classId", "==", classId)
      )
    );

    if (studentsSnap.empty) continue;

    /* ---- existing attendance ---- */
    const attendanceSnap = await getDocs(
      query(
        collection(db, "attendance"),
        where("classId", "==", classId),
        where("date", "==", dateIso)
      )
    );

    const presentStudentIds = new Set(
      attendanceSnap.docs.map((d) => d.data().studentId)
    );

    /* ---- mark absentees ---- */
    const writes: Promise<any>[] = [];

    studentsSnap.forEach((studentDoc) => {
      const studentId = studentDoc.id;

      // Skip students who already have attendance
      if (presentStudentIds.has(studentId)) return;

      writes.push(
        addDoc(collection(db, "attendance"), {
          studentId,
          classId,
          date: dateIso,
          type: "in",
          checkInTime: null,
          checkOutTime: null,
          biometric: false,
          status: "absent",
          autoMarked: true,
          createdAt: serverTimestamp(),
        })
      );
    });

    await Promise.all(writes);
  }

  /* --------------------------------
     Lock date (important)
  -------------------------------- */
  await setAutoMarked(dateIso, adminUid);
}
