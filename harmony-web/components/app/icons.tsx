/**
 * Inline icon set — Lucide-style, 1.5 stroke, `currentColor`.
 * Hand-drawn rather than pulled from a library so the app ships zero icon
 * dependencies and every glyph inherits the surrounding text colour.
 */

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 16, className, strokeWidth = 1.5, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </Svg>
);

export const DocumentsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2h9l3 3v17H6z" />
    <path d="M15 2v3h3" />
    <line x1="9" y1="12" x2="17" y2="12" />
    <line x1="9" y1="16" x2="17" y2="16" />
  </Svg>
);

export const ReviewIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const KnowledgeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" />
    <line x1="19" y1="2" x2="19" y2="20" />
  </Svg>
);

export const AnalyticsIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="5" y1="20" x2="5" y2="10" />
    <line x1="12" y1="20" x2="12" y2="5" />
    <line x1="19" y1="20" x2="19" y2="14" />
  </Svg>
);

export const TeamIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.5 15c2.7.4 4.5 2 4.5 5" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10" cy="10" r="6.5" />
    <line x1="15" y1="15" x2="20" y2="20" />
  </Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
    <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
  </Svg>
);

export const BackIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="11 5 5 12 11 19" />
  </Svg>
);

export const WarningIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.6}>
    <path d="M12 3 2 20h20z" />
    <line x1="12" y1="9" x2="12" y2="14" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
  </Svg>
);

export const FolderIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);

export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4" />
    <polyline points="7 9 12 4 17 9" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2h8l4 4v16H6z" />
    <path d="M14 2v4h4" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12l5 5L20 6" />
  </Svg>
);

export const ClipboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4V3h6v1" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </Svg>
);

export const DriveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3h8l5 9-4 9H7l-4-9z" />
    <path d="M3 12h18" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const SpinnerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Svg>
);
