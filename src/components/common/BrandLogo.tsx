import Image from "next/image";

export default function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border border-black/10 bg-[#161616] p-1.5 shadow-sm dark:border-white/10 dark:bg-white">
        <Image
          src="/images/CRCL-Logo%20(1).webp"
          alt="CRCL"
          width={28}
          height={28}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <div className="leading-tight">
        <div className="text-[13px] font-extrabold tracking-[0.12em] text-[#161616] dark:text-white">CRCL</div>
        <div className="text-[11px] font-semibold text-black/45 dark:text-white/45">platform admin</div>
      </div>
    </div>
  );
}
