"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApplicationDocument, ApplicationLifecycle, ApprovalStatus, LoanApplication, UserProfile } from "@/types";

type DashboardProps = {
  applications: LoanApplication[];
  currentUserId: string;
  documents: ApplicationDocument[];
  isReviewerView: boolean;
  profile: UserProfile | null;
};

type UploadState = Record<string, { documentType: string; fileName: string; storagePath: string }>;
type FeedbackState = Record<string, string>;

const REQUIRED_DOCUMENTS = ["identity_proof", "income_proof", "bank_statement"];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCurrency(value?: number | null) {
  if (!value || Number.isNaN(value)) {
    return "INR 0";
  }

  return currencyFormatter.format(value);
}

function formatCompactCurrency(value?: number | null) {
  if (!value || Number.isNaN(value)) {
    return "INR 0";
  }

  return `INR ${compactCurrencyFormatter.format(value)}`;
}

function titleize(value: string) {
  return value.replaceAll("_", " ");
}

function getStageTone(stage?: ApplicationLifecycle, approvalStatus?: ApprovalStatus) {
  if (approvalStatus === "rejected" || stage === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (approvalStatus === "approved" || stage === "approved" || stage === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (stage === "documents_pending" || stage === "under_review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getDocumentTone(status: ApplicationDocument["status"]) {
  switch (status) {
    case "verified":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "uploaded":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export default function ApplicationsDashboard({
  applications: initialApplications,
  documents: initialDocuments,
  isReviewerView,
  profile,
}: DashboardProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadState, setUploadState] = useState<UploadState>({});
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const documentsByApplication = useMemo(() => {
    const map = new Map<string, ApplicationDocument[]>();
    for (const document of documents) {
      const current = map.get(document.application_id) ?? [];
      current.push(document);
      map.set(document.application_id, current);
    }
    return map;
  }, [documents]);

  const totalApplications = applications.length;
  const approvedApplications = applications.filter((application) => application.approval_status === "approved").length;
  const approvalRate = totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0;
  const averageTicketSize = totalApplications > 0
    ? Math.round(
        applications.reduce((sum, application) => sum + Number(application.sanctioned_amount ?? application.loan_amount_requested ?? 0), 0) /
          totalApplications,
      )
    : 0;
  const documentsPending = documents.filter((document) => document.status === "pending" || document.status === "uploaded").length;

  const updateUploadState = (applicationId: string, patch: Partial<UploadState[string]>) => {
    setUploadState((current) => ({
      ...current,
      [applicationId]: {
        documentType: current[applicationId]?.documentType ?? REQUIRED_DOCUMENTS[0],
        fileName: current[applicationId]?.fileName ?? "",
        storagePath: current[applicationId]?.storagePath ?? "",
        ...patch,
      },
    }));
  };

  const upsertDocument = (document: ApplicationDocument) => {
    setDocuments((current) => {
      const existingIndex = current.findIndex((item) => item.id === document.id || (item.application_id === document.application_id && item.document_type === document.document_type));
      if (existingIndex === -1) {
        return [...current, document];
      }

      const next = [...current];
      next[existingIndex] = document;
      return next;
    });
  };

  const updateApplicationStage = (applicationId: string, stage: LoanApplication["application_stage"]) => {
    setApplications((current) =>
      current.map((application) =>
        application.id === applicationId ? { ...application, application_stage: stage ?? application.application_stage } : application,
      ),
    );
  };

  const handleUpload = async (applicationId: string) => {
    const currentForm = uploadState[applicationId] ?? {
      documentType: REQUIRED_DOCUMENTS[0],
      fileName: "",
      storagePath: "",
    };

    if (!currentForm.fileName.trim()) {
      setFeedback((current) => ({ ...current, [applicationId]: "Add a file name before uploading." }));
      return;
    }

    setBusyKey(`upload:${applicationId}`);
    setFeedback((current) => ({ ...current, [applicationId]: "Uploading document record..." }));

    const response = await fetch("/api/applications/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        documentType: currentForm.documentType,
        fileName: currentForm.fileName,
        storagePath: currentForm.storagePath,
      }),
    });

    const payload = await response.json();
    setBusyKey(null);

    if (!response.ok || !payload.success) {
      setFeedback((current) => ({ ...current, [applicationId]: payload.error ?? "Upload failed." }));
      return;
    }

    upsertDocument(payload.data);
    updateApplicationStage(applicationId, payload.applicationStage ?? "under_review");
    updateUploadState(applicationId, { fileName: "", storagePath: "" });
    setFeedback((current) => ({ ...current, [applicationId]: "Document record uploaded. Reviewer queue updated." }));
  };

  const handleReview = async (applicationId: string, documentId: string, status: "verified" | "rejected") => {
    const feedbackKey = `${applicationId}:${documentId}`;
    setBusyKey(feedbackKey);
    setFeedback((current) => ({ ...current, [applicationId]: `Marking document as ${status}...` }));

    const response = await fetch("/api/applications/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, documentId, status }),
    });

    const payload = await response.json();
    setBusyKey(null);

    if (!response.ok || !payload.success) {
      setFeedback((current) => ({ ...current, [applicationId]: payload.error ?? "Document review failed." }));
      return;
    }

    upsertDocument(payload.data);
    updateApplicationStage(applicationId, payload.applicationStage);
    setFeedback((current) => ({
      ...current,
      [applicationId]: status === "verified" ? "Document verified." : "Document sent back for correction.",
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {isReviewerView
              ? "Reviewer workspace with live application queues, document checks, and policy-aware statuses."
              : "Track your real loan applications, upload pending documents, and follow each decision stage."}
          </p>
        </div>
        <Badge className="border-slate-200 bg-slate-100 text-slate-700" variant="outline">
          {profile?.role ? `${profile.role} workspace` : "customer workspace"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Applications</CardDescription>
            <CardTitle>{totalApplications}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Approval Rate</CardDescription>
            <CardTitle>{approvalRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average Ticket Size</CardDescription>
            <CardTitle>{formatCompactCurrency(averageTicketSize)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Documents Awaiting Action</CardDescription>
            <CardTitle>{documentsPending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Case Queue</CardTitle>
          <CardDescription>
            {applications.length > 0
              ? "Application lifecycle, policy versioning, and document progress from live Supabase records."
              : "Your applications will appear here after you complete the chat-based underwriting flow."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No applications yet. Start in chat, complete underwriting, and approved cases will land here automatically.
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => {
                const relatedDocuments = documentsByApplication.get(application.id) ?? [];
                const uploadedCount = relatedDocuments.filter((document) => document.status !== "pending").length;
                const amount = Number(application.sanctioned_amount ?? application.loan_amount_requested ?? 0);
                const formState = uploadState[application.id] ?? {
                  documentType: relatedDocuments[0]?.document_type ?? REQUIRED_DOCUMENTS[0],
                  fileName: "",
                  storagePath: "",
                };

                return (
                  <div key={application.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3 xl:max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{application.full_name ?? "Applicant"}</p>
                          <Badge className={getStageTone(application.application_stage, application.approval_status)} variant="outline">
                            {titleize(application.application_stage ?? application.approval_status)}
                          </Badge>
                          {application.risk_band ? (
                            <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                              Risk: {application.risk_band}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-xs uppercase tracking-wide text-slate-500">Application ID: {application.id}</p>

                        <p className="text-sm text-slate-600">
                          Amount: {formatCurrency(amount)}
                          {application.monthly_income ? ` | Monthly income: ${formatCurrency(Number(application.monthly_income))}` : ""}
                          {application.employment_type ? ` | ${application.employment_type}` : ""}
                        </p>

                        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-3">
                          <p>
                            <span className="font-medium text-slate-900">Policy:</span> v{application.policy_version ?? 1}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">Documents:</span> {uploadedCount}/{relatedDocuments.length || 0}
                          </p>
                          <p>
                            <span className="font-medium text-slate-900">Updated:</span> {new Date(application.updated_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-900">Document checklist</p>
                          {relatedDocuments.length === 0 ? (
                            <p className="text-sm text-slate-500">No documents requested yet for this application.</p>
                          ) : (
                            <div className="space-y-2">
                              {relatedDocuments.map((document) => (
                                <div key={document.id} className="rounded-lg border border-slate-200 p-3">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-medium text-slate-900">{titleize(document.document_type)}</p>
                                      <p className="text-sm text-slate-600">{document.file_name}</p>
                                      {document.notes ? <p className="text-xs text-slate-500">Reviewer note: {document.notes}</p> : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className={getDocumentTone(document.status)} variant="outline">
                                        {titleize(document.status)}
                                      </Badge>
                                      {isReviewerView && document.status !== "verified" ? (
                                        <Button
                                          disabled={busyKey === `${application.id}:${document.id}`}
                                          onClick={() => handleReview(application.id, document.id, "verified")}
                                          size="sm"
                                          variant="outline"
                                        >
                                          Verify
                                        </Button>
                                      ) : null}
                                      {isReviewerView && document.status !== "rejected" ? (
                                        <Button
                                          disabled={busyKey === `${application.id}:${document.id}`}
                                          onClick={() => handleReview(application.id, document.id, "rejected")}
                                          size="sm"
                                          variant="destructive"
                                        >
                                          Reject
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {!isReviewerView ? (
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 xl:max-w-sm">
                          <p className="font-medium text-slate-900">Upload next document</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Add document records for reviewer verification. This keeps the lifecycle moving without leaving the dashboard.
                          </p>
                          <div className="mt-4 space-y-3">
                            <label className="block text-sm text-slate-700">
                              <span className="mb-1 block font-medium">Document type</span>
                              <select
                                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                                onChange={(event) => updateUploadState(application.id, { documentType: event.target.value })}
                                value={formState.documentType}
                              >
                                {[...new Set([...REQUIRED_DOCUMENTS, ...relatedDocuments.map((document) => document.document_type)])].map((option) => (
                                  <option key={option} value={option}>
                                    {titleize(option)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block text-sm text-slate-700">
                              <span className="mb-1 block font-medium">File name</span>
                              <Input
                                onChange={(event) => updateUploadState(application.id, { fileName: event.target.value })}
                                placeholder="salary-slip-march.pdf"
                                value={formState.fileName}
                              />
                            </label>
                            <label className="block text-sm text-slate-700">
                              <span className="mb-1 block font-medium">Storage path (optional)</span>
                              <Input
                                onChange={(event) => updateUploadState(application.id, { storagePath: event.target.value })}
                                placeholder="documents/app-id/salary-slip-march.pdf"
                                value={formState.storagePath}
                              />
                            </label>
                            <Button
                              className="w-full"
                              disabled={busyKey === `upload:${application.id}`}
                              onClick={() => handleUpload(application.id)}
                              type="button"
                            >
                              {busyKey === `upload:${application.id}` ? "Saving..." : "Upload document record"}
                            </Button>
                            {feedback[application.id] ? <p className="text-xs text-slate-600">{feedback[application.id]}</p> : null}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 xl:max-w-sm">
                          <p className="font-medium text-slate-900">Reviewer actions</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Verify uploaded documents, reject incorrect files, and the application lifecycle will update automatically.
                          </p>
                          <div className="mt-4 space-y-2 text-sm text-slate-600">
                            <p>
                              <span className="font-medium text-slate-900">Ready for completion:</span>{" "}
                              {relatedDocuments.length > 0 && relatedDocuments.every((document) => document.status === "verified") ? "Yes" : "Not yet"}
                            </p>
                            <p>
                              <span className="font-medium text-slate-900">Current stage:</span> {titleize(application.application_stage ?? application.approval_status)}
                            </p>
                            {feedback[application.id] ? <p className="text-xs text-slate-600">{feedback[application.id]}</p> : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
