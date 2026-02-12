import type { Study } from "./studies";

export interface UseStudiesProps {
  initialStudies: Study[];
  initialTotal: number;
  initialCurrentPage: number;
}
