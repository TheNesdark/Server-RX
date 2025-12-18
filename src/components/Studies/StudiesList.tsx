import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import type { Study, FormattedStudy, StudiesListProps } from '@/types';
import { FormatStudy } from '@/utils/StudyUtils';
import styles from '@/styles/StudiesList.module.css';

const LIMIT = 15;

export default function StudiesList({ total: initialTotal, studies: initialStudies, currentPage: initialCurrentPage = 1 }: StudiesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [studies, setStudies] = useState<Study[]>(initialStudies);
  const [total, setTotal] = useState<number>(initialTotal);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const isInitialMount = useRef(true);

  const totalPages = useMemo(() => Math.ceil(total / LIMIT), [total]);

  const formattedStudies: FormattedStudy[] = useMemo(() => {
    return studies.map(FormatStudy);
  }, [studies]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search/studies?q=${encodeURIComponent(searchTerm)}&page=${currentPage}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error en la búsqueda");
        }
        setStudies(data.studies);
        setTotal(data.total);
      } catch (error) {
        console.error("Error en la búsqueda:", error);
        setStudies([]); // Clear studies on error
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchTerm, currentPage]);

  const handleSearchChange = (event: Event) => {
    setSearchTerm((event.target as HTMLInputElement).value);
    setCurrentPage(1); // Reset page to 1 on new search
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const renderTable = () => {
    if (loading) {
        return <div className={styles.emptyStateContainer}>Cargando...</div>;
    }

    if (formattedStudies.length === 0) {
        return <div className={styles.emptyStateContainer}><p>No hay estudios</p></div>;
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
                </tr>
            </thead>
            <tbody>
                {formattedStudies.map((study: FormattedStudy, index: number) => (
                    <tr 
                        key={study.id} 
                        className={styles.studyRow} 
                        style={{ "--delay": `${index * 0.04}s` }}
                        onClick={() => window.open(`/viewer/${study.id}`)}
                    >
                        <td>
                            <code className={styles.idCode}>{study.patientId}</code>
                        </td>
                        <td>
                            <span className={styles.patientName}>{study.patientName}</span>
                        </td>
                        <td>{study.patientSex}</td>
                        <td>{study.institution}</td>
                        <td>{study.studyDate}</td>
                        <td>
                            <span
                                className={`${styles.modalityChip} ${styles[`modality-${study.modality.toLowerCase()}`]}`}
                            >
                                {study.modality}
                            </span>
                        </td>
                    </tr>
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
                autocomplete="off"
                value={searchTerm}
                onInput={handleSearchChange}
              />
            </div>
          </div>
        </div>
      </header>

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