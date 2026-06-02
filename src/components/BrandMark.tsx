export function BrandMark({
  size = "md",
  variant = "light",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}) {
  const imgH = size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-11";
  return (
    <div className="flex items-center gap-2.5">
      <img
        src={variant === "dark" ? "/og-image.png" : "/1.png"}
        alt="Rézo Campus Consulting"
        className={`${imgH} w-auto ${variant === "dark" ? "brightness-0 invert" : ""}`}
      />
    </div>
  );
}
