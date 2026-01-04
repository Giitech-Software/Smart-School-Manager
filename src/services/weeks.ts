// src/services/weeks.ts
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../../app/firebase";

/* =========================
   LIST WEEKS
========================= */
export async function listWeeks(termId?: string): Promise<any[]> {
  const ref = collection(db, "weeks");

  const q = termId
    ? query(ref, where("termId", "==", termId), orderBy("weekNumber"))
    : query(ref, orderBy("termId"), orderBy("weekNumber"));

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* =========================
   DELETE WEEKS FOR TERM
========================= */
async function deleteWeeksForTerm(termId: string) {
  const ref = collection(db, "weeks");
  const q = query(ref, where("termId", "==", termId));
  const snap = await getDocs(q);

  const deletions = snap.docs.map(d =>
    deleteDoc(d.ref)
  );

  await Promise.all(deletions);
}

/* =========================
   AUTO-GENERATE WEEKS
========================= */
export async function autoGenerateWeeksForTerm(
  termId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  // 1️⃣ Remove old weeks
  await deleteWeeksForTerm(termId);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new Error("Invalid term date range");
  }

  const ref = collection(db, "weeks");

  let current = new Date(start);
  let weekNumber = 1;
  let created = 0;

  while (current <= end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 4); // Mon–Fri

    if (weekEnd > end) {
      weekEnd.setTime(end.getTime());
    }

    await addDoc(ref, {
      termId,
      weekNumber,
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: weekEnd.toISOString().slice(0, 10),
      createdAt: new Date(),
    });

    created++;
    weekNumber++;
    current.setDate(current.getDate() + 7);
  }

  return created;
}
