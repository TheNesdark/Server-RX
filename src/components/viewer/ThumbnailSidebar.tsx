import { useState, useEffect } from 'preact/hooks';
import { serieActivaId } from '@/stores/dicomStore';
import type { ThumbnailInfo } from '@/types';
import styles from '@/styles/ThumbnailSidebar.module.css';

interface ThumbnailSidebarProps {
    series: ThumbnailInfo[];
}

export default function ThumbnailSidebar({ series }: ThumbnailSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        // Escuchar cambios en el store de nanostores
        const unsubscribe = serieActivaId.subscribe((value) => {
            setActiveId(value);
        });

        // Seleccionar la primera serie por defecto si no hay ninguna activa
        if (series.length > 0 && !serieActivaId.get()) {
            serieActivaId.set(series[0].id);
        }

        return () => unsubscribe();
    }, [series]);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    const handleSelectSerie = (id: string) => {
        serieActivaId.set(id);
    };

    return (
        <aside className={`${styles.thumbnailsSidebar} ${collapsed ? styles.collapsed : ''}`}>
            <header className={styles.sidebarHeader}>
                <button
                    className={styles.sidebarToggle}
                    onClick={toggleSidebar}
                    aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
            </header>

            <div className={styles.thumbnailsList}>
                {series.map((item) => (
                    <div
                        key={item.id}
                        className={`${styles.thumbnailItem} ${activeId === item.id ? styles.active : ''}`}
                        onClick={() => handleSelectSerie(item.id)}
                    >
                        <div className={styles.thumbnailPreview}>
                            <img src={item.previewUrl} alt={`Serie ${item.modality}`} loading="lazy" />
                        </div>
                        <div className={styles.thumbnailInfo}>
                            <div className={styles.thumbnailTitle}>{item.modality}</div>
                            <div className={styles.thumbnailDescription}>
                                {item.bodyPart}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
