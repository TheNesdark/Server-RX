const MAX_COMMENT_LENGTH = 2000;

export const sanitizeStudyComment = (value: string): string => {
  return value.slice(0, MAX_COMMENT_LENGTH);
};

export const getStudyCommentPdfFileName = (studyId: string): string => {
  const safeStudyId = studyId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `comentario-estudio-${safeStudyId}.pdf`;
};