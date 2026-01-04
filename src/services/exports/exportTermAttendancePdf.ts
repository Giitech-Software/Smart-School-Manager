import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { getAttendanceSummary } from "../attendanceSummary";
import { getTerm } from "../terms";
import { listWeeks } from "../weeks";
import { listClasses } from "../classes";

/* ---------------------------------------------
   Term Attendance PDF Export
---------------------------------------------- */

type ExportTermPdfOptions = {
  termId: string;
  classId?: string;
};

export async function exportTermAttendancePdf(
  opts: ExportTermPdfOptions
) {
  /* ---------------------------------------------
     Platform guard
  ---------------------------------------------- */
  if (Platform.OS === "web") {
    throw new Error(
      "PDF export is not supported on web. Please use the mobile app."
    );
  }

  /* ---------------------------------------------
     Load term
  ---------------------------------------------- */
  const term = await getTerm(opts.termId);

  if (!term) {
    throw new Error("Term not found");
  }

  /* ---------------------------------------------
     Resolve class name
  ---------------------------------------------- */
  let classLabel = "All Classes";

  if (opts.classId) {
    try {
      const classes = await listClasses();
      const match = classes.find(
        (c) => c.id === opts.classId || c.classId === opts.classId
      );
      if (match) classLabel = match.name;
    } catch (err) {
      console.warn("Failed to resolve class name", err);
    }
  }

  const title = "Term Attendance Report";
  const subtitle = `${term.name} (${term.startDate} → ${term.endDate})`;

  /* ---------------------------------------------
     Load weeks for term
  ---------------------------------------------- */
  const weeks = await listWeeks(term.id);

  if (!weeks || weeks.length === 0) {
    throw new Error("No weeks found for this term");
  }

  /* ---------------------------------------------
     Build weekly sections
  ---------------------------------------------- */
  let contentHtml = "";

  for (const week of weeks) {
    const summaries = await getAttendanceSummary({
      fromIso: week.startDate,
      toIso: week.endDate,
      classId: opts.classId,
      includeStudentName: true,
      scope: "weekly",
    });

    if (!summaries || summaries.length === 0) continue;

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

    contentHtml += `
      <h2>
        Week ${week.weekNumber}
        <span class="week-range">
          (${week.startDate} → ${week.endDate})
        </span>
      </h2>

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
    `;
  }

  if (!contentHtml) {
    throw new Error("No attendance data available for this term");
  }

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
    h2 {
      margin-top: 32px;
      margin-bottom: 8px;
      font-size: 16px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
    }
    .week-range {
      font-size: 12px;
      font-weight: normal;
      color: #666;
      margin-left: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 16px;
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
    @media print {
      h2 {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <div><strong>Class:</strong> ${classLabel}</div>
    <div>${subtitle}</div>
  </div>

  ${contentHtml}
</body>
</html>
`;

  /* ---------------------------------------------
     Generate PDF & Share
  ---------------------------------------------- */
  const result = await Print.printToFileAsync({ html });

  if (!result?.uri) {
    throw new Error("PDF export is not supported on web. Please use the mobile app.");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export Term Attendance PDF",
    UTI: "com.adobe.pdf",
  });
}
