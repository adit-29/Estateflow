import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This module is planned for a future release. Navigation stays visible so you can see the
          full product map — nothing here is a broken link.
        </p>
      </CardContent>
    </Card>
  );
}
