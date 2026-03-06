// mobile/src/services/faceService.ts

/* =========================================================
   🔐 Production Rekognition Collection Integration
   Uses Firebase Functions v2 (Secrets enabled)
========================================================= */

const PROJECT_ID = "astem-student-register"; // your Firebase project ID
const REGION = "us-central1"; // must match deployed functions region

const INDEX_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/indexStaffFace`;
const SEARCH_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/searchStaffFace`;
const DELETE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/deleteStaffFace`;

async function readError(response: Response, fallback: string) {
  let details = "";
  try {
    const data = await response.json();
    if (data?.details) details = String(data.details);
    else if (data?.error) details = String(data.error);
    else details = JSON.stringify(data);
  } catch {
    details = await response.text();
  }

  const suffix = details ? `: ${details}` : "";
  return `${fallback} (${response.status})${suffix}`;
}

/* =========================================================
   1️⃣ Index Staff Face (Registration)
========================================================= */
export async function indexFace(
  staffId: string,
  base64Image: string
) {
  const response = await fetch(INDEX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
      base64Image,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Index failed"));
  }

  return await response.json();
}

/* =========================================================
   2️⃣ Search Staff Face (Check-in)
========================================================= */
export async function searchFace(base64Image: string) {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64Image,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Search failed"));
  }

  return await response.json();
}

/* =========================================================
   3️⃣ Delete Staff Face (Optional cleanup)
========================================================= */
export async function deleteFace(faceId: string) {
  const response = await fetch(DELETE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faceId,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Delete failed"));
  }

  return await response.json();
}
