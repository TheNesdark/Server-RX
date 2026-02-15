import { orthancFetch } from "@/libs/orthanc";
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
    const response = await orthancFetch(`/series/${seriesId}`);
    const data = await response.json();
    const Instances = data.Instances || [];
    const mainDicomTags = data.MainDicomTags || {};
    
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
  const response = await orthancFetch(`/studies/${studyId}`);
  const data = await response.json();
  const seriesIds = data.Series || [];
  
  const allSeries = await Promise.all(seriesIds.map((id: string) => fetchSeriesData(id, viewport)));
  return allSeries.filter((series) => series.instances && series.instances.length > 0);
}
