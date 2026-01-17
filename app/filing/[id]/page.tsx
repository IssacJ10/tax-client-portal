"use client"

import { useEffect, useState } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import { FilingWizard } from "@/components/filing/filing-wizard";
import { FilingService } from "@/services/filing-service";
import { QuestionRegistry } from "@/lib/domain/question-registry";
import { FilingType } from "@/lib/domain/types";
import { Loader2 } from "lucide-react";

export default function FilingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  // Get the primary personal filing ID from URL query param (set by new-filing-dialog)
  const primaryFromUrl = searchParams?.get("primary") || "";

  const [filingData, setFilingData] = useState<any>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    async function loadFiling() {
      try {
        // 1. Fetch data from Strapi (client-side, with token)
        const data = await FilingService.getFiling(id);
        setFilingData(data);

        // 2. Load the correct schema
        const loadedSchema = QuestionRegistry.getSchema(
          data.year,
          data.type as FilingType
        );
        setSchema(loadedSchema);
      } catch (err) {
        console.error("Filing not found:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadFiling();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-card rounded-xl p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your filing...</p>
        </div>
      </div>
    );
  }

  if (error || !filingData || !schema) {
    notFound();
    return null;
  }

  // 3. Render - pass the primary ID from URL OR derive from loaded data
  // This ensures page refresh works correctly (URL param may be lost on refresh)
  const resolvedPrimaryId = primaryFromUrl ||
    filingData.personalFilings?.find((pf: any) => pf.type === "primary")?.id ||
    filingData.personalFilings?.[0]?.id ||
    // For corporate/trust filings
    filingData.corporateFiling?.id ||
    filingData.corporateFiling?.documentId ||
    filingData.trustFiling?.id ||
    filingData.trustFiling?.documentId ||
    "";

  return (
    <FilingWizard
      filingId={id}
      initialPersonalFilingId={resolvedPrimaryId}
      initialData={filingData}
      schema={schema}
    />
  );
}