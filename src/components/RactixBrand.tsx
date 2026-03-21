import RactixIcon from "./RactixIcon";

export default function RactixBrand({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <RactixIcon size={44} />
        <div className="flex flex-col leading-none">
          <span className="text-[18px] font-semibold tracking-[0.01em] text-[#F3F0E8]">
            RACTIX
          </span>
          <span className="mt-[3px] text-[10px] tracking-[0.28em] text-[#7B7F86] uppercase">
            Rink Hockey Tactical Board
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <RactixIcon size={92} />
      <div className="flex flex-col leading-none">
        <span className="text-[54px] font-semibold tracking-[0.01em] text-[#F3F0E8]">
          RACTIX
        </span>
        <span className="mt-3 text-[14px] tracking-[0.32em] text-[#7B7F86] uppercase">
          Rink Hockey Tactical Board
        </span>
      </div>
    </div>
  );
}