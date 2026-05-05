"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { DateRange } from "react-day-picker";
import { TransmittalStatus } from "../types/document-transmittal.types";

interface DocumentTransmittalFilterContextType {
  // Applied filters (used by hooks to fetch data)
  senderId: string | null;
  receiverId: string | null;
  dateRange: DateRange | undefined;
  status: TransmittalStatus | "All";
  search: string;

  // Staged filters (used by UI inputs)
  stagedSenderId: string | null;
  stagedReceiverId: string | null;
  stagedDateRange: DateRange | undefined;
  stagedStatus: TransmittalStatus | "All";

  // Setters for staged filters
  setStagedSenderId: (id: string | null) => void;
  setStagedReceiverId: (id: string | null) => void;
  setStagedDateRange: (range: DateRange | undefined) => void;
  setStagedStatus: (status: TransmittalStatus | "All") => void;
  setSearch: (search: string) => void;

  // Actions
  applyFilters: () => void;
  resetFilters: () => void;
  isDirty: boolean;
}

const DocumentTransmittalFilterContext = createContext<DocumentTransmittalFilterContextType | undefined>(
  undefined,
);

export function DocumentTransmittalFilterProvider({ children }: { children: ReactNode }) {
  // Applied state
  const [senderId, setSenderId] = useState<string | null>(null);
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [status, setStatus] = useState<TransmittalStatus | "All">("All");
  const [search, setSearch] = useState("");

  // Staged state
  const [stagedSenderId, setStagedSenderId] = useState<string | null>(null);
  const [stagedReceiverId, setStagedReceiverId] = useState<string | null>(null);
  const [stagedDateRange, setStagedDateRange] = useState<DateRange | undefined>(undefined);
  const [stagedStatus, setStagedStatus] = useState<TransmittalStatus | "All">("All");

  const applyFilters = () => {
    setSenderId(stagedSenderId);
    setReceiverId(stagedReceiverId);
    setDateRange(stagedDateRange);
    setStatus(stagedStatus);
  };

  const resetFilters = () => {
    setStagedSenderId(null);
    setStagedReceiverId(null);
    setStagedDateRange(undefined);
    setStagedStatus("All");
    setSearch("");

    setSenderId(null);
    setReceiverId(null);
    setDateRange(undefined);
    setStatus("All");
  };

  const isDirty =
    stagedSenderId !== senderId ||
    stagedReceiverId !== receiverId ||
    stagedDateRange !== dateRange ||
    stagedStatus !== status;

  return (
    <DocumentTransmittalFilterContext.Provider
      value={{
        senderId,
        receiverId,
        dateRange,
        status,
        search,

        stagedSenderId,
        stagedReceiverId,
        stagedDateRange,
        stagedStatus,

        setStagedSenderId,
        setStagedReceiverId,
        setStagedDateRange,
        setStagedStatus,
        setSearch,

        applyFilters,
        resetFilters,
        isDirty,
      }}
    >
      {children}
    </DocumentTransmittalFilterContext.Provider>
  );
}

export function useDocumentTransmittalFilter() {
  const context = useContext(DocumentTransmittalFilterContext);
  if (context === undefined) {
    throw new Error("useDocumentTransmittalFilter must be used within a DocumentTransmittalFilterProvider");
  }
  return context;
}
