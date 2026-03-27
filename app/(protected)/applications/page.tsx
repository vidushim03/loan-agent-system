import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_APPLICATIONS = [
  { id: "APP-2026-001", customer: "Rohan Gupta", amount: 500000, status: "Approved", score: 790 },
  { id: "APP-2026-002", customer: "Meera Jain", amount: 300000, status: "Rejected", score: 635 },
  { id: "APP-2026-003", customer: "Amit Rao", amount: 750000, status: "Under Review", score: 705 },
];

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of recent loan applications processed by the underwriting engine.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Applications</CardDescription>
            <CardTitle>42</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approval Rate</CardDescription>
            <CardTitle>78%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average Ticket Size</CardDescription>
            <CardTitle>INR 5.8L</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
          <CardDescription>Demo data to showcase UI and workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {DEMO_APPLICATIONS.map((app) => (
              <div key={app.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <p className="font-medium">{app.id} - {app.customer}</p>
                  <p className="text-muted-foreground">Amount: INR {app.amount.toLocaleString("en-IN")} | Credit Score: {app.score}</p>
                </div>
                <p className="font-semibold">{app.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
