import RactixBrand from "./RactixBrand";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
      <div className="animate-ractix-splash">
        <RactixBrand />
      </div>
    </div>
  );
}