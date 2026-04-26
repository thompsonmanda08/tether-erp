"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SearchFilters,
  WorkflowDocumentType,
  DocumentStatus,
} from "@/types/workflow";
import { Search } from "lucide-react";

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  isSearching: boolean;
}

const DOCUMENT_TYPES = [
  { value: "ALL", name: "All Document Types" },
  { value: "REQUISITION", name: "Requisitions" },
  { value: "PURCHASE_ORDER", name: "Purchase Orders" },
  { value: "PAYMENT_VOUCHER", name: "Payment Vouchers" },
  { value: "GOODS_RECEIVED_NOTE", name: "Goods Received Notes" },
];

const STATUSES = [
  { value: "ALL", name: "All Statuses" },
  { value: "DRAFT", name: "Draft" },
  { value: "SUBMITTED", name: "Submitted" },
  { value: "IN_REVIEW", name: "In Approval" },
  { value: "APPROVED", name: "Approved" },
  { value: "REVISION", name: "Revision" },
  { value: "REJECTED", name: "Rejected" },
  { value: "REVERSED", name: "Reversed" },
];

export function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentType, setDocumentType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      documentNumber,
      documentType: documentType as "ALL" | WorkflowDocumentType,
      status: status as "ALL" | DocumentStatus,
      startDate: startDate ? startDate.toISOString().split("T")[0] : "",
      endDate: endDate ? endDate.toISOString().split("T")[0] : "",
    });
  };

  const handleReset = () => {
    setDocumentNumber('')
    setDocumentType('ALL')
    setStatus('ALL')
    setStartDate(undefined)
    setEndDate(undefined)
    onSearch({
      documentNumber: '',
      documentType: 'ALL',
      status: 'ALL',
      startDate: '',
      endDate: '',
    })
  }

  return (
    <Card className="gradient-primary border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg text-primary-foreground">
          Search Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Row: Document Number and Type */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Document Number"
              placeholder="e.g., REQ-2024-001"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="bg-transparent border-0 text-white placeholder:text-white/60"
              classNames={{
                label: 'text-primary-foreground',
                input:
                  'backdrop-blur-md bg-white/10 rounded-lg border h-9 border-white/20 text-white placeholder:text-white/60',
              }}
            />

            <SelectField
              label="Document Type"
              value={documentType}
              onValueChange={setDocumentType}
              options={DOCUMENT_TYPES}
              placeholder="Select Document Type"
              classNames={{
                label: 'text-primary-foreground',
                input:
                  'backdrop-blur-md bg-white/10 rounded-lg border h-9 border-white/20 text-white placeholder:text-white/60',
              }}
            />
          </div>

          {/* Second Row: Status and Date Range */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SelectField
              label="Status"
              value={status}
              onValueChange={setStatus}
              options={STATUSES}
              placeholder="Select Status"
              classNames={{
                label: 'text-primary-foreground',
                input:
                  'backdrop-blur-md bg-white/10 rounded-lg border h-9 border-white/20 text-white placeholder:text-white/60',
              }}
            />

            <DatePicker
              value={startDate}
              label="Start Date"
              placeholder="-- Select Start Date --"
              onValueChange={setStartDate}
              classNames={{
                label: 'text-primary-foreground',
                input:
                  'backdrop-blur-md bg-white/10 rounded-lg border h-9 border-white/20 text-white placeholder:text-white/60',
              }}
            />

            <DatePicker
              value={endDate}
              label="End Date"
              placeholder="-- Select End Date --"
              onValueChange={setEndDate}
              classNames={{
                label: 'text-primary-foreground',
                input:
                  'backdrop-blur-md bg-white/10 rounded-lg border h-9 border-white/20 text-white placeholder:text-white/60',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleReset}
              disabled={isSearching}
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="gap-2"
              variant="outline"
              disabled={isSearching}
              isLoading={isSearching}
              loadingText="Searching..."
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
