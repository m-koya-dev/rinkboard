import brandImg from "../assets/ractix-brand-tightsmall.png";

export default function RactixIcon({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={brandImg}
        alt="Ractix icon"
        draggable={false}
        style={{
          height: size,
          width: "auto",
          maxWidth: "none",
          display: "block",
          transform: "translateX(-6px)",
          userSelect: "none",
        }}
      />
    </div>
  );
}