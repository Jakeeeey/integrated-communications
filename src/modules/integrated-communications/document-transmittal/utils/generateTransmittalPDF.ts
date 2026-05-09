import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DocumentTransmittalHeader, DocumentTransmittalDetail } from "../types/document-transmittal.types";
import { formatDateTime } from "./helpers";
import QRCode from "qrcode";

/**
 * generateTransmittalPDF()
 * Generates a print-friendly PDF for a Document Transmittal.
 * Avoids dark fills and heavy colors to minimize ink/toner usage.
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

    // --- Generate QR Code for Transmittal No ---
    let qrDataUrl = "";
    try {
        qrDataUrl = await QRCode.toDataURL(header.documentTransmittalNo || "N/A", {
            margin: 0,
            scale: 4
        });
    } catch (err) {
        console.error("[PDF] QR Generation failed:", err);
    }

    // --- Header Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("DOCUMENT TRANSMITTAL", pageWidth / 2, 20, { align: "center" });

    // Single thin underline below title
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, 24, pageWidth - margin, 24);

    // --- QR Code (Top Right) ---
    if (qrDataUrl) {
        // Positioned at the top right, matching the header section height
        doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 22, 28, 22, 22);
    }

    // --- Transmittal Info ---
    doc.setFontSize(9);

    const labelX = margin;
    const valueX = margin + 38;

    const infoRows: [string, string][] = [
        ["Transmittal No.:", header.documentTransmittalNo || "N/A"],
        ["Date:", formatDateTime(header.createdAt)],
    ];

    let infoY = 32;
    for (const [label, value] of infoRows) {
        doc.setFont("helvetica", "bold");
        doc.text(label, labelX, infoY);
        doc.setFont("helvetica", "normal");
        doc.text(value, valueX, infoY);
        infoY += 7;
    }

    // --- Sender & Receiver (two-column layout) ---
    const colMid = pageWidth / 2;

    infoY += 2;
    const senderName = `${header.sender.userFname} ${header.sender.userLname}`;
    const receiverName = `${header.receiver.userFname} ${header.receiver.userLname}`;

    doc.setFont("helvetica", "bold");
    doc.text("Sender:", labelX, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(senderName, valueX, infoY);

    doc.setFont("helvetica", "bold");
    doc.text("Receiver:", colMid, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(receiverName, colMid + 22, infoY);

    // --- Table Section ---
    const tableData = details.map((d) => [
        d.invoice.invoiceNo || "N/A",
        d.invoice.invoiceDate ? formatDateTime(d.invoice.invoiceDate) : "N/A",
        d.invoice.customerName || d.invoice.customerCode || "WALK-IN",
    ]);

    autoTable(doc, {
        startY: infoY + 8,
        margin: { left: margin, right: margin },
        head: [["Invoice No.", "Invoice Date", "Customer Name"]],
        body: tableData,
        headStyles: {
            fillColor: false,           // No background fill
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "left",
            lineColor: [0, 0, 0],
            lineWidth: { bottom: 0.3, top: 0.3, left: 0, right: 0 },
        },
        styles: {
            fontSize: 9,
            cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0,               // No cell borders by default
        },
        columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 40 },
            2: { cellWidth: "auto" },
        },
        // Subtle alternate row shading — very light gray, print-friendly
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        // Only draw bottom border on each row (minimal grid)
        didDrawCell: (data) => {
            if (data.section === "body") {
                const { x, y, width, height } = data.cell;
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.2);
                doc.line(x, y + height, x + width, y + height);
            }
        },
    });

    // --- Signatures ---
    // @ts-expect-error: jspdf-autotable adds lastAutoTable to jsPDF instance
    const finalY = (doc as Record<string, unknown>).lastAutoTable.finalY + 15;

    doc.setFontSize(9);
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Released By
    doc.setFont("helvetica", "bold");
    doc.text("Released By:", margin, finalY);
    doc.line(margin, finalY + 10, margin + 65, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(senderName, margin, finalY + 15);

    // Received By
    const sigRightX = pageWidth - margin - 65;
    doc.setFont("helvetica", "bold");
    doc.text("Received By:", sigRightX, finalY);
    doc.line(sigRightX, finalY + 10, sigRightX + 65, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(receiverName, sigRightX, finalY + 15);

    return doc;
};