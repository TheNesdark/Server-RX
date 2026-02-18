import { activeSeriesId } from "@/stores/dicomStore";
import type { LiteSeriesMetadata } from "@/types";

const getSeriesMetadata = (): LiteSeriesMetadata[] => {
  const metadataElement = document.getElementById("series-metadata");
  const rawData = metadataElement?.dataset.series;

  if (!rawData) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? (parsed as LiteSeriesMetadata[]) : [];
  } catch (error) {
    console.error("[Viewer-Lite] Error parseando metadata de series:", error);
    return [];
  }
};

const updateRenderedImage = async (
  instanceId: string,
  renderedImage: HTMLImageElement,
  loader: HTMLElement | null,
) => {
  if (!instanceId) {
    return;
  }

  renderedImage.style.display = "none";
  if (loader) loader.style.display = "flex";

  const nextUrl = `/api/orthanc/instances/${instanceId}/rendered?quality=90`;
  const imagePreloader = new Image();

  imagePreloader.onload = () => {
    renderedImage.src = nextUrl;
    if (loader) loader.style.display = "none";
    renderedImage.style.display = "block";
  };

  imagePreloader.onerror = () => {
    console.error("[Viewer-Lite] Error cargando imagen renderizada");
    if (loader) loader.style.display = "none";
  };

  imagePreloader.src = nextUrl;
};

export const initViewerLite = () => {
  const renderedImage = document.getElementById("renderedImage");
  if (!(renderedImage instanceof HTMLImageElement)) {
    return;
  }

  const loader = document.getElementById("loader");
  const seriesData = getSeriesMetadata();

  activeSeriesId.subscribe((id: string | null) => {
    if (!id) {
      return;
    }

    const selectedSeries = seriesData.find((series) => series.id === id);
    const firstInstance = selectedSeries?.instances?.[0];

    if (firstInstance) {
      void updateRenderedImage(firstInstance, renderedImage, loader);
    }
  });

  if (seriesData.length > 0 && !activeSeriesId.get()) {
    activeSeriesId.set(seriesData[0].id);
  }
};
