import type { APIRoute } from "astro";
import { getStudyCommentEntry } from "@/libs/db/studyComments";
import { GetDNIbyStudyID, getStudyById } from "@/libs/orthanc";
import {
  createStudyCommentPdf,
  createUnauthorizedTextResponse,
} from "@/utils/server";
import { getStudyCommentPdfFileName } from "@/utils/client/study-comment";
import { 
  normalizeDicomText, 
  formatDicomDate, 
  formatPatientSex,
  calculateAge,
  formatDicomTime
} from "@/utils/client";

export const GET: APIRoute = async ({ params, cookies }) => {
  const studyId = params.studyId || "";

  const authCookieValue = cookies.get(`auth_lite_${studyId}`)?.value;
  if (!authCookieValue) {
    return createUnauthorizedTextResponse();
  }

  const studyData = await getStudyById(studyId);
  if (!studyData) {
    return new Response("No existe ese estudio", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const dni = studyData.PatientMainDicomTags?.PatientID || "";
  if (!dni || authCookieValue.trim() !== dni.trim()) {
    return createUnauthorizedTextResponse();
  }

  const commentEntry = getStudyCommentEntry(studyId);
  
  const pdfBytes = await createStudyCommentPdf({
    patientName: normalizeDicomText(studyData.PatientMainDicomTags?.PatientName) || "Sin Nombre",
    patientId: dni,
    patientSex: formatPatientSex(studyData.PatientMainDicomTags?.PatientSex),
    patientAge: calculateAge(studyData.PatientMainDicomTags?.PatientBirthDate),
    studyDate: formatDicomDate(studyData.MainDicomTags?.StudyDate),
    studyTime: formatDicomTime(studyData.MainDicomTags?.StudyTime),
    receptionNo: studyData.MainDicomTags?.AccessionNumber || studyData.MainDicomTags?.StudyID || "N/A",
    institutionName: studyData.MainDicomTags?.InstitutionName || "HOSPITAL LOCAL",
    comment: commentEntry.comment,
    updatedAt: commentEntry.updatedAt,
  });
  const pdfArrayBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfArrayBuffer).set(pdfBytes);

  return new Response(pdfArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${getStudyCommentPdfFileName(studyId)}\"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
