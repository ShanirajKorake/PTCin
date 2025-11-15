import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Trash2, CheckCircle, Edit, Copy, Loader2, RefreshCw } from 'lucide-react';
import { getInvoicesHistory, deleteInvoice, clearInvoiceDue } from '../services/dbService';
import InvoicePDF from '../components/InvoicePDF';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// --- Utility Function: Date Format ---
/**
 * Converts a YYYY-MM-DD date string (or Date object) to DD-MM-YYYY string.
 * @param {string|Date} dateString - The date string in YYYY-MM-DD format.
 * @returns {string} The date string in DD-MM-YYYY format, or a locale date string if parse fails.
 */
const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            // Re-order: DD-MM-YYYY
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } catch (e) {
        return new Date(dateString).toLocaleDateString('en-IN');
    }
    return new Date(dateString).toLocaleDateString('en-IN');
};


export default function History({ theme, onNavigateToForm }) {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); // State for errors
    const [expandedId, setExpandedId] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false); // For local loading state

    // --- Data Fetching Logic (Updated with Error Handling) ---
    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedInvoices = await getInvoicesHistory();
            const sortedInvoices = fetchedInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setInvoices(sortedInvoices);
        } catch (e) {
            console.error("Failed to load history:", e);
            setError("Failed to fetch invoice history. Please check your network and Appwrite setup.");
            setInvoices([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Delete Handler ---
    const handleDelete = async (id, partyName) => {
        if (window.confirm(`Are you sure you want to permanently delete the invoice for "${partyName}"? This cannot be undone.`)) {
            setIsDeleting(true);
            try {
                await deleteInvoice(id);
                setExpandedId(null);
                setPreviewData(null);
                await loadHistory();
            } catch (error) {
                alert("Could not delete invoice. Please try again.");
                console.error("Deletion error:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    // --- Clear Due Handler ---
    const handleClearDue = async (id, partyName) => {
        if (window.confirm(`Confirm payment received for ${partyName}? This will set the balance due to zero.`)) {
            setIsDeleting(true); // Using this state for any update operation
            try {
                await clearInvoiceDue(id);
                setExpandedId(null); 
                await loadHistory(); 
            } catch (error) {
                alert("Could not update payment status. Please try again.");
                console.error("Clear Due error:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };


    const toggleExpand = (id) => {
        if (expandedId === id) {
            setPreviewData(null);
        }
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    // --- Generate PDF Data for Preview (Unchanged) ---
    const handleGeneratePDF = (invoice) => {
        setPreviewData({
            formData: invoice.formData,
            vehicles: invoice.vehicles,
            url: "data:application/pdf;base64,Base64_PDF_Content",
            filename: `Invoice_${invoice.formData.invoiceNo}_${new Date().getFullYear()}.pdf`
        });
    };

    const closePreview = () => {
        setPreviewData(null);
    };

    // --- CAPACITOR SHARE LOGIC (Unchanged) ---
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
    }, [loadHistory]);

    // --- Data Preparation Functions (Unchanged) ---
    const prepareDataForEdit = (invoice) => {
        const title = `Editing Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(invoice, 'edit', title);
    };

    const prepareDataForDuplicate = (invoice) => {
        const duplicatedData = {
            ...invoice,
            formData: {
                ...invoice.formData,
                invoiceNo: "Loading...",
                billDate: new Date().toISOString().split("T")[0]
            },
            id: null,
        };
        const title = `Duplicating Invoice ${invoice.formData.invoiceNo}`;
        onNavigateToForm(duplicatedData, 'duplicate', title);
    };


    // --- Dynamic Theme Classes ---
    const isLight = theme === "light";
    const titleClasses = isLight ? "text-indigo-600" : "text-indigo-400";
    const cardClasses = isLight ? "bg-white shadow-lg border border-gray-200" : "bg-gray-800 shadow-xl border border-gray-700";
    const subTextClasses = isLight ? "text-gray-600" : "text-gray-400";
    const summaryHeaderClasses = isLight ? "bg-indigo-100 text-indigo-800" : "bg-indigo-900/40 text-indigo-300";
    const containerClasses = isLight ? "bg-gray-50 text-gray-800" : "bg-gray-900 text-white";
    const textClasses = isLight ? "text-gray-500" : "text-gray-300";
    const retryButtonClasses = "bg-red-600 text-white px-4 py-2 rounded-xl flex items-center justify-center hover:bg-red-700 transition";


    // --- Render Logic for Loading/Error/Empty States ---
    const renderStatus = () => {
        if (isLoading) {
            return (
                <div className={`p-4 py-12 text-center ${cardClasses} max-w-lg mx-auto`}>
                    <Loader2 size={30} className={`mx-auto mb-3 animate-spin ${titleClasses}`} />
                    <p className={`font-medium ${textClasses}`}>Loading invoice history...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className={`p-4 py-8 text-center ${cardClasses} max-w-lg mx-auto`}>
                    <span role="img" aria-label="Error" className="text-4xl block mb-3">
                        ❌
                    </span>
                    <p className={`font-medium text-red-500 mb-3`}>Error loading data.</p>
                    <button onClick={loadHistory} className={retryButtonClasses}>
                        <RefreshCw size={16} className="mr-2" />
                        Retry Loading
                    </button>
                </div>
            );
        }
        
        if (invoices.length === 0) {
            return (
                <div className={`p-4 py-12 text-center ${cardClasses} max-w-lg mx-auto`}>
                    <span role="img" aria-label="Empty" className="text-4xl block mb-3">
                        📭
                    </span>
                    <p className={`font-medium ${textClasses}`}>No records found. Start by creating a new invoice!</p>
                </div>
            );
        }
        
        return null;
    };


    // --- Main Component JSX Return ---
    if (previewData) {
        // PDF Preview Mode
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
    
    // History List Mode
    return (
        <div className={`p-4 pt-20 pb-22 w-full ${containerClasses} h-full`}>
            <h2 className={`text-4xl font-extrabold mb-8 text-center ${titleClasses}`}>
                Invoice History
            </h2>

            <div className="space-y-4 max-w-lg mx-auto pb-6">
                {renderStatus()}
                
                {/* Render Invoices only if they exist and no error */}
                {!isLoading && !error && invoices.map((invoice) => {
                    const isExpanded = invoice.id === expandedId;
                    const summary = invoice.summary;
                    const formData = invoice.formData;
                    const vehicles = invoice.vehicles;
                    const balanceDue = parseFloat(summary.totalBalance || 0);
                    const isDue = balanceDue > 0.01;
                    const totalBalanceFormatted = balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                    const dateFormatted = formatDateForDisplay(formData.billDate); 
                    
                    // NEW: Construct the container type string
                    const containerTypeString = `${formData.loadDirection || ''} ${formData.vehicleCount || 0}x${formData.containerSize || ''}`;


                    return (
                        <div key={invoice.id} className={`rounded-xl shadow-md transition-all duration-300 ${cardClasses} overflow-hidden ${isDeleting && isExpanded ? 'opacity-50' : ''}`}>
                            
                            {/* Header Button */}
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

                                    {/* 1. Trip Details (DD-MM-YYYY format applied, plus Container Type) */}
                                    <h4 className={`font-bold mt-2 ${titleClasses}`}>Trip & Load Details</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <p className={`font-semibold ${subTextClasses}`}>Address:</p>
                                        <p className={`${subTextClasses}`}>{formData.partyAddress}</p>
                                        
                                        <p className={`font-semibold ${subTextClasses}`}>Load Type:</p>
                                        <p className={`${subTextClasses} `}>
                                            {containerTypeString}
                                        </p>
                                        
                                        <p className={`font-semibold ${subTextClasses}`}>Trip Route:</p>
                                        <p className={`${subTextClasses}`}>{formData.from} to {formData.to} to {formData.backTo}</p>
                                        
                                        <p className={`font-semibold ${subTextClasses}`}>Trip Dates:</p>
                                        <p className={`${subTextClasses}`}>
                                            {formatDateForDisplay(formData.loadingDate)} to {formatDateForDisplay(formData.unloadingDate)}
                                        </p>
                                    </div>

                                    {/* 2. Vehicles List with Detailed Charges (Updated 'commission' to 'warai') */}
                                    <h4 className={`font-bold pt-4 ${titleClasses}`}>Vehicles ({vehicles.length})</h4>
                                    <div className="space-y-3">
                                        {vehicles.map((v, index) => (
                                            <div key={index} className={`p-3 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-gray-700'} text-xs border ${isLight ? 'border-gray-200' : 'border-gray-600'}`}>
                                                <p className="font-semibold text-sm mb-2">{v.vehicleNo} (LR: {v.lrNo})</p>

                                                {/* CHARGES BREAKDOWN */}
                                                <div className="grid grid-cols-2 gap-1">
                                                    {['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'warai', 'advance'].map(field => ( 
                                                        <div key={field} className="flex justify-between col-span-1">
                                                            <p className="font-medium capitalize text-gray-500/70">{field.replace(/([A-Z])/g, ' $1').replace('warai', 'Warai').trim()}:</p>
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
                                            <p className={`font-extrabold text-lg ${isDue ? 'text-red-400' : 'text-green-500'}`}>Balance Due:</p>
                                            <p className={`font-extrabold text-lg text-right ${isDue ? 'text-red-400' : 'text-green-500'}`}>₹{totalBalanceFormatted}</p>
                                        </div>
                                    </div>

                                    {/* --- PRIMARY ACTION BUTTONS: Clear Due / Generate PDF --- */}
                                    <div className="flex justify-between pt-4 space-x-4">
                                        {isDue ? (
                                            <button
                                                onClick={() => handleClearDue(invoice.id, formData.partyName)}
                                                disabled={isDeleting}
                                                className={`flex-1 flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-green-700 transition-all duration-300 text-lg font-semibold tracking-wide ${isDeleting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isDeleting ? <Loader2 size={20} className="animate-spin mr-2" /> : <CheckCircle size={20} className="mr-2" />}
                                                {isDeleting ? 'Updating...' : 'Clear Due'}
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

                                        <button
                                            onClick={() => prepareDataForEdit(invoice)}
                                            disabled={isDeleting}
                                            className={`flex-1 flex items-center justify-center bg-yellow-600 text-white px-3 py-2 rounded-xl shadow-md transition text-sm font-medium ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-yellow-700'}`}
                                        >
                                            <Edit size={16} className="mr-1" />
                                            Edit
                                        </button>

                                        <button
                                            onClick={() => prepareDataForDuplicate(invoice)}
                                            disabled={isDeleting}
                                            className={`flex-1 flex items-center justify-center bg-blue-600 text-white px-3 py-2 rounded-xl shadow-md transition text-sm font-medium ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                                        >
                                            <Copy size={16} className="mr-1" />
                                            Duplicate
                                        </button>

                                        <button
                                            onClick={() => handleDelete(invoice.id, formData.partyName)}
                                            disabled={isDeleting}
                                            className={`flex-1 flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded-xl shadow-md transition text-sm font-medium ${isDeleting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
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