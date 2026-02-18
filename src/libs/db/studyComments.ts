import db from "./base";
import type { SavedStudyCommentEntry, StudyCommentEntry, StudyCommentRow } from "@/types";

const selectStudyCommentStmt = db.prepare(`
  SELECT comment, updated_at
  FROM study_comments
  WHERE study_id = ?
`);

const upsertStudyCommentStmt = db.prepare(`
  INSERT INTO study_comments (study_id, comment, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(study_id) DO UPDATE SET
    comment = excluded.comment,
    updated_at = datetime('now')
`);

function toStudyCommentEntry(row?: StudyCommentRow): StudyCommentEntry {
  return {
    comment: row?.comment ?? "",
    updatedAt: row?.updated_at ?? null,
  };
}

export function getStudyCommentEntry(studyId: string): StudyCommentEntry {
  const row = selectStudyCommentStmt.get(studyId) as StudyCommentRow | undefined;
  return toStudyCommentEntry(row);
}

export function saveStudyComment(studyId: string, comment: string): SavedStudyCommentEntry {
  upsertStudyCommentStmt.run(studyId, comment);

  const row = selectStudyCommentStmt.get(studyId) as StudyCommentRow | undefined;
  if (!row) {
    return {
      comment: comment,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    comment: row.comment,
    updatedAt: row.updated_at,

  };
}