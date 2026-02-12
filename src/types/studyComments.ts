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
