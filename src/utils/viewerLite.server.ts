import { getSeriesByStudyId, getInstancesBySeriesId } from "@/libs/orthanc";
import type { ThumbnailInfo } from "@/types";

const createErrorSeries = (id: string): ThumbnailInfo => ({
  id,
  instances: [],
  previewUrl: "/no-image.svg",
  modality: "Error",
  bodyPart: "Error",
});

const fetchSeriesData = async (seriesId: string): Promise<ThumbnailInfo> => {
  try {
    const { Instances = [], mainDicomTags } = await getInstancesBySeriesId(seriesId);
    const hasInstances = Instances.length > 0;

    return {
      id: seriesId,
      instances: Instances,
      previewUrl: hasInstances ? `/api/orthanc/instances/${Instances[0]}/preview` : "/no-image.svg",
      modality: mainDicomTags?.Modality ?? "N/A",
      bodyPart: mainDicomTags?.BodyPartExamined ?? "N/A",
    };
  } catch (error) {
    console.error(`[Viewer-Lite] Error cargando serie ${seriesId}:`, error);
    return createErrorSeries(seriesId);
  }
};

export async function getViewerLiteSeriesData(studyId: string): Promise<ThumbnailInfo[]> {
  const seriesIds = await getSeriesByStudyId(studyId);
  const allSeries = await Promise.all(seriesIds.map(fetchSeriesData));
  return allSeries.filter((series) => series.instances && series.instances.length > 0);
}
