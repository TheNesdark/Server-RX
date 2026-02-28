import { orthancFetch } from "@/libs/orthanc";
import { getLocalStudyById, getLocalSeriesById } from "@/libs/db";
import type { ThumbnailInfo } from "@/types";
import { logOrthancError } from "./http-responses";

const createErrorSeries = (id: string): ThumbnailInfo => ({
  id,
  instances: [],
  previewUrl: "/no-image.svg",
  modality: "Error",
  bodyPart: "Error",
});

const fetchSeriesData = async (seriesId: string, viewport?: number): Promise<ThumbnailInfo> => {
  try {
    // Intentar obtener de la DB local primero
    let data = getLocalSeriesById(seriesId);

    if (!data) {
      const response = await orthancFetch(`/series/${seriesId}`);
      data = await response.json();
    }

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
    logOrthancError(error, `cargando serie ${seriesId}`);
    return createErrorSeries(seriesId);
  }
};

export async function getStudySeriesData(studyId: string, viewport?: number): Promise<ThumbnailInfo[]> {
  let data = getLocalStudyById(studyId);

  if (!data) {
    const response = await orthancFetch(`/studies/${studyId}`);
    data = await response.json();
  }

  const seriesIds: string[] = data?.Series || [];
  
  const allSeries = await Promise.all(seriesIds.map((id: string) => fetchSeriesData(id, viewport)));
  return allSeries.filter((series) => series.instances && series.instances.length > 0);
}
