import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

type BuildStudentPdfParams = {
  html: string;
  fileName: string;
};

export async function buildStudentAttendancePdf({
  html,
  fileName,
}: BuildStudentPdfParams) {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  const result = await Print.printToFileAsync({ html });

  if (!result?.uri) {
    throw new Error("Failed to generate PDF");
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: "application/pdf",
    dialogTitle: fileName,
    UTI: "com.adobe.pdf",
  });
}
