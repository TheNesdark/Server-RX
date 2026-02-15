export const isValidStudyId = (value: string | null | undefined): value is string => {
  return Boolean(value);
};