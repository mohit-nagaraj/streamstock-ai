import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>StreamStock AI</CardTitle>
          <CardDescription>
            AI-Enhanced Event-Driven Inventory Management System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge>Real-time</Badge>
            <Badge variant="secondary">Kafka</Badge>
            <Badge variant="outline">AI-Powered</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Testing shadcn/ui components with Tailwind CSS integration.
          </p>
          <Button className="w-full">Get Started</Button>
        </CardContent>
      </Card>
    </div>
  );
}
