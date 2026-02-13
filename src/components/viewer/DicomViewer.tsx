import { useDicomViewer } from '@/hooks/useDicomViewer';
import styles from '@/styles/DicomViewer.module.css';

const LoadingOverlay = () => (
    <div className={styles.loadingOverlay}>
        <div className={styles.spinner}></div>
        <div className={styles.loadingText}>Cargando radiografia...</div>
    </div>
);

const SliderControl = ({ 
    label, 
    min, 
    max, 
    value, 
    onChange, 
    disabled 
}: {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    disabled: boolean;
}) => (
    <div className={styles.sliderGroup}>
        <label>{label}</label>
        <input 
            type="range" 
            min={min} 
            max={max} 
            value={value} 
            onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
            disabled={disabled}
        />
    </div>
);

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
        <div id="dicom-viewer" className={styles.viewerContainer}>
            <div id="layerGroup0" className={styles.layerGroup}></div>
            
            {!isLoaded && <LoadingOverlay />}

            <div className={styles.controlsOverlay}>
                <SliderControl
                    label="Nivel de gris RX (Center)"
                    min={range.min}
                    max={range.max}
                    value={windowCenter}
                    onChange={handleCenterChange}
                    disabled={!isLoaded}
                />
                
                <SliderControl
                    label="Contraste RX (Width)"
                    min={1}
                    max={range.max - range.min}
                    value={windowWidth}
                    onChange={handleWidthChange}
                    disabled={!isLoaded}
                />
            </div>
        </div>
    );
}
