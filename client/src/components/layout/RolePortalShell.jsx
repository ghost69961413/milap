import PageTransition from "../animations/PageTransition";
import Navbar from "./Navbar";

function RolePortalShell({
  title,
  subtitle,
  gradientClassName = "",
  children
}) {
  return (
    <PageTransition>
      <div
        className={[
          "min-h-screen text-[#1f2a44]",
          gradientClassName ||
            "bg-[radial-gradient(circle_at_15%_12%,rgba(119,153,213,0.2),transparent_32%),radial-gradient(circle_at_86%_16%,rgba(244,178,129,0.2),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#fff8f2_100%)]"
        ].join(" ")}
      >
        <Navbar />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 lg:px-8">
          <section className="mb-7 rounded-3xl border border-[#dce3f3] bg-white/85 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#6b728d]">
              Role Portal
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#5a6480]">{subtitle}</p>
          </section>
          {children}
        </main>
      </div>
    </PageTransition>
  );
}

export default RolePortalShell;

