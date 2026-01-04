import type { AttendanceRecord } from "../types";

type TemplateParams = {
  title: string;
  studentName: string;
  classLabel: string;
  fromIso: string;
  toIso: string;
  summary: {
    presentCount: number;
    absentCount: number;
    lateCount: number;
    percentagePresent: number;
  };
  records: AttendanceRecord[];
};

export function studentAttendancePdfTemplate({
  title,
  studentName,
  classLabel,
  fromIso,
  toIso,
  summary,
  records,
}: TemplateParams) {
  const rowsHtml =
    records.length === 0
      ? `<tr><td colspan="5">No attendance records</td></tr>`
      : records
          .map((r, idx) => {
            const status =
              r.status ?? (r.checkInTime ? "present" : "absent");

            const checkIn = r.checkInTime
              ? new Date(r.checkInTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";

            const checkOut = r.checkOutTime
              ? new Date(r.checkOutTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";

            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${status}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
              </tr>
            `;
          })
          .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  padding: 24px;
}
h1 { text-align: center; }
.meta { text-align: center; font-size: 14px; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border: 1px solid #ddd; padding: 6px; text-align: center; }
th { background: #f3f4f6; }
</style>
</head>
<body>
<h1>${title}</h1>

<div class="meta">
  <div><strong>${studentName}</strong></div>
  <div><strong>Class:</strong> ${classLabel}</div>
  <div>${fromIso} → ${toIso}</div>
  <div>
    Present: ${summary.presentCount} |
    Absent: ${summary.absentCount} |
    Late: ${summary.lateCount} |
    Attendance: ${summary.percentagePresent.toFixed(1)}%
  </div>
</div>

<table>
<thead>
<tr>
  <th>#</th>
  <th>Date</th>
  <th>Status</th>
  <th>Check-in</th>
  <th>Check-out</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>
</table>
</body>
</html>
`;
} 
