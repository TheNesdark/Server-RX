import { useDicomViewer } from '@/hooks/useDicomViewer';
import styles from '@/styles/DicomViewer.module.css';

export default function DicomViewer() {
    const {
        windowCenter,
        windowWidth,
        range,
        isLoaded,
        handleWidthChange,
        handleCenterChange
    } = useDicomViewer();

    return (
        <div id="dwv" className={styles.dwvContainer}>
            <div id="layerGroup0" className={styles.layerGroup}></div>
            
            {!isLoaded && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                    <div className={styles.loadingText}>
                        Cargando Serie...
                    </div>
                </div>
            )}

            <div className={styles.controlsOverlay}>
                <div className={styles.sliderGroup}>
                    <label>Brillo (Center)</label>
                    <input 
                        type="range" 
                        min={range.min} 
                        max={range.max} 
                        value={windowCenter} 
                        onInput={(e: any) => handleCenterChange(parseFloat(e.target.value))}
                        disabled={!isLoaded}
                    />
                </div>
                
                <div className={styles.sliderGroup}>
                    <label>Contraste (Width)</label>
                    <input 
                        type="range" 
                        min={1} 
                        max={range.max - range.min} 
                        value={windowWidth} 
                        onInput={(e: any) => handleWidthChange(parseFloat(e.target.value))}
                        disabled={!isLoaded}
                    />
                </div>
            </div>
        </div>
    );
}
