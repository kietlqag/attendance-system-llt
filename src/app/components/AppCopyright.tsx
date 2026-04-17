export function AppCopyright({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-slate-600 ${className}`.trim()}>
      {`© ${new Date().getFullYear()} CLB Ly Luan Tre HCM-UTE. All rights reserved.`}
    </p>
  );
}
