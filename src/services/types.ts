// mobile/src/services/types.ts

export type Student = {
  id: string;
  shortId?: string;

  name?: string; 
  rollNo?: string;

   studentId?: string;      // ✅ NEW (display ID) 
  /** Short class identifier (slug like "business-management") */
  classId?: string;

  /** Firestore document id of class (authoritative) */
  classDocId?: string;

  fingerprintId?: string;

  createdAt?: any;
  updatedAt?: any;
};
 

export type AttendanceRecord = {
  id?: string; // Firestore doc id
  studentId: string;
  classId?: string;
  
  date: string;                     // ISO date (YYYY-MM-DD)
  type: "in" | "out";               // check-in or check-out

  checkInTime?: string;             // ISO datetime
  checkOutTime?: string | null;     // allow null to fix TS error

  status?: "present" | "absent" | "late" | "excused";
  method?: "qr" | "fingerprint" | "manual";

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

  /** 🔑 marks the active academic term */
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
