export default function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-1">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#171714]">{title}</h1>
      {subtitle ? <p className="max-w-4xl text-[13px] font-medium leading-6 text-black/52">{subtitle}</p> : null}
    </div>
  );
}
