import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, CheckCircle, Edit, Copy } from 'lucide-react';
import { getInvoicesHistory, deleteInvoice, clearInvoiceDue } from '../services/dbService';
import InvoicePDF from '../components/InvoicePDF';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// NOTE: This component now requires a single navigation function from the parent.
export default function History({ theme, onNavigateToForm }) {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [previewData, setPreviewData] = useState(null);

    // --- Data Fetching and General Handlers (omitted for brevity, assume they are correct) ---
    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const fetchedInvoices = await getInvoicesHistory();
            const sortedInvoices = fetchedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setInvoices(sortedInvoices);
        } catch (e) {
            console.error("Failed to load history:", e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Delete Handler ---
    const handleDelete = async (id, partyName) => {
        if (window.confirm(`Are you sure you want to permanently delete the invoice for "${partyName}"? This cannot be undone.`)) {
            try {
                await deleteInvoice(id);
                setExpandedId(null);
                setPreviewData(null);
                await loadHistory();
            } catch (error) {
                alert("Could not delete invoice. Please try again.");
                console.error("Deletion error:", error);
            }
        }
    };

    // --- Clear Due Handler (NEW) ---
    const handleClearDue = async (id, partyName) => {
        if (window.confirm(`Confirm payment received for ${partyName}? This will set the balance due to zero.`)) {
            try {
                await clearInvoiceDue(id);
                setExpandedId(null); // Collapse view after action
                await loadHistory(); // Refresh the list
            } catch (error) {
                alert("Could not update payment status. Please try again.");
                console.error("Clear Due error:", error);
            }
        }
    };


    const toggleExpand = (id) => {
        if (expandedId === id) {
            setPreviewData(null);
        }
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    // --- Generate PDF Data for Preview ---
    const handleGeneratePDF = (invoice) => {
        setPreviewData({
            formData: invoice.formData,
            vehicles: invoice.vehicles,
            // Mock URL/Filename needed for preview component
            url: "data:application/pdf;base64,Base64_PDF_Content",
            filename: `Invoice_${invoice.formData.invoiceNo}_${new Date().getFullYear()}.pdf`
        });
    };

    const closePreview = () => {
        setPreviewData(null);
    };

    // --- CAPACITOR SHARE LOGIC (Unchanged from last correct version) ---
    const handleShare = async () => {
        if (!previewData || !previewData.url) return;
        const { url, filename } = previewData;

        try {
            const writeResult = await Filesystem.writeFile({
                path: filename,
                data: url,
                directory: Directory.Cache,
                recursive: true
            });

            await Share.share({
                title: filename,
                text: 'Here is your historical invoice.',
                url: writeResult.uri,
            });

        } catch (e) {
            console.error('Error sharing PDF:', e);
            alert('Failed to share PDF.');
        }
    };

    // --- Initial Load Effect ---
    useEffect(() => {
        loadHistory();
    }, []);

    // --- NEW: Data Preparation Functions ---

    const prepareDataForEdit = (invoice) => {
        // For editing, keep EVERYTHING (ID, InvoiceNo, Dates) the same.
        const title = `Editing Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(invoice, 'edit', title);
    };

    const prepareDataForDuplicate = (invoice) => {
        // For duplicating, copy details but reset system-generated fields:
        const duplicatedData = {
            ...invoice,
            formData: {
                ...invoice.formData,
                // The new invoice form must generate a new P000XX number
                invoiceNo: "Loading...",
                // Set bill date to today
                billDate: new Date().toISOString().split("T")[0]
            },
            // Reset system ID (timestamp) to ensure it saves as a new unique entry
            id: null,
        };
        const title = `Duplicating Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(duplicatedData, 'duplicate', title);
    };


    // --- Dynamic Theme Classes (Omitted for brevity) ---
    const isLight = theme === "light";
    const titleClasses = isLight ? "text-indigo-600" : "text-indigo-400";
    const cardClasses = isLight ? "bg-white shadow-lg border border-gray-200" : "bg-gray-800 shadow-xl border border-gray-700";
    const subTextClasses = isLight ? "text-gray-600" : "text-gray-400";
    const summaryHeaderClasses = isLight ? "bg-indigo-100 text-indigo-800" : "bg-indigo-900/40 text-indigo-300";
    const containerClasses = isLight ? "bg-gray-50 text-gray-800" : "bg-gray-900 text-white";
    const textClasses = isLight ? "text-gray-500" : "text-gray-300";
    // ... (rest of theme classes)

    if (isLoading) {
        return (
            <div className={`p-4 pt-20 text-center ${containerClasses}`}>
                <p className={`${textClasses} animate-pulse`}>Loading invoice history...</p>
            </div>
        );
    }

    // --- Display PDF Preview if data is set (Unchanged) ---
    if (previewData) {
        return (
            <div className={`p-4 pt-20 pb-20 w-full ${containerClasses}`}>
                <div className="flex justify-between items-center mb-4 max-w-lg mx-auto">
                    <h3 className={`text-xl font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>Invoice Preview</h3>
                    <button
                        onClick={closePreview}
                        className={`flex items-center gap-1 ${isLight ? 'text-gray-600 border border-gray-300 hover:bg-gray-100' : 'text-gray-300 border border-gray-600 hover:bg-gray-700'} px-3 py-1.5 rounded-lg transition text-sm font-medium`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg> Back
                    </button>
                </div>
                {/* NOTE: handleDownload is omitted here as it wasn't defined in the prompt's History.jsx */}
                <InvoicePDF
                    formData={previewData.formData}
                    vehicles={previewData.vehicles}
                    theme={theme}
                    pdfData={previewData}
                    handleShare={handleShare}
                    handleDone={closePreview}
                />
            </div>
        );
    }



    return (
        <div className={`p-4 pt-20 pb-20 w-full ${containerClasses}`}>
            <h2 className={`text-4xl font-extrabold mb-8 text-center ${titleClasses}`}>
                Invoice History
            </h2>

            <div className="space-y-4 max-w-lg mx-auto">
                {/* ... (invoices.length === 0 block) ... */}
                {invoices.map((invoice) => {
                    // ... (invoice setup and theme logic) ...
                    const isExpanded = invoice.id === expandedId;
                    const summary = invoice.summary;
                    const formData = invoice.formData;
                    const vehicles = invoice.vehicles;
                    const balanceDue = parseFloat(summary.totalBalance || 0);
                    const isDue = balanceDue > 0.01;
                    const totalBalanceFormatted = balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const dateFormatted = new Date(formData.billDate).toLocaleDateString('en-IN');

                    return (
                        <div key={invoice.id} className={`rounded-xl shadow-md transition-all duration-300 ${cardClasses} overflow-hidden`}>
                            {/* ... (Initial Entry Button) ... */}
                            <button
                                onClick={() => toggleExpand(invoice.id)}
                                className="w-full p-4 flex justify-between items-center text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-lg ${titleClasses} truncate`}>{formData.partyName}</p>
                                    <p className={`text-sm ${subTextClasses} mt-1`}>Inv No: {formData.invoiceNo} • Date: {dateFormatted}</p>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    <p className={`font-bold text-lg ${isDue ? 'text-red-500' : 'text-green-500'}`}>₹{totalBalanceFormatted}</p>
                                    {isExpanded ? <ChevronUp size={20} className={titleClasses} /> : <ChevronDown size={20} className={titleClasses} />}
                                </div>
                            </button>

                            {/* --- EXPANDABLE CONTENT --- */}
                            {isExpanded && (
                                <div className={`p-4 border-t ${isLight ? 'border-gray-300' : 'border-gray-600'} space-y-4`}>

                                    {/* ... (Trip Details, Vehicle List, Financial Summary sections) ... */}
                                    {/* 1. Trip Details (Unchanged) */}
                                    <h4 className={`font-bold mt-2 ${titleClasses}`}>Trip Details</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <p className={`font-semibold ${subTextClasses}`}>Address:</p>
                                        <p className={`${subTextClasses}`}>{formData.partyAddress}</p>
                                        <p className={`font-semibold ${subTextClasses}`}>Trip:</p>
                                        <p className={`${subTextClasses}`}>{formData.from} to {formData.to} to {formData.backTo}</p>
                                        <p className={`font-semibold ${subTextClasses}`}>Dates:</p>
                                        <p className={`${subTextClasses}`}>{new Date(formData.loadingDate).toLocaleDateString()} to {new Date(formData.unloadingDate).toLocaleDateString()}</p>
                                    </div>

                                    {/* 2. Vehicles List with Detailed Charges (Unchanged) */}
                                    <h4 className={`font-bold pt-4 ${titleClasses}`}>Vehicles ({vehicles.length})</h4>
                                    <div className="space-y-3">
                                        {vehicles.map((v, index) => (
                                            <div key={index} className={`p-3 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-gray-700'} text-xs border ${isLight ? 'border-gray-200' : 'border-gray-600'}`}>
                                                <p className="font-semibold text-sm mb-2">{v.vehicleNo} (LR: {v.lrNo})</p>

                                                {/* CHARGES BREAKDOWN */}
                                                <div className="grid grid-cols-2 gap-1">
                                                    {['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'commission', 'advance'].map(field => (
                                                        <div key={field} className="flex justify-between col-span-1">
                                                            <p className="font-medium capitalize text-gray-500/70">{field.replace(/([A-Z])/g, ' $1').trim()}:</p>
                                                            <p className="font-semibold">{parseFloat(v[field]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-2 pt-2 border-t border-dashed flex justify-between">
                                                    <p className="font-extrabold text-red-500">Balance Due:</p>
                                                    <p className="font-extrabold text-red-500">₹{parseFloat(v.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3. Financial Summary (Unchanged) */}
                                    <div className={`mt-3 p-3 rounded-xl ${summaryHeaderClasses}`}>
                                        <h4 className="font-bold mb-2">Invoice Summary</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p>Gross Freight:</p>
                                            <p className="font-bold text-right">₹{parseFloat(summary.totalFreight).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                            <p>Total Advance:</p>
                                            <p className="font-bold text-right">₹{parseFloat(summary.totalAdvance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                            <p className="font-extrabold text-lg ${isDue ? 'text-red-400' : 'text-green-500'}">Balance Due:</p>
                                            <p className="font-extrabold text-lg text-right ${isDue ? 'text-red-400' : 'text-green-500'}">₹{totalBalanceFormatted}</p>
                                        </div>
                                    </div>



                                    {/* --- PRIMARY ACTION BUTTONS: Clear Due / Generate PDF --- */}
                                    <div className="flex justify-between pt-4 space-x-4">
                                        {/* Conditional Clear Due Button / PAID Status (Omitted for brevity) */}
                                        {isDue ? (
                                            <button
                                                onClick={() => handleClearDue(invoice.id, formData.partyName)}
                                                className={`flex-1 flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-green-700 transition-all duration-300 text-lg font-semibold tracking-wide`}
                                            >
                                                <CheckCircle size={20} className="mr-2" />
                                                Clear Due
                                            </button>
                                        ) : (
                                            <div className="flex-1 text-center py-3">
                                                <p className="text-sm font-semibold text-green-500">PAID</p>
                                            </div>
                                        )}

                                        {/* GENERATE PDF BUTTON */}
                                        <button
                                            onClick={() => handleGeneratePDF(invoice)}
                                            className={`flex-1 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all duration-300 text-lg font-semibold tracking-wide`}
                                        >
                                            Generate PDF
                                        </button>
                                    </div>

                                    {/* --- SECONDARY ACTION BUTTONS: Edit, Duplicate, Delete --- */}
                                    <div className={`flex justify-between pt-2 space-x-2 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>

                                        {/* EDIT Button */}
                                        <button
                                            onClick={() => prepareDataForEdit(invoice)} // Call new prep function
                                            className={`flex-1 flex items-center justify-center bg-yellow-600 text-white px-3 py-2 rounded-xl shadow-md hover:bg-yellow-700 transition text-sm font-medium`}
                                        >
                                            <Edit size={16} className="mr-1" />
                                            Edit
                                        </button>

                                        {/* DUPLICATE Button */}
                                        <button
                                            onClick={() => prepareDataForDuplicate(invoice)} // Call new prep function
                                            className={`flex-1 flex items-center justify-center bg-blue-600 text-white px-3 py-2 rounded-xl shadow-md hover:bg-blue-700 transition text-sm font-medium`}
                                        >
                                            <Copy size={16} className="mr-1" />
                                            Duplicate
                                        </button>

                                        {/* DELETE Button */}
                                        <button
                                            onClick={() => handleDelete(invoice.id, formData.partyName)}
                                            className={`flex-1 flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded-xl shadow-md hover:bg-red-700 transition text-sm font-medium`}
                                        >
                                            <Trash2 size={16} className="mr-1" />
                                            Delete
                                        </button>
                                    </div>

                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}