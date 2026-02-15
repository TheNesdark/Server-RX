import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import type { FormattedStudy, Study, UseStudiesProps } from '@/types';
import { STUDIES_PAGE_LIMIT } from '@/config/pagination';
import { FormatStudy } from '@/utils/client';

const LIMIT = STUDIES_PAGE_LIMIT;
const DEBOUNCE_DELAY = 300; // Retraso para la búsqueda (ms)

export function useStudies({ initialStudies, initialTotal, initialCurrentPage }: UseStudiesProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [studies, setStudies] = useState<Study[]>(initialStudies);
    const [total, setTotal] = useState<number>(initialTotal);
    const [currentPage, setCurrentPage] = useState(initialCurrentPage);
    
    const isInitialMount = useRef(true);
    const debounceTimer = useRef<number | null>(null);
    const prevSearchTerm = useRef('');

    const totalPages = useMemo(() => Math.ceil(total / LIMIT), [total]);

    const formattedStudies: FormattedStudy[] = useMemo(() => {
        return studies.map(FormatStudy);
    }, [studies]);

    const performSearch = async (query: string, page: number) => {
        try {
            const response = await fetch(
                `/api/search/studies?q=${encodeURIComponent(query)}&page=${page}`,
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error('Respuesta inválida del servidor');
            }
            setStudies(Array.isArray(data.studies) ? data.studies : []);
            setTotal(typeof data.total === 'number' ? data.total : 0);
        } catch (error) {
            console.error("Error en la búsqueda:", error);
            // Mantener el estado anterior en caso de error
            setStudies([]);
            setTotal(0);
        }
    };

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        let ignore = false;

        let targetPage = currentPage;
        // Si el término de búsqueda cambió, reseteamos a la página 1 inmediatamente
        if (searchTerm !== prevSearchTerm.current) {
            targetPage = 1;
            setCurrentPage(1);
            prevSearchTerm.current = searchTerm;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(async () => {
            try {
                if (!ignore) {
                    await performSearch(searchTerm, targetPage);
                }
            } catch (error) {
                console.error('Error in debounced search:', error);
            }
        }, DEBOUNCE_DELAY);

        return () => {
            ignore = true;
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchTerm, currentPage]);

    const handleSearchChange = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        setSearchTerm(value);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                console.warn('Error scrolling to top:', error);
            }
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                console.warn('Error scrolling to top:', error);
            }
        }
    };

    return {
        searchTerm,
        total,
        currentPage,
        totalPages,
        formattedStudies,
        handleSearchChange,
        handleNextPage,
        handlePrevPage,
        LIMIT
    };
}
