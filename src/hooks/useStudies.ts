import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import type { Study, FormattedStudy } from '@/types';
import { FormatStudy } from '@/utils/StudyUtils';

const LIMIT = 15;

interface UseStudiesProps {
    initialStudies: Study[];
    initialTotal: number;
    initialCurrentPage: number;
}

export function useStudies({ initialStudies, initialTotal, initialCurrentPage }: UseStudiesProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [studies, setStudies] = useState<Study[]>(initialStudies);
    const [total, setTotal] = useState<number>(initialTotal);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(initialCurrentPage);
    const isInitialMount = useRef(true);
    const debounceTimer = useRef<number | null>(null);

    const totalPages = useMemo(() => Math.ceil(total / LIMIT), [total]);

    const formattedStudies: FormattedStudy[] = useMemo(() => {
        return studies.map(FormatStudy);
    }, [studies]);

    const performSearch = async (query: string, page: number) => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/search/studies?q=${encodeURIComponent(query)}&page=${page}`,
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error en la búsqueda");
            }
            setStudies(data.studies);
            setTotal(data.total);
        } catch (error) {
            console.error("Error en la búsqueda:", error);
            setStudies([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = window.setTimeout(() => {
            performSearch(searchTerm, currentPage);
        }, 300);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchTerm, currentPage]);

    const handleSearchChange = (event: Event) => {
        const value = (event.target as HTMLInputElement).value;
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return {
        searchTerm,
        loading,
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
