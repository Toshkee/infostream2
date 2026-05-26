import Image from "next/image";
import type { Dict } from "@/lib/dictionaries";

export default function Footer({ dict }: { dict: Dict }) {
  return (
    <footer className="border-t hairline bg-[var(--bg-elev)]">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-14 grid gap-10 md:grid-cols-3 items-start">
        <div>
          <Image src="/infostream-logo.webp" alt="Infostream" width={140} height={26} className="h-6 w-auto" />
          <p className="mt-4 text-sm text-[var(--fg-dim)] max-w-xs leading-relaxed">{dict.footer.tagline}</p>
        </div>
        <div className="mono text-[11px] tracking-[0.18em] uppercase text-[var(--fg-dim)] space-y-1.5">
          <div>ISO 27001 · ISO 9001</div>
          <div>Bitdefender Enterprise</div>
          <div>15+ years operating critical state systems</div>
        </div>
        <div className="md:text-right mono text-[11px] tracking-[0.18em] uppercase text-[var(--fg-dim)]">
          © {new Date().getFullYear()} Infostream — {dict.footer.rights}
        </div>
      </div>
    </footer>
  );
}
