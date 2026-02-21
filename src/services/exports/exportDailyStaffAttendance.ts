// mobile/src/services/exports/exportDailyStaffAttendance.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getAllStaffAttendanceInRange, getStaffAttendanceInRange } from "../staffAttendanceSummary";

/* ------------------------------------------------------------------
   Helpers for generating table rows & styles
------------------------------------------------------------------- */
export const staffTableStyles = `
  body { font-family: Arial, sans-serif; padding: 16px; }
  h1 { text-align: center; margin-bottom: 12px; }
  .meta { margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 8px; text-align: center; }
  th { background-color: #f0f0f0; }
  .present { color: #059669; font-weight: bold; }
  .late { color: #B45309; font-weight: bold; }
  .absent { color: #DC2626; font-weight: bold; }
  .percent { font-weight: bold; }
`;

/* ------------------------------------------------------------------
   Build table rows HTML
------------------------------------------------------------------- */
function generateStaffRows(rows: any[]) {
  return rows
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.name}${r.staffId ? ` (${r.staffId})` : ""}</td>
      <td class="present">${r.presentCount}</td>
      <td class="late">${r.lateCount}</td>
      <td class="absent">${r.absentCount}</td>
      <td class="percent">${r.percentagePresent.toFixed(1)}%</td>
    </tr>
  `
    )
    .join("");
}

/* ------------------------------------------------------------------
   Export function
------------------------------------------------------------------- */
export type ExportDailyStaffPdfOptions = {
  dateIso: string;
};

export async function exportDailyStaffAttendance(opts: ExportDailyStaffPdfOptions) {
  if (Platform.OS === "web") {
    throw new Error(
      "PDF export is not supported on web. Please use the mobile app."
    );
  }

  const { dateIso } = opts;

  // Fetch all staff attendance for the selected day


// With this:
const summaries = await getAllStaffAttendanceInRange(dateIso, dateIso);

  if (!summaries || summaries.length === 0) {
    throw new Error("No staff attendance records found for this day");
  }

  // Build HTML table rows
  const rowsHtml = generateStaffRows(summaries);

  // Full HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${staffTableStyles}
  </style>
</head>
<body>
  <h1>Daily Staff Attendance Report</h1>
  <div class="meta">
    <div><strong>Date:</strong> ${dateIso}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Staff</th>
        <th class="present">Present</th>
        <th class="late">Late</th>
        <th class="absent">Absent</th>
        <th class="percent">%</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>
  `;

  // Generate PDF
  const result = await Print.printToFileAsync({ html });

  if (!result?.uri) {
    throw new Error("Failed to generate PDF file");
  }

  // Share PDF
  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export Daily Staff Attendance PDF",
    UTI: "com.adobe.pdf",
  });
}
