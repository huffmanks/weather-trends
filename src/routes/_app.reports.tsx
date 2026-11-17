import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileBarChart, Plus, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Create, save, and revisit your weather analysis.</p>
        </div>

        <Button disabled>
          <Plus className="mr-2 size-4" />
          New report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileBarChart className="size-5 text-primary" />
            </div>
            <CardTitle>Saved reports</CardTitle>
            <CardDescription>Your saved weather reports and visualizations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Coming soon</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Save className="size-5 text-primary" />
            </div>
            <CardTitle>Saved comparisons</CardTitle>
            <CardDescription>
              Revisit comparisons between locations and weather metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Coming soon</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileBarChart className="size-7 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">No saved reports yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Build weather comparisons on your dashboard and save your favorite configurations as
              reusable reports.
            </p>
          </div>

          <Button
            nativeButton={false}
            render={
              <Link to="/dashboard">
                Explore dashboard
                <ArrowRight className="ml-2 size-4" />
              </Link>
            }></Button>
        </CardContent>
      </Card>
    </div>
  );
}
