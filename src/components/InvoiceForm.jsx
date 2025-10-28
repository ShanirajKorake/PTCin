import React, { useState, useEffect } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import InvoicePDF from "./InvoicePDF";

// --- Utility Function to Clean/Format Vehicle Data ---
const formatVehicleDataForPDF = (vehicle) => {
    // List of fields that should be numeric and formatted to '0.00'
    const numericFields = [
        'freight', 'unloadingCharges', 'detention', 'weightCharges', 
        'others', 'commission', 'advance', 'totalFreight', 'balance'
    ];

    const cleanVehicle = { ...vehicle };

    // 1. Ensure all numeric fields are present and formatted as "X.XX"
    numericFields.forEach(field => {
        const numericValue = parseFloat(cleanVehicle[field] || 0) || 0;
        cleanVehicle[field] = numericValue.toFixed(2).toString();
    });

    // 2. Ensure non-numeric string fields (LR, Vehicle, Container) are at least empty strings
    cleanVehicle.lrNo = cleanVehicle.lrNo || "";
    cleanVehicle.vehicleNo = cleanVehicle.vehicleNo || "";
    cleanVehicle.containerNo = cleanVehicle.containerNo || "";

    return cleanVehicle;
};
// -----------------------------------------------------


// Main Application Component
export default function InvoiceForm() {
  const [formData, setFormData] = useState({
    invoiceNo: "1",
    billDate: new Date().toISOString().split("T")[0],
    partyName: "SAHIL ROADWAYS",
    partyAddress: "KALAMBOLI",
    // Global trip details
    from: "IMPEX",
    to: "BHILAD",
    backTo: "PANINDIA",
    // Global dates
    loadingDate: "2024-08-16",
    unloadingDate: "2024-08-18",
    // Total Commission (Calculated)
    commission: "0.00", 
  });

  const [vehicles, setVehicles] = useState([
    {
      lrNo: "10886",
      vehicleNo: "MH 43 Y 7655",
      containerNo: "BMOU-6382983",
      freight: "28000",
      unloadingCharges: "4602",
      detention: "0",
      weightCharges: "0",
      others: "0",
      commission: "500", 
      totalFreight: "33102.00", 
      advance: "26000",
      balance: "7102.00", 
    },
  ]);

  const [showPreview, setShowPreview] = useState(false);
  const [pdfData, setPdfData] = useState({ formData, vehicles });

  // Auto-calculate total commission
  useEffect(() => {
    const totalCommission = vehicles.reduce((sum, v) => sum + parseFloat(v.commission || 0), 0);
    setFormData(prev => ({ 
        ...prev, 
        commission: totalCommission.toFixed(2).toString() 
    }));
  }, [vehicles]);


  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = (index, field, value) => {
    const updated = [...vehicles];
    updated[index][field] = value; 
    
    const calculationFields = ['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'commission', 'advance'];

    if (calculationFields.includes(field)) {
      const v = updated[index];
      
      const total = parseFloat(v.freight || 0) + 
                        parseFloat(v.unloadingCharges || 0) + 
                        parseFloat(v.detention || 0) + 
                        parseFloat(v.weightCharges || 0) + 
                        parseFloat(v.others || 0) +
                        parseFloat(v.commission || 0);

      updated[index].totalFreight = total.toFixed(2).toString();
      updated[index].balance = (total - parseFloat(v.advance || 0)).toFixed(2).toString();
    }
    
    setVehicles(updated);
  };

  const addVehicle = () => {
    const lastVehicle = vehicles[vehicles.length - 1];

    if (lastVehicle) {
        const newVehicle = { ...lastVehicle };
        newVehicle.lrNo = "";
        newVehicle.vehicleNo = "";
        newVehicle.containerNo = "";
        
        const numericFieldsToReset = ['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'commission', 'advance', 'totalFreight', 'balance'];
        numericFieldsToReset.forEach(field => newVehicle[field] = "0.00");

        setVehicles([...vehicles, newVehicle]);
    } else {
        setVehicles([...vehicles, {
          lrNo: "", vehicleNo: "", containerNo: "",
          freight: "0.00", unloadingCharges: "0.00", detention: "0.00",
          weightCharges: "0.00", others: "0.00", commission: "0.00", 
          totalFreight: "0.00", advance: "0.00", balance: "0.00",
        }]);
    }
  };

  const removeVehicle = (index) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const handleGeneratePDF = () => {
    const formattedVehicles = vehicles.map(formatVehicleDataForPDF);
    
    setPdfData({
        formData: {
            ...formData,
            commission: parseFloat(formData.commission || 0).toFixed(2).toString(),
        },
        vehicles: formattedVehicles
    });
    
    setShowPreview(true);
  };
  
  // Calculate summary totals
  const totalBalance = vehicles.reduce((sum, v) => sum + parseFloat(v.balance || 0), 0).toFixed(2);
  const totalAdvance = vehicles.reduce((sum, v) => sum + parseFloat(v.advance || 0), 0).toFixed(2);
  const totalFreight = vehicles.reduce((sum, v) => sum + parseFloat(v.totalFreight || 0), 0).toFixed(2);


  // --- MATERIAL 3 REDESIGN STARTS HERE ---
  return (
    // Light background, max-width for mobile
    <div className="   mx-auto"> 
      <div className=" p-5"> {/* Increased rounding to 3xl for M3 look */}
        {!showPreview ? (
          <div>
            <h2 className="text-2xl font-bold mb-5 text-center text-indigo-700"> {/* Primary color for header */}
              New Invoice
            </h2>
            
            {/* Bill & Trip Information (Tonal Container) */}
            <div className="bg-indigo-50 p-4 rounded-2xl mb-5 shadow-sm border border-indigo-100"> 
              <h3 className="text-lg font-semibold mb-3 text-indigo-800">Bill & Global Trip Details</h3>
              
              {/* Form fields: Single column, M3-style input */}
              <div className="grid grid-cols-1 gap-3 mb-3"> 
                {['invoiceNo', 'billDate', 'partyName'].map((name) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{name.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <input
                        type={name.includes('Date') ? 'date' : 'text'}
                        name={name}
                        value={formData[name]}
                        onChange={handleFormChange}
                        // M3: softer border, primary focus ring, larger padding/rounded corners
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                      />
                    </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {['loadingDate', 'unloadingDate', 'from', 'to', 'backTo'].map((name) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{name.replace(/([A-Z])/g, ' $1').trim()} (All)</label>
                      <input
                        type={name.includes('Date') ? 'date' : 'text'}
                        name={name}
                        value={formData[name]}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                      />
                    </div>
                ))}
              </div>

              <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Party Address</label>
                  <input
                    type="text"
                    name="partyAddress"
                    value={formData.partyAddress}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                  />
              </div>
            </div>

            {/* Vehicle Details Section */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Vehicle Entries ({vehicles.length})</h3>
                {/* M3-style ElevatedButton (Filled) */}
                <button
                  type="button"
                  onClick={addVehicle}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-xl shadow-md hover:bg-indigo-700 transition text-sm font-medium"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {vehicles.map((vehicle, index) => (
                // M3-style Card/Container
                <div key={index} className="bg-gray-50 p-4 rounded-2xl mb-4 shadow-sm border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-bold text-indigo-700">Vehicle #{index + 1}</h4>
                    {vehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVehicle(index)}
                        // M3 style IconButton (Icon on surface color)
                        className="text-red-500 hover:bg-red-50 p-1 rounded-full transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Vehicle Numbers (Unique IDs) - Tonal container for visual grouping */}
                  <div className="grid grid-cols-1 gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-100">
                    {['lrNo', 'vehicleNo', 'containerNo'].map(field => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                          <input
                            type="text"
                            value={vehicle[field]}
                            onChange={(e) => handleVehicleChange(index, field, e.target.value)}
                            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                          />
                        </div>
                    ))}
                  </div>

                  {/* Charges & Advance - Two columns for density */}
                  <h5 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">Charges & Advance</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Input Fields */}
                    {['freight', 'unloadingCharges', 'detention', 'weightCharges', 'others', 'commission', 'advance'].map(field => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                              type="number"
                              value={vehicle[field]}
                              onChange={(e) => handleVehicleChange(index, field, e.target.value)}
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder="0.00"
                            />
                        </div>
                    ))}
                    
                    {/* Calculated Fields: Separate row, M3-style containers */}
                    <div className="col-span-2 grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-dashed border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Freight</label>
                        <input
                          type="number"
                          value={vehicle.totalFreight}
                          readOnly
                          // M3: Secondary container style
                          className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2 bg-indigo-50 text-indigo-900 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Balance</label>
                        <input
                          type="number"
                          value={vehicle.balance}
                          readOnly
                          // M3: Tertiary container style
                          className="w-full border-2 border-green-200 rounded-xl px-3 py-2 bg-green-50 text-green-800 font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* INVOICE SUMMARY SECTION (M3 Primary Tonal Container) */}
            <div className="bg-indigo-100 p-4 rounded-3xl mb-6 shadow-md border-2 border-indigo-200">
              <h3 className="text-xl font-bold mb-3 text-indigo-800">Invoice Totals Summary</h3>
              
              <div className="grid grid-cols-2 gap-3">
                
                {/* Total Freight */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-800 mb-1">Total Freight</label>
                  <div className="w-full rounded-xl px-3 py-2 bg-indigo-50 text-indigo-900 font-extrabold text-base border border-indigo-200">
                    ₹ {parseFloat(totalFreight).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </div>
                </div>
                
                {/* Total Commission */}
                <div>
                  <label className="block text-xs font-semibold text-purple-800 mb-1">Total Commission</label>
                  <div className="w-full rounded-xl px-3 py-2 bg-purple-50 text-purple-900 font-extrabold text-base border border-purple-200">
                    ₹ {parseFloat(formData.commission).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </div>
                </div>

                {/* Total Advance */}
                <div>
                  <label className="block text-xs font-semibold text-red-800 mb-1">Total Advance</label>
                  <div className="w-full rounded-xl px-3 py-2 bg-red-50 text-red-800 font-extrabold text-base border border-red-200">
                    ₹ {parseFloat(totalAdvance).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </div>
                </div>

                {/* Total Balance Due */}
                <div>
                  <label className="block text-xs font-semibold text-green-800 mb-1">Balance Due</label>
                  <div className="w-full rounded-xl px-3 py-2 bg-green-50 text-green-800 font-extrabold text-base border border-green-200">
                    ₹ {parseFloat(totalBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </div>
                </div>
                
              </div>
            </div>

            <div className="flex justify-center">
              {/* M3 Extended Floating Action Button (EFAB) style button */}
              <button
                onClick={handleGeneratePDF}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all duration-300 text-lg font-semibold tracking-wide"
              >
                Generate Invoice PDF
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Invoice Preview</h3>
              {/* M3 Text Button (Outlined/Text) style */}
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1 text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>
            <InvoicePDF formData={pdfData.formData} vehicles={pdfData.vehicles} />
          </div>
        )}
      </div>
    </div>
  );
}