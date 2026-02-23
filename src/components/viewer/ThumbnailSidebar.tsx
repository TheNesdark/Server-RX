import { useState, useEffect } from 'preact/hooks';
import { activeSeriesId } from '@/stores/dicomStore';
import type { ThumbnailInfo, ThumbnailSidebarProps } from '@/types';
import styles from '@/styles/ThumbnailSidebar.module.css';
import { GridIcon } from '@/components/icons';

const NON_RENDERABLE_MODALITIES = new Set([
    'DOC',
    'KO',
    'PR',
    'RTDOSE',
    'RTPLAN',
    'RTSTRUCT',
    'SEG',
    'SR',
]);

const pickInitialSeries = (series: ThumbnailInfo[]) => {
    const renderable = series.find((item) => {
        const modality = (item.modality || '').toUpperCase();
        return modality && !NON_RENDERABLE_MODALITIES.has(modality);
    });

    return renderable ?? series[0] ?? null;
};

export default function ThumbnailSidebar({ series }: ThumbnailSidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        try {
            // Escuchar cambios en el store de nanostores
            const unsubscribe = activeSeriesId.subscribe((value) => {
                setActiveId(value);
            });

            // Seleccionar la primera serie por defecto si no hay ninguna activa
            if (series.length > 0 && !activeSeriesId.get()) {
                const initialSeries = pickInitialSeries(series);
                if (initialSeries) {
                    activeSeriesId.set(initialSeries.id);
                }
            }

            return () => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.warn('Error unsubscribing from activeSeriesId:', error);
                }
            };
        } catch (error) {
            console.error('Error setting up series subscription:', error);
        }
    }, [series]);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    const handleSelectSerie = (id: string) => {
        activeSeriesId.set(id);
    };

    return (
        <aside className={`${styles.thumbnailsSidebar} ${collapsed ? styles.collapsed : ''}`}>
            <header className={styles.sidebarHeader}>
                <button
                    className={styles.sidebarToggle}
                    onClick={toggleSidebar}
                    aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
                >
                    <GridIcon size={16} />
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
                            <img 
                                src={item.previewUrl} 
                                alt={`Serie ${item.modality}`} 
                                loading="lazy"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.dataset.fallbackApplied === '1') {
                                        target.style.display = 'none';
                                        return;
                                    }

                                    target.dataset.fallbackApplied = '1';
                                    target.src = '/no-image.svg';
                                    console.warn(`Failed to load thumbnail: ${item.previewUrl}`);
                                }}
                            />
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
