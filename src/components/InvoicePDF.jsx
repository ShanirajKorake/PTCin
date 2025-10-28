import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Note: You must ensure these assets paths are correct relative to where this component is run.
import signImg from "../assets/sign.png";
import ptc4 from "../assets/ptc4.jpg"; // Header image
import ptc5 from "../assets/ptc5.jpg"; // Footer image
import PDFViewerComponent from "./PDFViewerComponent";


export default function InvoicePDF({ formData, vehicles }) {
    const [pdfData, setPdfData] = useState({ url: null, filename: null });

    useEffect(() => {
        // --- 1. Validation and Initial Setup ---
        if (!formData || !vehicles || vehicles.length === 0) {
            setPdfData({ url: null, filename: null });
            return;
        }

        // --- Helper function to convert number to words (Indian system) ---
        const numberToWords = (n) => {
            if (typeof n !== 'number' || isNaN(n)) return 'Zero';
            const num = Math.floor(n);
            if (num === 0) return 'Zero';

            const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
            const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

            const convertTens = (x) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + a[x % 10]);

            const convertHundreds = (x) => {
                let s = convertTens(x % 100);
                if (x > 99) s = a[Math.floor(x / 100)] + 'Hundred ' + s;
                return s;
            };

            let words = '';
            let tempNum = num;

            // Indian Numbering System
            let part = Math.floor(tempNum / 10000000); // Crores
            if (part > 0) words += convertTens(part) + 'Crore ';
            tempNum %= 10000000;

            part = Math.floor(tempNum / 100000); // Lakhs
            if (part > 0) words += convertTens(part) + 'Lakh ';
            tempNum %= 100000;

            part = Math.floor(tempNum / 1000); // Thousands
            if (part > 0) words += convertTens(part) + 'Thousand ';
            tempNum %= 1000;

            words += convertHundreds(tempNum);

            return words.trim() + ' Only';
        };
        // -------------------------------------------------------------------

        const doc = new jsPDF();

        // PDF Configuration Constants
        const PAGE_WIDTH = 210;
        const MARGIN = 10;

        // Define Column Widths based on USABLE_WIDTH = 190mm
        // Col Widths: [45 (Vehicle Info), 30 (Charge Name), 30 (Charge Amt), 30 (Total Freight), 30 (Total Adv), 25 (Balance Due)] = 190mm
        const COL_WIDTHS = [45, 30, 30, 30, 30, 25];

        // --- Custom Colors (Simplified Palette) ---
        const COLOR_WHITE = [255, 255, 255];
        const COLOR_LIGHT_GRAY = [240, 240, 240];
        const COLOR_MEDIUM_GRAY = [220, 220, 220];
        const COLOR_RED = [255, 0, 0];
        const COLOR_HIGHLIGHT_PARTY = [255, 255, 210]; // Pale Yellow/Cream 
        const COLOR_ACCENT_TOTAL = [0, 51, 102]; // Dark Blue 

        // Default Table Styles
        const TABLE_BASE_STYLES = {
            fontSize: 10,
            cellPadding: 1.5,
            textColor: [50, 50, 50],
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            margin: { left: MARGIN, right: MARGIN },
            styles: { fillColor: COLOR_WHITE, minCellHeight: 6 }
        };

        // Header Style (Medium Gray)
        const SECTION_HEAD_STYLES = {
            fillColor: COLOR_MEDIUM_GRAY,
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'center'
        };

        let currentY = 0;

        // --- 2. Data Aggregation for Vehicle Charges ---
        const getVehicleChargesData = () => {
            const totalFreightAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.totalFreight || 0), 0);
            const totalAdvanceAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.advance || 0), 0);
            const totalBalanceAgg = vehicles.reduce((sum, v) => sum + parseFloat(v.balance || 0), 0);

            const aggregateCharges = {
                Freight: vehicles.reduce((sum, v) => sum + parseFloat(v.freight || 0), 0),
                Unloading: vehicles.reduce((sum, v) => sum + parseFloat(v.unloadingCharges || 0), 0),
                Detention: vehicles.reduce((sum, v) => sum + parseFloat(v.detention || 0), 0),
                Weight: vehicles.reduce((sum, v) => sum + parseFloat(v.weightCharges || 0), 0),
                Others: vehicles.reduce((sum, v) => sum + parseFloat(v.others || 0), 0),
                Commission: vehicles.reduce((sum, v) => sum + parseFloat(v.commission || 0), 0),
            };

            const charges = [
                { label: 'Freight', value: aggregateCharges.Freight },
                { label: 'Unloading Ch.', value: aggregateCharges.Unloading },
                { label: 'Detention Ch.', value: aggregateCharges.Detention },
                { label: 'Weight Ch.', value: aggregateCharges.Weight },
                { label: 'Other Ch.', value: aggregateCharges.Others },
                { label: 'Commission', value: aggregateCharges.Commission },
            ].filter(c => c.value > 0 || c.label === 'Freight');

            return { charges, totalFreightAgg, totalAdvanceAgg, totalBalanceAgg };
        };

        const { charges, totalFreightAgg, totalAdvanceAgg, totalBalanceAgg } = getVehicleChargesData();

        // --- 3. Build the SINGLE LARGE TABLE Body (6 logical columns) ---
        const ALL_TABLE_BODY = [];

        // --- SECTION 1: PARTY DETAILS (Combined into one block, spanning 6 columns) ---
        ALL_TABLE_BODY.push([
            {
                // Combine Bill To: Party Name and Address into one cell
                content: `Bill To: ${formData.partyName || ''}`,
                colSpan: 6,
                styles: {
                    fontStyle: 'bold',
                    fontSize: 14,
                    fillColor: COLOR_WHITE,
                    textColor: [0, 0, 0],
                    halign: 'left',
                    minCellHeight: 6
                }
            }
        ]);
        ALL_TABLE_BODY.push([
            {
                // Combine Bill To: Party Name and Address into one cell
                content: `Address: ${formData.partyAddress || 'KALAMBOLI'}`,
                colSpan: 6,
                styles: {
                    fontStyle: 'bold',
                    fontSize: 10,
                    fillColor: COLOR_WHITE,
                    textColor: [0, 0, 0],
                    halign: 'left',
                    minCellHeight: 6
                }
            }
        ]);

        // --- SECTION 2: TRIP DETAILS (2 rows) ---
        // Row 1: Loading Date (colSpan 3) and Unloading Date (colSpan 3)
        ALL_TABLE_BODY.push([
            // Loading Date: Label and Value in one cell (colSpan 3)
            {
                content: `Loading Date: ${formData.loadingDate || ''}`,
                colSpan: 3,
                styles: {
                    fontStyle: 'bold',
                    fillColor: COLOR_WHITE,
                    halign: 'left',
                    fontSize: 10,
                    textColor: [0, 0, 0],
                }
            },

            // Unloading Date: Label and Value in one cell (colSpan 3)
            {
                content: `Unloading Date: ${formData.unloadingDate || ''}`,
                colSpan: 3,
                styles: {
                    fontStyle: 'bold',
                    fillColor: COLOR_WHITE,
                    halign: 'right',
                    fontSize: 10,
                    textColor: [0, 0, 0],
                }
            }
        ]);

        // Row 2: Trip locations - Now using 3 columns with colSpan 2 each (6 columns total)
        ALL_TABLE_BODY.push([
            // From: Label and Value in one cell (colSpan 2)
            {
                content: `From: ${formData.from || ''}`,
                styles: {
                    fontStyle: 'bold',
                    fillColor: COLOR_WHITE,
                    halign: 'left',
                    fontSize: 10,
                    textColor: [0, 0, 0],
                }
            },
            // To: Label and Value in one cell (colSpan 2)
            {
                content: `To: ${formData.to || ''}`,
                colSpan: 3,
                styles: {
                    fontStyle: 'bold',
                    fillColor: COLOR_WHITE,
                    halign: 'center',
                    fontSize: 10,
                    textColor: [0, 0, 0],
                }
            },
            // Back To: Label and Value in one cell (colSpan 2)
            {
                content: `Back To: ${formData.backTo || ''}`,
                colSpan: 2,
                styles: {
                    fontStyle: 'bold',
                    fillColor: COLOR_WHITE,
                    halign: 'right',
                    fontSize: 10,
                    textColor: [0, 0, 0],
                }
            }
        ]);

        // --- SECTION 3: VEHICLE/CHARGES (Main Content Header) ---
        ALL_TABLE_BODY.push([
            { content: 'Vehicle Information (LR/Vehicle/Container)', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Charge Name', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'Charge Amount (INR)', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'TOTAL FREIGHT', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'TOTAL ADVANCE', colSpan: 1, styles: SECTION_HEAD_STYLES },
            { content: 'BALANCE DUE', colSpan: 1, styles: SECTION_HEAD_STYLES }
        ]);

        // --- SECTION 3: VEHICLE/CHARGES (Main Content Body) ---
        const vehicleInfoContent = Array.from({ length: 5 }, (_, idx) => {
    const v = vehicles[idx];
    return v ? `${v.lrNo || ''}  ${v.vehicleNo || ''}  ${v.containerNo || ''}` : '\n \n ';
}).join('\n\n');



        const N_ROWS_FOR_CHARGES = charges.length || 1;

        for (let i = 0; i < N_ROWS_FOR_CHARGES; i++) {
            const charge = charges[i] || { label: '-', value: 0 };
            let row = [];

            // Col 1: Vehicle Info (Only in the first row, spans N rows)
            if (i === 0) {
                row.push({
                    content: vehicleInfoContent,
                    rowSpan: N_ROWS_FOR_CHARGES,
                    styles: {
                        fontStyle: 'bold',
                        fontSize: 8,
                        valign: 'top',
                        textColor: COLOR_RED,
                        fillColor: COLOR_WHITE,
                    }
                });
            }

            // Col 2 & 3: Charge Name and Amount
            row.push({ content: charge.label, styles: { fontSize: 10, fontStyle: 'normal', halign: 'left' } });
            row.push({ content: charge.value.toFixed(2), styles: { halign: 'right', fontSize: 10, fontStyle: 'normal' } });

            // Col 4, 5, 6: Totals (Only in the first row, spans N rows) - HIGHLIGHTED
            if (i === 0) {
                const totalColumns = [
                    { value: totalFreightAgg.toFixed(2) },
                    { value: totalAdvanceAgg.toFixed(2) },
                    { value: totalBalanceAgg.toFixed(2) }
                ];

                totalColumns.forEach(col => {
                    row.push({
                        content: col.value,
                        rowSpan: N_ROWS_FOR_CHARGES,
                        styles: {
                            fontStyle: 'bold',
                            fontSize: 10,
                            halign: 'right',
                            valign: 'top',
                            textColor: [50, 50, 50],
                            fillColor: COLOR_WHITE, // Dark Accent Blue for Totals
                        }
                    });
                });
            }

            ALL_TABLE_BODY.push(row);
        }

        // --- SECTION 4: GRAND AGGREGATE TOTALS (Summary) ---
        ALL_TABLE_BODY.push([
            {
                content: 'TOTAL (INR)',
                colSpan: 3,
                styles: {
                    fontStyle: 'bold', halign: 'right', fontSize: 10, fillColor: COLOR_LIGHT_GRAY,
                    textColor: [50, 50, 50],
                }
            },
            {
                content: totalFreightAgg.toFixed(2),
                styles: {
                    fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY,
                    textColor: [50, 50, 50],
                }
            },
            {
                content: totalAdvanceAgg.toFixed(2),
                styles: {
                    fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY,
                    textColor: [50, 50, 50],
                }
            },
            {
                content: totalBalanceAgg.toFixed(2),
                styles: {
                    fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: COLOR_LIGHT_GRAY,
                    textColor: [50, 50, 50],
                }
            }
        ]);

        // --- SECTION 5: TOTAL DUE IN WORDS (Combined into one row, Increased Height) ---
        const totalDueAmount = totalBalanceAgg.toFixed(2);
        const totalDueWords = numberToWords(totalBalanceAgg);

        ALL_TABLE_BODY.push([
            {
                content: `Total Balance Due: INR ${totalDueAmount}\n(In Words: ${totalDueWords})`,
                colSpan: 6,
                styles: {
                    fontStyle: 'bold',
                    textColor: [255, 0, 0],
                    fontSize: 10,
                    halign: 'right',
                    fillColor: COLOR_LIGHT_GRAY, // Reuse light accent color for final amount
                    cellPadding: 3,
                    minCellHeight: 12
                }
            }
        ]);


        // --- SECTION 6: BANK DETAILS AND TERMS ---
        // ALL_TABLE_BODY.push([
        //     { content: 'BANK DETAILS & TERMS', colSpan: 6, styles: { ...SECTION_HEAD_STYLES, fontSize: 8.5, fillColor: COLOR_MEDIUM_GRAY } }
        // ]);

        const bankDetailsContent =
            `PAN NO.: AWWPP1314Q\n` +
            `Bank Account Details:\n` +
            `Name: PALAK TRANSPORT CORP\n` +
            `Bank: HDFC BANK LTD.\n` +
            `A/c No.: 50200044714511\n` +
            `IFSC: HDFC0002822\n` +
            `Branch: KALAMBOLI`;

        const termsContent =
            `Note:\n\n` +
            `1) 12% Interest will be charged if the payment of this bill is not made within 15 days from the date of bill.\n\n` +
            `2) You are requested to make payment to this bill by cross or order cheque in favour of "PALAK TRANSPORT CORP"`;

        ALL_TABLE_BODY.push([
            {
                content: bankDetailsContent,
                colSpan: 2,
                styles: { fontStyle: 'normal', fontSize: 10, valign: 'top', cellPadding: 2, fillColor: COLOR_WHITE }
            },
            {
                content: termsContent,
                colSpan: 4,
                styles: { fontStyle: 'normal', fontSize: 10, valign: 'top', halign: 'left', cellPadding: 2, fillColor: COLOR_WHITE }
            }
        ]);


        // --- 4. Document Content Generation ---

        // 4.1 Header Image
        doc.addImage(ptc4, "JPEG", 0, 0, PAGE_WIDTH, 58.03);
        currentY = 62;

        // 4.2 Invoice/Date Info 
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 0, 0);
        doc.text(`BILL NO. ${formData.invoiceNo || '1'}`, MARGIN + 1, currentY);
        doc.setTextColor(0, 0, 0);
        doc.text(`DATE: ${formData.billDate || ''}`, PAGE_WIDTH - 11, currentY, { align: 'right' });

        currentY += 2;

        // 4.3 SINGLE LARGE TABLE
        autoTable(doc, {
            ...TABLE_BASE_STYLES,
            startY: currentY,
            head: [],
            body: ALL_TABLE_BODY,
            theme: 'grid',

            // Define 6 columns using the fixed widths
            columnStyles: {
                0: { cellWidth: COL_WIDTHS[0], halign: 'left' },
                1: { cellWidth: COL_WIDTHS[1], halign: 'left' },
                2: { cellWidth: COL_WIDTHS[2], halign: 'right' }, // Right align charge amounts
                3: { cellWidth: COL_WIDTHS[3], halign: 'right' },
                4: { cellWidth: COL_WIDTHS[4], halign: 'right' },
                5: { cellWidth: COL_WIDTHS[5], halign: 'right' },
            },
        });

        currentY = doc.lastAutoTable.finalY + 3;

        // --- 4.4 Signatures (OUT OF TABLE) ---
        const SIGNATURE_Y_POS = 297 - 40;

        const X_PREPARED = MARGIN + COL_WIDTHS[0] / 2;
        const X_CHECKED = MARGIN + COL_WIDTHS[0] + COL_WIDTHS[1] + COL_WIDTHS[2] / 2;

        // Draw Text Labels
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        // doc.text('Prepared By.', X_PREPARED, SIGNATURE_Y_POS, { align: 'center' });
        // doc.text('Checked By.', X_CHECKED, SIGNATURE_Y_POS, { align: 'center' });

        // Authorized Signatory (Right side)
        const SIGNATURE_IMAGE_WIDTH = 35;
        const SIGNATURE_IMAGE_HEIGHT = 25;
        const IMAGE_X_POS = PAGE_WIDTH - MARGIN - SIGNATURE_IMAGE_WIDTH - 10;

        doc.addImage(
            signImg,
            "PNG",
            IMAGE_X_POS,
            SIGNATURE_Y_POS - SIGNATURE_IMAGE_HEIGHT - 4,
            SIGNATURE_IMAGE_WIDTH,
            SIGNATURE_IMAGE_HEIGHT
        );

        doc.setFont(undefined, 'bold');
        doc.text('Authorised Signatory', PAGE_WIDTH - 17, SIGNATURE_Y_POS - 3, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.text('for PALAK TRANSPORT CORP.', PAGE_WIDTH - MARGIN, SIGNATURE_Y_POS + 3, { align: 'right' });

        currentY = SIGNATURE_Y_POS + 5;

        // 4.5 Footer Image 
        const FOOTER_HEIGHT = 33.12;
        doc.addImage(ptc5, "JPEG", 0, 297 - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT);

        // --- 5. Final Output ---
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);

        const invoiceNo = formData.invoiceNo || 'DRAFT';
        const filename = `Invoice_${invoiceNo}.pdf`;

        setPdfData({ url, filename });

        return () => URL.revokeObjectURL(url);
    }, [formData, vehicles]);

    // Download logic remains the same
    const handleDownload = () => {
        if (pdfData.url && pdfData.filename) {
            const link = document.createElement('a');
            link.href = pdfData.url;
            link.download = pdfData.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="mx-auto">
    

    {/* PDF Viewer Container */}
    <div 
        // Fixed height for mobile viewing, full width, rounded corners
        className="w-full h-115  border border-gray-300 rounded-xl overflow-hidden shadow-lg bg-white"
    >
        {pdfData.url ? (
            // <iframe
            //     src={pdfData.url}
            //     title="Invoice PDF"
            //     // Tailwind equivalents for width/height 100% and no border
            //     className="w-full h-full border-none" 
            // />
            <PDFViewerComponent pdfUrl={pdfData.url} />
        ) : (
            <div className="p-5 h-full flex items-center justify-center">
                <p className="text-gray-600 text-lg font-medium animate-pulse">
                    📄 Loading PDF...
                </p>
            </div>
        )}
    </div>

        <div className=" flex justify-center mt-4">
        <button
            onClick={handleDownload}
            disabled={!pdfData.url}
            // M3-like Filled Button style (Green/Success color)
            className={`
                px-4 py-2.5 
                text-white font-semibold 
                rounded-lg shadow-md transition-all duration-200 
                ${pdfData.url 
                    ? 'bg-green-600 hover:bg-green-700 active:shadow-none' 
                    : 'bg-gray-400 cursor-not-allowed'
                }
            `}
        >
            Download ({pdfData.filename || 'PDF'})
        </button>
    </div>

</div>
    );
}