import { site } from "@/content/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t-[0.8px] border-[color:var(--color-line)]">
      <div className="shell flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-accent)] font-[family-name:var(--font-display)] text-[15px] leading-none text-[color:var(--color-cream)]">
            M
          </span>
          <span className="font-[family-name:var(--font-display)] text-[1.15rem] text-[color:var(--color-text)]">
            {site.name}
          </span>
        </div>

        <p className="text-[0.8rem] text-[color:var(--color-muted)]">
          {site.footer.tagline}
        </p>

        <p className="text-[0.75rem] text-[color:var(--color-muted)]/70">
          © {year}
        </p>
      </div>
    </footer>
  );
}
