// Minimal stroke icon set (24x24, currentColor) so icons render the same on every OS.
const I = ({ children, size = 20, fill = 'none', sw = 1.7, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);

export const BagIcon = (p) => <I {...p}><path d="M5 8h14l-1 12.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></I>;
export const HeartIcon = ({ filled, ...p }) => <I {...p} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></I>;
export const SearchIcon = (p) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></I>;
export const UserIcon = (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></I>;
export const BoxIcon = (p) => <I {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></I>;
export const HomeIcon = (p) => <I {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" /></I>;
export const GridIcon = (p) => <I {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></I>;
export const StarIcon = ({ filled = true, ...p }) => <I {...p} sw={1.4} fill={filled ? 'currentColor' : 'none'}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z" /></I>;
export const CloseIcon = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;
export const PlusIcon = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const MinusIcon = (p) => <I {...p}><path d="M5 12h14" /></I>;
export const CheckIcon = (p) => <I {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></I>;
export const TruckIcon = (p) => <I {...p}><path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></I>;
export const ShieldIcon = (p) => <I {...p}><path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></I>;
export const LeafIcon = (p) => <I {...p}><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" /><path d="M5 19c3-4 6-6.5 10-8.5" /></I>;
export const ReturnIcon = (p) => <I {...p}><path d="M9 7 5 11l4 4" /><path d="M5 11h9.5a4.5 4.5 0 0 1 0 9H12" /></I>;
export const ArrowIcon = (p) => <I {...p}><path d="M5 12h14M13 6l6 6-6 6" /></I>;
export const TrashIcon = (p) => <I {...p}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7" /></I>;
export const TagIcon = (p) => <I {...p}><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8.5-8.1Z" /><circle cx="8" cy="8" r="1.4" /></I>;
export const EyeIcon = (p) => <I {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></I>;
export const CompareIcon = (p) => <I {...p}><path d="M8 4v16M16 4v16M4 8h8M12 16h8" /></I>;
export const ChevronL = (p) => <I {...p}><path d="m15 5-7 7 7 7" /></I>;
export const ChevronR = (p) => <I {...p}><path d="m9 5 7 7-7 7" /></I>;
export const DownloadIcon = (p) => <I {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></I>;
export const MailIcon = (p) => <I {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></I>;
export const UsersIcon = (p) => <I {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 7M18 14.5A6.5 6.5 0 0 1 21.5 20" /></I>;
export const DatabaseIcon = (p) => <I {...p}><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" /><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></I>;
export const EditIcon = (p) => <I {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></I>;
export const BoltIcon =(p) => <I {...p}><path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6L13 3Z" /></I>;
export const PrintIcon = (p) => <I {...p}><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" /><path d="M7 14h10v6H7z" /></I>;
export const CardIcon = (p) => <I {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></I>;
export const PaletteIcon = (p) => <I {...p}><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.1-.9-1.5-.9-2.5 0-1 .8-1.8 1.8-1.8h1.6a4.2 4.2 0 0 0 4.2-4.2c0-3.8-3.8-6.8-8.5-6.8Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="14.5" cy="7.5" r="1" /></I>;
export const ChartIcon = (p) => <I {...p}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></I>;
export const StoreIcon = (p) => <I {...p}><path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5 12v8h14v-8M10 20v-5h4v5" /></I>;
export const ExternalIcon = (p) => <I {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></I>;
export const FilterIcon =(p) => <I {...p}><path d="M4 6h16M7 12h10M10 18h4" /></I>;
export const LogoMark = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M4 11 12 4.5 20 11" /><path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" /><path d="M12 20c0-4 1.5-6.5 4-7.5-.5 3.5-2 6-4 7.5Zm0 0c0-3-1.2-5-3.5-5.8.3 2.8 1.5 4.8 3.5 5.8Z" />
  </svg>
);

export function Stars({ value = 0, size = 14, count }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} size={size} filled={value >= n - 0.25} className={value >= n - 0.25 ? 'on' : ''} />)}
      {count !== undefined && <small>{value ? value.toFixed(1) : 'New'}{count ? ` (${count})` : ''}</small>}
    </span>
  );
}
