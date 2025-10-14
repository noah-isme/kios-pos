import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACCENTS = ["amber", "sky", "emerald"] as const;

export default function AccentsDemoPage() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Accent preview & focus/shimmer demo</h1>
        <p className="text-sm text-muted-foreground">Quick grid to preview the accent palette, focus ring, and shimmer behavior.</p>
      </header>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {ACCENTS.map((a) => (
          <Card key={a} className={`card-focusable ${"accent-" + a}`} tabIndex={0}>
            <CardHeader>
              <CardTitle className="capitalize">Accent: {a}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`card-gradient-shimmer accent-gradient rounded-md p-3 mb-3`} />
              <p className="text-sm text-muted-foreground">Icon background: <span className={`inline-block ml-2 rounded px-2 py-0.5 accent-icon`}>example</span></p>
              <p className="mt-3 text-xs text-muted-foreground">Focus this card (Tab) to see the ring & subtle motion. Prefers-reduced-motion disables shimmer.</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
