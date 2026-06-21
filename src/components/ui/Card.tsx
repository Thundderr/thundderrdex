"use client";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

/** Surface container with the standard module/panel chrome. */
export function Card({ padded = true, className = "", children, ...rest }: Props) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface ${padded ? "p-4" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
