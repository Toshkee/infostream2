// Brand logos for the Technology section, one named component per entry.
// Angular / JavaScript / .NET / Java are the official marks (devicon /
// lolstack sources). Oracle Database uses Oracle's official red "O" symbol;
// Oracle APEX's official logo is the "APEX" wordmark (no pictorial mark
// exists), rendered here in Oracle red. AI has no brand — neutral brain glyph.

const SIZE = 20;
const ORACLE_RED = "#F80000";

function OracleDatabaseIcon() {
  return (
    <svg width={SIZE + 2} height={SIZE + 2} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        fill={ORACLE_RED}
        d="M20.2 52.2C8.93 52.2 0 43.056 0 32c0-11.27 9.143-20.2 20.2-20.2h23.6C55.07 11.8 64 20.944 64 32c0 11.27-9.143 20.2-20.2 20.2zm23.176-7.23c7.23 0 13.183-5.953 13.183-13.183s-5.953-13.183-13.183-13.183H20.837c-7.23 0-13.183 5.953-13.183 13.183S13.608 44.97 20.837 44.97z"
      />
    </svg>
  );
}

function OracleApexIcon() {
  return (
    <span
      className="font-bold text-[8.5px] tracking-[0.04em] leading-none"
      style={{ color: ORACLE_RED }}
      aria-hidden
    >
      APEX
    </span>
  );
}

function DotNetIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 456 456" fill="none" aria-hidden>
      <rect width="456" height="456" rx="72" fill="#512BD4" />
      <path
        fill="#fff"
        d="M81.274 291.333c-3.224 0-5.965-1.074-8.222-3.223-2.257-2.204-3.386-4.821-3.386-7.851 0-3.086 1.129-5.73 3.386-7.934 2.257-2.204 4.998-3.306 8.222-3.306 3.278 0 6.045 1.102 8.302 3.306 2.311 2.204 3.466 4.848 3.466 7.934 0 3.03-1.155 5.647-3.466 7.851-2.257 2.149-5.024 3.223-8.302 3.223ZM210.167 289.515h-20.958l-55.215-87.109a38.977 38.977 0 0 1-3.466-6.86h-.484c.43 2.535.645 7.962.645 16.281v77.688h-18.54V171h22.328l53.362 85.043c2.257 3.527 3.708 5.951 4.353 7.273h.322c-.537-3.14-.806-8.457-.806-15.951V171h18.459v118.515ZM300.449 289.515h-64.888V171h62.309v16.695h-43.124v33.554h39.739v16.612h-39.739v35.042h45.703v16.612ZM392.667 187.695h-33.21v101.82h-19.185v-101.82h-33.129V171h85.524v16.695Z"
      />
    </svg>
  );
}

function JavaIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 128 128" aria-hidden>
      <path
        fill="#0074BD"
        d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"
      />
      <path
        fill="#EA2D2E"
        d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"
      />
      <path
        fill="#0074BD"
        d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"
      />
      <path
        fill="#EA2D2E"
        d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"
      />
      <path
        fill="#0074BD"
        d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"
      />
    </svg>
  );
}

function AngularIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 242 256" fill="none" aria-hidden>
      <path
        fill="url(#ng-grad-a)"
        d="m241 43-9 136L149 0l92 43Zm-58 176-62 36-63-36 12-31h101l12 31ZM121 68l32 80H88l33-80ZM9 179 0 43 92 0 9 179Z"
      />
      <path
        fill="url(#ng-grad-b)"
        d="m241 43-9 136L149 0l92 43Zm-58 176-62 36-63-36 12-31h101l12 31ZM121 68l32 80H88l33-80ZM9 179 0 43 92 0 9 179Z"
      />
      <defs>
        <linearGradient id="ng-grad-a" x1="53.2" x2="245" y1="231.9" y2="140.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E40035" />
          <stop offset=".2" stopColor="#F60A48" />
          <stop offset=".4" stopColor="#F20755" />
          <stop offset=".5" stopColor="#DC087D" />
          <stop offset=".7" stopColor="#9717E7" />
          <stop offset="1" stopColor="#6C00F5" />
        </linearGradient>
        <linearGradient id="ng-grad-b" x1="44.5" x2="170" y1="30.7" y2="174" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF31D9" />
          <stop offset="1" stopColor="#FF5BE1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function JavaScriptIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 1052 1052" aria-hidden>
      <rect width="1052" height="1052" rx="160" fill="#f0db4f" />
      <path
        fill="#323330"
        d="M965.9 801.1c-7.7-48-39-88.3-131.7-125.9-32.2-14.8-68.1-25.399-78.8-49.8-3.8-14.2-4.3-22.2-1.9-30.8 6.9-27.9 40.2-36.6 66.6-28.6 17 5.7 33.1 18.801 42.8 39.7 45.4-29.399 45.3-29.2 77-49.399-11.6-18-17.8-26.301-25.4-34-27.3-30.5-64.5-46.2-124-45-10.3 1.3-20.699 2.699-31 4-29.699 7.5-58 23.1-74.6 44-49.8 56.5-35.6 155.399 25 196.1 59.7 44.8 147.4 55 158.6 96.9 10.9 51.3-37.699 67.899-86 62-35.6-7.4-55.399-25.5-76.8-58.4-39.399 22.8-39.399 22.8-79.899 46.1 9.6 21 19.699 30.5 35.8 48.7 76.2 77.3 266.899 73.5 301.1-43.5 1.399-4.001 10.6-30.801 3.199-72.101zm-394-317.6h-98.4c0 85-.399 169.4-.399 254.4 0 54.1 2.8 103.7-6 118.9-14.4 29.899-51.7 26.2-68.7 20.399-17.3-8.5-26.1-20.6-36.3-37.699-2.8-4.9-4.9-8.7-5.601-9-26.699 16.3-53.3 32.699-80 49 13.301 27.3 32.9 51 58 66.399 37.5 22.5 87.9 29.4 140.601 17.3 34.3-10 63.899-30.699 79.399-62.199 22.4-41.3 17.6-91.3 17.4-146.6.5-90.2 0-180.4 0-270.9z"
      />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 18V5" />
      <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
      <path d="M18 18a4 4 0 0 0 2-7.464" />
      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
      <path d="M6 18a4 4 0 0 1-2-7.464" />
      <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
    </svg>
  );
}

// Keyed by the `icon` field in dict.technology.groups[].items[].
export const TECH_LOGOS: Record<string, () => React.JSX.Element> = {
  db: OracleDatabaseIcon,
  apex: OracleApexIcon,
  net: DotNetIcon,
  java: JavaIcon,
  angular: AngularIcon,
  js: JavaScriptIcon,
  ai: AiIcon,
};
