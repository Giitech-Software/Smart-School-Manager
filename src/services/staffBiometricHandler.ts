// mobile/src/services/staffBiometricHandler.ts

import { registerStaffAttendance } from "./staffAttendance";

export type StaffBiometricMethod = "fingerprint" | "face";

export async function handleStaffBiometricCheck({
  staffId,
  mode,
  biometricVerified,
  method,
}: {
  staffId: string;
  mode: "in" | "out";
  biometricVerified: boolean;
  method: StaffBiometricMethod;
}) {
  /* ===============================
     VALIDATION
  =============================== */
  if (!biometricVerified) {
    throw new Error("Biometric verification failed.");
  }

  if (!staffId) {
    throw new Error("Staff identity could not be verified.");
  }

  /* ===============================
     REGISTER ATTENDANCE
  =============================== */
  return await registerStaffAttendance({
    staffId,
    mode,
    method, // ✅ now typed & compatible
    biometric: true,
  });
}
// In staffBiometricHandler.ts
export type Staff = {
  id: string;
  name: string;
  role: string;
  fingerprintId?: string | null;
};
