function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
        {eyebrow}
      </p>
      <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export default SectionTitle;

