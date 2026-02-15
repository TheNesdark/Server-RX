export interface StudyCommentRow {
  comment: string;
  updated_at: string;
}

export interface StudyCommentEntry {
  comment: string;
  updatedAt: string | null;
}

export interface SavedStudyCommentEntry {
  comment: string;
  updatedAt: string;
}

export interface StudyCommentPdfInput {
  patientName: string;
  patientId: string;
  patientSex: string;
  patientAge: string;
  studyDate: string;
  studyTime: string;
  institutionName?: string;
  receptionNo?: string;
  comment: string;
  updatedAt: string | null;
}
