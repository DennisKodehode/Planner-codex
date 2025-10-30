import { notFound } from 'next/navigation';
import { NextIntlClientProvider, getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { Providers } from '@/app/providers';
import { locales } from '@/lib/i18n/request';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Oslo">
      <Providers locale={locale}>{children}</Providers>
    </NextIntlClientProvider>
  );
}
