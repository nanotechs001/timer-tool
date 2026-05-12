import Image from "next/image";

type Props = {
  className?: string;
  priority?: boolean;
};

/** Logo asset: grey on dark — invert in dark mode for contrast on zinc-950. */
export function BrandLogo({ className = "", priority = false }: Props) {
  return (
    <Image
      src="/digital-goliath.png"
      alt="Digital Goliath"
      width={200}
      height={44}
      priority={priority}
      className={`h-8 w-auto max-w-[200px] object-contain object-left dark:invert ${className}`}
    />
  );
}
