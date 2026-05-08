import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DocumentTransmittalHeader, DocumentTransmittalDetail } from "../types/document-transmittal.types";
import { formatDateTime } from "./helpers";

/**
 * generateTransmittalPDF()
 * Generates a professional PDF for a Document Transmittal.
 */
export const generateTransmittalPDF = async (
    header: DocumentTransmittalHeader,
    details: DocumentTransmittalDetail[]
): Promise<jsPDF> => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // --- Header Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DOCUMENT TRANSMITTAL", pageWidth / 2, 20, { align: "center" });

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, 25, pageWidth - margin, 25);

    // --- Transmittal Info ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Transmittal Number:", margin, 35);
    doc.setFont("helvetica", "normal");
    doc.text(header.documentTransmittalNo || "N/A", margin + 40, 35);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.text(formatDateTime(header.createdAt), margin + 40, 42);

    // --- Sender & Receiver ---
    doc.setFont("helvetica", "bold");
    doc.text("Sender:", margin, 52);
    doc.setFont("helvetica", "normal");
    const senderName = `${header.sender.userFname} ${header.sender.userLname}`;
    doc.text(senderName, margin + 40, 52);

    doc.setFont("helvetica", "bold");
    doc.text("Receiver:", margin, 59);
    doc.setFont("helvetica", "normal");
    const receiverName = `${header.receiver.userFname} ${header.receiver.userLname}`;
    doc.text(receiverName, margin + 40, 59);

    // --- Table Section ---
    const tableData = details.map((d) => [
        d.invoice.invoiceNo || "N/A",
        d.invoice.invoiceDate ? formatDateTime(d.invoice.invoiceDate) : "N/A",
        d.invoice.customerName || d.invoice.customerCode || "WALK-IN",
    ]);

    autoTable(doc, {
        startY: 70,
        margin: { left: margin, right: margin },
        head: [["Invoice No.", "Invoice Date", "Customer Name"]],
        body: tableData,
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "left",
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 40 },
            2: { cellWidth: "auto" },
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
    });

    // --- Signatures ---
    // @ts-expect-error: jspdf-autotable adds lastAutoTable to jsPDF instance
    const finalY = (doc as Record<string, unknown>).lastAutoTable.finalY + 20;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Released By:", margin, finalY);
    doc.line(margin, finalY + 10, margin + 60, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(senderName, margin, finalY + 15);

    doc.setFont("helvetica", "bold");
    doc.text("Received By:", pageWidth - margin - 60, finalY);
    doc.line(pageWidth - margin - 60, finalY + 10, pageWidth - margin, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(receiverName, pageWidth - margin - 60, finalY + 15);

    return doc;
};
