import { useStudies } from '@/hooks/useStudies';
import type { StudiesListProps, FormattedStudy } from '@/types';
import styles from '@/styles/StudiesList.module.css';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const ActionButton = ({ onClick, label, icon: Icon, children }: { onClick: () => void; label: string; icon: any; children: preact.ComponentChildren }) => (
  <button className={styles.actionBtn} onClick={onClick} aria-label={label}>
    <Icon />
    {children}
  </button>
);

function getModalityClass(modality?: string): string {
  const m = (modality || '').toString();
  const slug = m.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default';
  // TypeScript no puede inferir clases CSS dinámicas, pero podemos acceder de forma segura
  const stylesRecord = styles as Record<string, string>;
  return stylesRecord[`modality-${slug}`] ?? stylesRecord['modality-default'] ?? '';
}

const StudyRow = ({ study, index }: { study: FormattedStudy; index: number }) => {
  const modalityClass = getModalityClass(study.modality);
  return (
    <tr key={study.id} className={styles.studyRow} style={{ "--delay": `${index * 0.04}s` }}>
      <td className={styles.colId}><code className={styles.idCode}>{study.patientId}</code></td>
      <td className={styles.colPatient}><span className={styles.patientName}>{study.patientName}</span></td>
      <td className={styles.colSex}>{study.patientSex}</td>
      <td className={styles.colInstitution}>{study.institution}</td>
      <td className={styles.colDate}>{study.studyDate}</td>
      <td className={styles.colModality}>
        <span className={`${styles.modalityChip} ${modalityClass}`}>
          {study.modality}
        </span>
      </td>
      <td className={styles.colActions}>
        <div className={styles.actionButtonsContainer}>
          <ActionButton 
            onClick={() => window.open(`/viewer/${study.id}`, '_blank')}
            label={`Ver estudio de ${study.patientName}`}
            icon={EyeIcon}
          >
            Ver
          </ActionButton>
          <ActionButton 
            onClick={() => window.open(`/reports/${study.id}`, '_blank')}
            label={`Ver reporte de ${study.patientName}`}
            icon={FileTextIcon}
          >
            Reporte
          </ActionButton>
        </div>
      </td>
    </tr>
  );
};

export default function StudiesList({ total: initialTotal, studies: initialStudies, currentPage: initialCurrentPage = 1 }: StudiesListProps) {
  const {
    searchTerm,
    total,
    currentPage,
    totalPages,
    formattedStudies,
    handleSearchChange,
    handleNextPage,
    handlePrevPage,
    LIMIT
  } = useStudies({ initialStudies, initialTotal, initialCurrentPage });

  const renderTable = () => {
    if (formattedStudies.length === 0) {
      return (
        <div className={styles.emptyStateContainer}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            style={{ marginBottom: '1rem', color: '#94a3b8' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p>No se encontraron estudios que coincidan con tu búsqueda.</p>
        </div>
      );
    }

    return (
      <table className={styles.studiesTable}>
        <thead>
          <tr>
            <th className={styles.colId}>Cédula</th>
            <th className={styles.colPatient}>Paciente</th>
            <th className={styles.colSex}>Sexo</th>
            <th className={styles.colInstitution}>Institución</th>
            <th className={styles.colDate}>Fecha</th>
            <th className={styles.colModality}>Modalidad</th>
            <th className={styles.colActions}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {formattedStudies.map((study: FormattedStudy, index: number) => (
            <StudyRow key={study.id} study={study} index={index} />
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.logoIcon}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div>
              <h1>Estudios DICOM</h1>
              <p className={styles.subtitle}>Sistema de Visualización Médica</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.statsBadge}>
              <span className={styles.statsNumber}>{total}</span>
              <span className={styles.statsLabel}>estudios</span>
            </div>

            <div className={styles.searchContainer}>
              <svg
                className={styles.searchIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Buscar paciente..."
                autoComplete="off"
                value={searchTerm}
                onInput={handleSearchChange}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Se eliminan el loadingBar y el tableLoadingOverlay */}
      <div className={styles.tableContainer}>
        {renderTable()}
      </div>

      {totalPages > 1 && (
        <nav className={styles.pagination} role="navigation" aria-label="Paginación Estudios">
          <div className={styles.paginationInfo}>
            Mostrando <strong>
              {currentPage === 1 ? 1 : (currentPage - 1) * LIMIT + 1}
              -
              {Math.min(currentPage * LIMIT, total)}
            </strong> de <strong>{total}</strong>
          </div>

          <div className={styles.paginationControls}>
            <button
              onClick={handlePrevPage}
              className={styles.pageBtn}
              disabled={currentPage <= 1}
            >
              &lt;
            </button>

            <button
              onClick={handleNextPage}
              className={styles.pageBtn}
              disabled={currentPage >= totalPages}
            >
              &gt;
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}