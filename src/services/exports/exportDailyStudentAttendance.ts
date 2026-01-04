import { exportStudentAttendancePdf } from "./exportStudentAttendancePdf";

export async function exportDailyStudentAttendance(
  studentId: string,
  dateIso: string
) {
  await exportStudentAttendancePdf({
    studentId,
    fromIso: dateIso,
    toIso: dateIso,
    title: "Daily Attendance Report",
  });
}







 