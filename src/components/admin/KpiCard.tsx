export default function KpiCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="admin-panel rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/45">{label}</div>
        <div className="mt-1 h-2 w-2 rounded-full bg-black/18" />
      </div>
      <div className="mt-3 text-[28px] font-extrabold leading-none tracking-tight text-[#171714]">{value}</div>
      {detail ? <div className="mt-2 text-[13px] font-medium text-black/48">{detail}</div> : <div className="mt-2 text-[13px] text-transparent">.</div>}
    </div>
  );
}
