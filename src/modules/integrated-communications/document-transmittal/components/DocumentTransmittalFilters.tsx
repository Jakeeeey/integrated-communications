"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useDocumentTransmittalFilter } from "../context/DocumentTransmittalFilterContext";
import { Combobox } from "./Combobox";
import { TransmittalStatus } from "../types/document-transmittal.types";

interface DocumentTransmittalFiltersProps {
    availableSenders: { label: string; value: string }[];
    availableReceivers: { label: string; value: string }[];
    isLoading?: boolean;
}

export function DocumentTransmittalFilters({
    availableSenders,
    availableReceivers,
    isLoading = false,
}: DocumentTransmittalFiltersProps) {
    const {
        stagedSenderId,
        setStagedSenderId,
        stagedReceiverId,
        setStagedReceiverId,
        stagedStatus,
        setStagedStatus,
        stagedDateRange,
        setStagedDateRange,
        applyFilters,
        resetFilters,
        isDirty,
    } = useDocumentTransmittalFilter();

    return (
        <div className="flex flex-col gap-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Range Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-8 w-fit justify-start text-left text-xs font-medium",
                                    !stagedDateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {stagedDateRange?.from ? (
                                    stagedDateRange.to ? (
                                        <>
                                            {format(stagedDateRange.from, "LLL dd, y")} -{" "}
                                            {format(stagedDateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(stagedDateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Date Range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={stagedDateRange?.from}
                                selected={stagedDateRange}
                                onSelect={setStagedDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Sender Filter */}
                    <Combobox
                        options={[
                            { value: "", label: "All Senders" },
                            ...availableSenders
                        ]}
                        value={stagedSenderId || ""}
                        onValueChange={(v) => setStagedSenderId(v || null)}
                        placeholder="Search Sender..."
                        className="h-8 w-fit text-xs"
                    />

                    {/* Receiver Filter */}
                    <Combobox
                        options={[
                            { value: "", label: "All Receivers" },
                            ...availableReceivers
                        ]}
                        value={stagedReceiverId || ""}
                        onValueChange={(v) => setStagedReceiverId(v || null)}
                        placeholder="Search Receiver..."
                        className="h-8 w-fit text-xs"
                    />

                    {/* Status Filter */}
                    <Select
                        value={stagedStatus || "All"}
                        onValueChange={(v) => setStagedStatus(v as TransmittalStatus | "All")}
                    >
                        <SelectTrigger className="h-8 text-xs font-medium min-w-[120px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Partially Received">Partially Received</SelectItem>
                            <SelectItem value="Fully Received">Fully Received</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Apply Button */}
                    <Button
                        size="sm"
                        className={cn(
                            "h-8 px-4 text-xs font-semibold transition-all",
                            isDirty
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted text-muted-foreground opacity-70",
                        )}
                        onClick={applyFilters}
                        disabled={!isDirty || isLoading}
                    >
                        {isLoading ? "Loading..." : "Apply Filters"}
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={resetFilters}
                    >
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Reset
                    </Button>
                </div>
            </div>
        </div>
    );
}
