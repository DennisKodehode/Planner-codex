import Link from 'next-intl/link';

export default function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-6 text-center">
        <Link href="/" className="text-2xl font-semibold">
          DayPlanner
        </Link>
        <p className="text-sm text-muted-foreground">Plan your day with voice commands.</p>
      </div>
      <div className="w-full max-w-md rounded-lg border bg-background p-8 shadow">
        {children}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Locale: {locale.toUpperCase()}</p>
    </div>
  );
}
