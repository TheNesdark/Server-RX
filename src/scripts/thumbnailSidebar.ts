import { serieActivaId } from "../stores/dicomStore";

const toggleButton = document.querySelector(".sidebar-toggle");
const thumbnailsList = document.getElementById("thumbnails-list");
const sidebar = document.querySelector(".thumbnails-sidebar");
const firstThumbnail = document.querySelector('.thumbnail-item');

function selectSerie(thumbnailElement: Element | null) {
  if (!thumbnailElement) return;

  document.querySelectorAll(".thumbnail-item").forEach((el) => {
    el.classList.remove("active");
  });

  thumbnailElement.classList.add("active");

  const seriesId = thumbnailElement.getAttribute("data-id");
  if (seriesId) {
    serieActivaId.set(seriesId);
  }
}

thumbnailsList?.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement).closest(".thumbnail-item");
  selectSerie(target);
});

toggleButton?.addEventListener("click", () => {
  sidebar?.classList.toggle("collapsed");
});

selectSerie(firstThumbnail);