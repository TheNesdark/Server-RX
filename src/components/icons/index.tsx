import type { JSX } from 'preact';

export interface IconProps extends JSX.SVGAttributes<SVGSVGElement> {
    size?: number | string;
    primaryOpacity?: number;
    secondaryOpacity?: number;
}

const BaseIcon = ({ size = 24, primaryOpacity = 1, secondaryOpacity = 0.2, children, ...props }: IconProps & { children: any }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ '--icon-primary': primaryOpacity, '--icon-secondary': secondaryOpacity } as any}
        {...props}
    >
        {children}
    </svg>
);

// Helper for the secondary (filled/accent) parts
const Secondary = ({ children, fill = true }: { children: any, fill?: boolean }) => (
    <g opacity="var(--icon-secondary)" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}>
        {children}
    </g>
);

export const ZoomIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="11" cy="11" r="8" /></Secondary>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
    </BaseIcon>
);

export const DrawIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M12 19l7-7 3 3-7 7-3-3z" /></Secondary>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" fill="currentColor" stroke="none" />
    </BaseIcon>
);

export const ChevronDownIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <polyline points="6 9 12 15 18 9" />
    </BaseIcon>
);

export const ArrowIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <line x1="5" y1="12" x2="19" y2="12" />
        <Secondary><polygon points="12 5 19 12 12 19 12 5" /></Secondary>
        <polyline points="12 5 19 12 12 19" />
    </BaseIcon>
);

export const RulerIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="2" y="7" width="20" height="10" rx="2" /></Secondary>
        <rect x="2" y="7" width="20" height="10" rx="2" />
        <line x1="6" y1="7" x2="6" y2="11" />
        <line x1="10" y1="7" x2="10" y2="10" />
        <line x1="14" y1="7" x2="14" y2="11" />
        <line x1="18" y1="7" x2="18" y2="10" />
    </BaseIcon>
);

export const CircleIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="10" /></Secondary>
        <circle cx="12" cy="12" r="10" />
    </BaseIcon>
);

export const EllipseIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><ellipse cx="12" cy="12" rx="10" ry="6" /></Secondary>
        <ellipse cx="12" cy="12" rx="10" ry="6" />
    </BaseIcon>
);

export const RectangleIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="3" y="5" width="18" height="14" rx="2" /></Secondary>
        <rect x="3" y="5" width="18" height="14" rx="2" />
    </BaseIcon>
);

export const ProtractorIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M2 16A10 10 0 0 1 22 16Z" /></Secondary>
        <path d="M2 16A10 10 0 0 1 22 16Z" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="6" y1="16" x2="6" y2="14" />
        <line x1="18" y1="16" x2="18" y2="14" />
    </BaseIcon>
);

export const RoiIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="6" y="6" width="12" height="12" rx="2" /></Secondary>
        <path d="M4 8V4h4" />
        <path d="M16 4h4v4" />
        <path d="M20 16v4h-4" />
        <path d="M8 20H4v-4" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </BaseIcon>
);

export const EraserIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M7 21L22 6l-5-5L2 16v5h5z" /></Secondary>
        <path d="M7 21L22 6l-5-5L2 16v5h5z" />
        <line x1="7" y1="21" x2="12" y2="16" />
        <line x1="2" y1="16" x2="22" y2="16" />
    </BaseIcon>
);

export const TrashIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7z" /></Secondary>
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </BaseIcon>
);

export const ScaleIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="4" y="15" width="16" height="4" rx="1" /></Secondary>
        <line x1="4" y1="19" x2="20" y2="19" />
        <line x1="4" y1="15" x2="4" y2="19" />
        <line x1="8" y1="17" x2="8" y2="19" />
        <line x1="12" y1="15" x2="12" y2="19" />
        <line x1="16" y1="17" x2="16" y2="19" />
        <line x1="20" y1="15" x2="20" y2="19" />
    </BaseIcon>
);

export const BorderMagnifyIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="11" cy="11" r="8" /></Secondary>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
        <rect x="8" y="8" width="6" height="6" strokeDasharray="2 2" />
    </BaseIcon>
);

export const RotateIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></Secondary>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        <polyline points="17 10 23 10 23 4" />
    </BaseIcon>
);

export const ResetIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /></Secondary>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
    </BaseIcon>
);

export const HelpIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="10" /></Secondary>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
);

export const CloseIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="10" /></Secondary>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </BaseIcon>
);

export const GridIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </Secondary>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </BaseIcon>
);

export const MedicalIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Secondary>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12h6m-3-3v6" />
    </BaseIcon>
);

export const FileTextIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></Secondary>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </BaseIcon>
);

export const ShareIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /></Secondary>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </BaseIcon>
);

export const CalendarIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="3" y="4" width="18" height="6" rx="2" /></Secondary>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </BaseIcon>
);

export const AlertCircleIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="10" /></Secondary>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
);

export const ArrowRightIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><polygon points="12 5 19 12 12 19 12 5" /></Secondary>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </BaseIcon>
);

export const PrinterIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><rect x="6" y="14" width="12" height="8" rx="1" /></Secondary>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
    </BaseIcon>
);

export const AlertTriangleIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></Secondary>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </BaseIcon>
);

export const SearchIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="11" cy="11" r="8" /></Secondary>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </BaseIcon>
);

export const EditIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></Secondary>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </BaseIcon>
);

export const SunIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="4" /></Secondary>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
    </BaseIcon>
);

export const ImageIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><path d="M21 15l-5-5L5 21" /><circle cx="8.5" cy="8.5" r="1.5" /></Secondary>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </BaseIcon>
);

export const MenuIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary fill={false}><path d="M3 12h12" /></Secondary>
        <path d="M3 6h18M3 18h18" />
        <path d="M3 12h12" />
    </BaseIcon>
);

export const XIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary fill={false}><path d="M6 6l12 12" /></Secondary>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
    </BaseIcon>
);

export const SettingsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="3" /></Secondary>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </BaseIcon>
);

export const LogOutIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><polygon points="16 17 21 12 16 7 16 17" /></Secondary>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </BaseIcon>
);

export const EyeIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <Secondary><circle cx="12" cy="12" r="3" /></Secondary>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </BaseIcon>
);
