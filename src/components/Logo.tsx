import Image from 'next/image';
import logoDark  from '../../assets/parashield-logo-dark.png';
import logoLight from '../../assets/parashield-logo-light.png';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?:    number;
  className?: string;
  /**
   * Next.js Image priority hint (#461). Defaults to `true` since every
   * current call site (NavBar, its Suspense fallback in layout.tsx, and
   * page.tsx's hero) is above the fold. Pass `false` explicitly for any
   * below-the-fold usage (e.g. a footer logo), which previously had no way
   * to opt out since this was hardcoded on the underlying <Image>.
   */
  priority?: boolean;
}

export function Logo({ variant = 'dark', size = 32, className, priority = true }: LogoProps) {
  const src = variant === 'light' ? logoLight : logoDark;
  return (
    <Image
      src={src}
      alt="ParaShield"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}

export function LogoWordmark({ variant = 'dark', size = 32, className, priority }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ''}`}>
      <Logo variant={variant} size={size} priority={priority} />
      <span className="text-lg font-bold tracking-tight">
        <span className="text-teal-400">Para</span>
        <span className={variant === 'dark' ? 'text-white' : 'text-gray-900'}>shield</span>
      </span>
    </span>
  );
}
