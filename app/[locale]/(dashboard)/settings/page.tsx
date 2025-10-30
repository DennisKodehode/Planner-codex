import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/server/prisma';
import { SettingsForm } from '@/components/settings/settings-form';
import { DeleteAccountButton } from '@/components/settings/delete-account-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  const preference = await prisma.preference.findUnique({ where: { userId: session.user.id } });
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SettingsForm
        initial={
          preference ?? {
            categories: ['coffee_shop', 'park'],
            maxDistance: 2000,
            minRating: 4,
            priceLevels: [0, 1, 2],
            budgetDaily: 600,
            locale: params.locale as 'en' | 'no',
            theme: 'system',
          }
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Export a JSON copy of your data.</p>
            <Button asChild variant="outline">
              <a href="/api/me/export">Download export</a>
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Delete your account and all stored plans.</p>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
