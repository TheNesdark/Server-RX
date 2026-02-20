import type { APIRoute } from "astro";
import { getStudyCommentEntry, getLocalStudyById } from "@/libs/db";
import { orthancFetch } from "@/libs/orthanc";
import type { DicomStudy } from "@/types";
import {
  createStudyCommentPdf,
  createUnauthorizedTextResponse,
  validateStudyAccess
} from "@/utils/server";
import { getStudyCommentPdfFileName } from "@/utils/client/study-comment";
import { 
  normalizeDicomText, 
  formatDicomDate, 
  formatPatientSex,
  calculateAge,
  formatDicomTime
} from "@/utils/client";

export const GET: APIRoute = async (context) => {
  const { params } = context;
  const studyId = params.studyId || "";

  // 1. Validar Acceso (Admin o Paciente)
  const { isAuthorized } = await validateStudyAccess(context, studyId);

  if (!isAuthorized) {
    return createUnauthorizedTextResponse();
  }

  // Intentar obtener desde la DB local primero
  let studyData = getLocalStudyById(studyId);

  if (!studyData) {
    try {
      const studyRes = await orthancFetch(`/studies/${studyId}`);
      studyData = await studyRes.json() as DicomStudy;
    } catch (e) {
      studyData = null as any;
    }
  }
  
  if (!studyData) {
    return new Response("No existe ese estudio", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const commentEntry = getStudyCommentEntry(studyId);
  
  const pdfBytes = await createStudyCommentPdf({
    patientName: normalizeDicomText(studyData.PatientMainDicomTags?.PatientName) || "Sin Nombre",
    patientId: studyData.PatientMainDicomTags?.PatientID || "N/A",
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
