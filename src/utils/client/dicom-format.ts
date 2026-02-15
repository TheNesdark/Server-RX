export const normalizeDicomText = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value
    .replace(/\^+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const formatDicomDate = (value?: string | null): string => {
  if (!value || !/^\d{8}$/.test(value)) {
    return "No disponible";
  }

  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
};

export const formatDicomTime = (value?: string | null): string => {
  if (!value || value.length < 4) return "";
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
};

export const calculateAge = (birthDate?: string | null): string => {
  if (!birthDate || !/^\d{8}$/.test(birthDate)) return "N/A";
  
  const year = parseInt(birthDate.slice(0, 4));
  const month = parseInt(birthDate.slice(4, 6)) - 1;
  const day = parseInt(birthDate.slice(6, 8));
  
  const today = new Date();
  const birth = new Date(year, month, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 0 ? `${age} años` : "N/A";
};

export const formatPatientSex = (value?: string | null): string => {
  const sex = (value || "").toUpperCase();
  switch (sex) {
    case "M":
      return "Masculino";
    case "F":
      return "Femenino";
    case "O":
      return "Otro";
    default:
      return sex || "No disponible";
  }
};