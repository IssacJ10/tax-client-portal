// tax-client-portal/context/filing-context.tsx

"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { TaxFilingSchema, Filing } from "@/lib/domain/types";
import { useFiling } from "@/hooks/use-filing";

interface FilingContextType {
    filingId: string;
    schema: TaxFilingSchema;
    filing: Filing | undefined;
    state: any;
    dispatch: any;
    isLoading: boolean;
    isSyncing: boolean;
    addSpouse: () => Promise<any>;
    addDependent: () => Promise<any>;
    startDependent: (personalFilingId: string, index: number) => void;
    createPrimaryFiling: (filingId: string) => Promise<any>;
    markFilingInProgress: (filingId: string) => Promise<void>;
    saveFormData: (id: string, data: any) => Promise<void>;
    flushSave: () => Promise<void>;
    submitForReview: () => Promise<Filing | null>;
    refreshFiling: () => Promise<void>;
}

const FilingContext = createContext<FilingContextType | undefined>(undefined);

interface FilingProviderProps {
    children: ReactNode;
    filingId: string;
    initialData: Filing;
    schema: TaxFilingSchema;
}

export function FilingProvider({
    children,
    filingId,
    initialData,
    schema
}: FilingProviderProps) {

    // Use the hook with the initial data from server
    const filingLogic = useFiling(filingId, initialData);

    return (
        <FilingContext.Provider
            value={{
                filingId,
                schema,
                filing: filingLogic.filing || initialData,
                state: filingLogic.state,
                dispatch: filingLogic.dispatch,
                isLoading: filingLogic.isLoading,
                isSyncing: filingLogic.isSyncing,
                addSpouse: filingLogic.addSpouse,
                addDependent: filingLogic.addDependent,
                startDependent: filingLogic.startDependent,
                createPrimaryFiling: filingLogic.createPrimaryFiling,
                markFilingInProgress: filingLogic.markFilingInProgress,
                saveFormData: filingLogic.saveFormData,
                flushSave: filingLogic.flushSave,
                submitForReview: filingLogic.submitForReview,
                refreshFiling: filingLogic.refreshFiling,
            }}
        >
            {children}
        </FilingContext.Provider>
    );
}

export function useFilingContext() {
    const context = useContext(FilingContext);
    if (context === undefined) {
        throw new Error("useFilingContext must be used within a FilingProvider");
    }
    return context;
}