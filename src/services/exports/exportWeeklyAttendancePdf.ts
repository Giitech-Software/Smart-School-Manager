//mobile/src/services/exports/exportDailyAttendancePdf.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { getAttendanceSummary } from "../attendanceSummary";
import { listClasses } from "../classes";

/* ---------------------------------------------
   Weekly Attendance PDF Export
---------------------------------------------- */

export type ExportWeeklyPdfOptions = {
  fromIso: string;
  toIso: string;
  label: string;
  classId?: string;
};

export async function exportWeeklyAttendancePdf(
  opts: ExportWeeklyPdfOptions
) {
  /* ---------------------------------------------
     Platform guard (MATCHES MONTHLY)
  ---------------------------------------------- */
  if (Platform.OS === "web") {
    throw new Error(
      "PDF export is not supported on web. Please use the mobile app."
    );
  }

  const { fromIso, toIso, label, classId } = opts;

  /* ---------------------------------------------
     Resolve class name (optional)
  ---------------------------------------------- */
  let classLabel = "All Classes";

  if (classId) {
    try {
      const classes = await listClasses();
      const match = classes.find(
        (c) => c.id === classId || c.classId === classId
      );
      if (match) {
        classLabel = match.name;
      }
    } catch (err) {
      console.warn("Failed to resolve class name", err);
    }
  }

  const title = "Weekly Attendance Report";

  /* ---------------------------------------------
     Load summaries
  ---------------------------------------------- */
  const summaries = await getAttendanceSummary({
    fromIso,
    toIso,
    classId,
    includeStudentName: true,
    scope: "weekly",
  });

  if (!summaries || summaries.length === 0) {
    throw new Error("No attendance records found for this week");
  }

  /* ---------------------------------------------
     Build table rows
  ---------------------------------------------- */
  const rowsHtml = summaries
    .map(
      (s, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.studentName ?? s.studentId}</td>
          <td>${s.presentCount}</td>
          <td>${s.absentCount}</td>
          <td>${s.lateCount}</td>
          <td>${s.totalSessions}</td>
          <td>${s.percentagePresent.toFixed(1)}%</td>
        </tr>
      `
    )
    .join("");

  /* ---------------------------------------------
     HTML Template
  ---------------------------------------------- */
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      padding: 24px;
      color: #111;
    }
    h1 {
      text-align: center;
      margin-bottom: 4px;
    }
    .meta {
      text-align: center;
      margin-bottom: 24px;
      font-size: 14px;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: center;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <div><strong>Class:</strong> ${classLabel}</div>
    <div>${label}</div>
    <div>${fromIso} → ${toIso}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Student</th>
        <th>Present</th>
        <th>Absent</th>
        <th>Late</th>
        <th>Total</th>
        <th>%</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>
`;

  /* ---------------------------------------------
     Generate PDF
  ---------------------------------------------- */
  const result = await Print.printToFileAsync({ html });

  if (!result?.uri) {
    throw new Error("Failed to generate PDF file");
  }

  /* ---------------------------------------------
     Share PDF
  ---------------------------------------------- */
  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export Weekly Attendance PDF",
    UTI: "com.adobe.pdf",
  });
}
