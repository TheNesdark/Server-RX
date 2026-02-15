import { getSeriesByStudyId, getInstancesBySeriesId } from "@/libs/orthanc";
import type { ThumbnailInfo } from "@/types";

const createErrorSeries = (id: string): ThumbnailInfo => ({
  id,
  instances: [],
  previewUrl: "/no-image.svg",
  modality: "Error",
  bodyPart: "Error",
});

const fetchSeriesData = async (seriesId: string, viewport?: number): Promise<ThumbnailInfo> => {
  try {
    const { Instances = [], mainDicomTags } = await getInstancesBySeriesId(seriesId);
    const hasInstances = Instances.length > 0;

    const previewUrl = hasInstances 
      ? `/api/orthanc/instances/${Instances[0]}/preview${viewport ? `?viewport=${viewport}` : ""}`
      : "/no-image.svg";

    return {
      id: seriesId,
      instances: Instances,
      previewUrl,
      modality: mainDicomTags?.Modality ?? "N/A",
      bodyPart: mainDicomTags?.BodyPartExamined ?? "N/A",
    };
  } catch (error) {
    console.error(`[Viewer] Error cargando serie ${seriesId}:`, error);
    return createErrorSeries(seriesId);
  }
};

export async function getStudySeriesData(studyId: string, viewport?: number): Promise<ThumbnailInfo[]> {
  const seriesIds = await getSeriesByStudyId(studyId);
  const allSeries = await Promise.all(seriesIds.map((id: string) => fetchSeriesData(id, viewport)));
  return allSeries.filter((series) => series.instances && series.instances.length > 0);
}
