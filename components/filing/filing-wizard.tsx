// tax-client-portal/components/filing/filing-wizard.tsx

"use client";

import { FilingProvider } from "@/context/filing-context";
import { WizardOrchestrator } from "@/components/wizard/wizard-orchestrator";
import { TaxFilingSchema, Filing } from "@/lib/domain/types";
import { CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FilingWizardProps {
  filingId: string;
  initialPersonalFilingId?: string; // From URL query param - authoritative source
  initialData: Filing;
  schema: TaxFilingSchema;
}

export function FilingWizard({
  filingId,
  initialPersonalFilingId: urlPersonalFilingId,
  initialData,
  schema
}: FilingWizardProps) {
  // Check if filing is already submitted (UNDER_REVIEW, APPROVED, COMPLETED, REJECTED)
  const submittedStatuses = ['UNDER_REVIEW', 'APPROVED', 'COMPLETED', 'REJECTED'];
  const isAlreadySubmitted = submittedStatuses.includes(initialData.status);

  // Show blocking message if filing is already submitted
  if (isAlreadySubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="mx-auto max-w-lg rounded-2xl bg-white border border-gray-200 p-8 text-center shadow-sm">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#00754a]/10">
            <CheckCircle2 className="h-8 w-8 text-[#00754a]" />
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-bold text-gray-900">
            Filing Already Submitted
          </h2>
          <p className="mt-3 text-gray-500">
            Your {initialData.year} personal tax filing has already been submitted and is currently{" "}
            <span className="font-medium text-[#00754a]">
              {initialData.status === 'UNDER_REVIEW' ? 'under review' :
               initialData.status === 'APPROVED' ? 'approved' :
               initialData.status === 'COMPLETED' ? 'completed' :
               initialData.status === 'REJECTED' ? 'rejected' : initialData.status.toLowerCase()}
            </span>.
          </p>

          {/* Reference Number */}
          {initialData.referenceNumber && (
            <div className="mt-6 rounded-lg bg-gray-100 p-4">
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="mt-1 text-lg font-semibold text-[#00754a]">
                {initialData.referenceNumber}
              </p>
            </div>
          )}

          {/* Info message */}
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
            <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#00754a]" />
            <div className="text-sm text-gray-600">
              <p>
                You cannot make changes to a submitted filing. If you need to make corrections or have questions, please contact our support team.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="bg-[#00754a] hover:bg-[#005c3b] text-white">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild className="border-[#00754a] text-[#00754a] hover:bg-[#00754a]/10">
              <Link href="/contact">
                Contact Support
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Priority: URL param > initialData.personalFilings
  // URL param is set by new-filing-dialog and is the authoritative source
  const primaryFiling = initialData.personalFilings?.find(pf => pf.type === "primary")
  const dataPersonalFilingId = primaryFiling?.id || primaryFiling?.documentId || ""

  // Use URL param if provided, otherwise fall back to data
  const resolvedPersonalFilingId = urlPersonalFilingId || dataPersonalFilingId

  return (
    <FilingProvider
      filingId={filingId}
      initialData={initialData}
      schema={schema}
    >
      <WizardOrchestrator
        filingId={filingId}
        initialPersonalFilingId={resolvedPersonalFilingId}
      />
    </FilingProvider>
  );
}