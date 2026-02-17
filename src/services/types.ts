// mobile/src/services/types.ts

export type Student = {
  id: string;
  shortId?: string;

  name?: string;
  rollNo?: string;

  studentId?: string; // display ID
  classId?: string;

  isActive?: boolean;
  classDocId?: string;

  // ✅ biometric fields (SAFE)
  faceEnrolledAt?: string | null;
  faceEmbedding?: number[];
  fingerprintId?: string;

  createdAt?: any;
  updatedAt?: any;
};

export type AttendanceRecord = {
  id?: string; // Firestore doc id

  studentId: string;
  classId?: string;

  date: string;               // YYYY-MM-DD
  type: "in" | "out";         // check-in or check-out

  checkInTime?: string;
  checkOutTime?: string | null;

  status?: "present" | "absent" | "late" | "excused";

  // ✅ FIXED + COMPLETE
  method?: "qr" | "fingerprint" | "face" | "manual";

  biometric?: boolean;

  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | string | number;
};

export type Term = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;

  isCurrent?: boolean;

  createdAt?: any;
  updatedAt?: any;
};

export type AdminLog = {
  id: string;
  actorUid: string;
  actorName?: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  description: string;
  metadata?: Record<string, any>;
  createdAt?: any;
};
export type AttendanceActor = "student" | "staff";

export interface Staff {
  id?: string;
  staffId?: string;     // human-readable ID
   userUid?: string; // 👈 new
  name: string;
  email: string;
  role?: string;        // teacher, admin, non-teaching, etc
  fingerprintId?: string;
  createdAt?: any;
  updatedAt?: any;
}
