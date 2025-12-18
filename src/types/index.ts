export interface Study {
    id: string;
    patient_name: string;
    patient_id: string;
    patient_sex: string;
    institution_name: string;
    study_date: string;
    description: string;
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