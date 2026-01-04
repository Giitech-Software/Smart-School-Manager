import { db } from "../../app/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import type { Term } from "./types";

const col = collection(db, "terms");

/* =========================
   LIST TERMS
========================= */
export async function listTerms(): Promise<Term[]> {
  const snap = await getDocs(col);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Term, "id">),
  }));
}

/* =========================
   GET SINGLE TERM
========================= */
export async function getTerm(id: string): Promise<Term> {
  const ref = doc(db, "terms", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Term not found");
  }

  return {
    id: snap.id,
    ...(snap.data() as Omit<Term, "id">),
  };
}

/* =========================
   CREATE TERM (✅ RETURNS ID)
========================= */
export async function createTerm(
  data: Omit<Term, "id">
): Promise<{ id: string }> {
  const ref = await addDoc(col, {
    ...data,
    createdAt: new Date(),
  });

  return { id: ref.id };
}

/* =========================
   UPDATE TERM
========================= */
export async function updateTerm(
  id: string,
  data: Omit<Term, "id">
) {
  const ref = doc(db, "terms", id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date(),
  });
}

/* =========================
   DELETE TERM
========================= */
export async function deleteTerm(id: string) {
  const ref = doc(db, "terms", id);
  await deleteDoc(ref);
}
