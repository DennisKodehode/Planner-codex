import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n/request';

export default function SignInRedirectPage() {
  redirect(`/${defaultLocale}/sign-in`);
}
