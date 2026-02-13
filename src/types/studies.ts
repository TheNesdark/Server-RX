export interface Study {
    id: string;
    patientName: string;
    patientId: string;
    patientSex: string;
    institutionName: string;
    studyDate: string;
    description: string;
    json_completo?: string;
}

export interface FormattedStudy {
    id: string;
    patientName: string;
    patientId: string;
    patientSex: string;
    studyDate: string;
    institution: string;
    modality: string;
}

export interface StudiesListProps {
    total: number;
    studies: Study[];
    currentPage: number;
}

export interface ThumbnailInfo {
    id: string;
    previewUrl: string;
    modality: string;
    bodyPart: string;
    instances?: string[];
}

export interface DicomStudy {
    ID: string;
    Series?: string[];
    PatientMainDicomTags?: {
        PatientName?: string;
        PatientID?: string;
        PatientSex?: string;
    };
    MainDicomTags?: {
        StudyDate?: string;
        StudyDescription?: string;
        AccessionNumber?: string;
        StudyID?: string;
        ModalitiesInStudy?: string;
        InstitutionName?: string;
    };
}

export interface PaginatedStudiesResult {
    studies: DicomStudy[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
