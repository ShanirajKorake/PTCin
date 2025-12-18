import { ArrowLeft, ArrowRight, Dot, MoveRight } from 'lucide-react'
import React from 'react'

export default function HistoryInvoiceCard({ invoice, isExpanded, onToggle, isLight, formatDateForDisplay, isDue }) {
    
    const subTextClasses = isLight ? "text-gray-500":"text-gray-500"
    const formatDateWithMonthName = (dateString) =>{
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    return (
        <>
            <button
                className={`w-full px-4 py-3  transition-colors`}
                onClick={() => onToggle(invoice.id)}
            >
                <p className={`text-sm flex items-center align-middle justify-center font-semibold text-left ${subTextClasses}`}>
        
                        {invoice.formData.invoiceNo}
        
                    <Dot size={24}/>
                    
                    {`${formatDateWithMonthName(invoice.formData.billDate)}`}

                </p>
                <div className={`w-full text-center text-lg  font-bold ${isLight ? "text-gray-700" :"text-gray-300"}`}>
                    {invoice.formData.partyName}
                </div>

                <div className='flex items-center align-middle'>
                    <div className='  flex align-middle items-center justify-center w-full '>
                        <p className={`text-2xl pb-1 font-bold text-right ${isDue ? 'text-red-500' : 'line-through text-gray-500'}`}>{`Rs. ${invoice.summary.totalFreight}`}</p>
                        {!isDue &&
                        <div className='flex'>
                        <Dot size={24} className={subTextClasses}/>
                        <div className={`text-left text-green-500 font-bold`}>
                            PAID
                        </div>
                        </div>
                        }
                    </div>
                </div>
                <div className={`text-wrap text-sm flex items-center align-middle gap-2  ${isLight ? 'bg-gray-200' : 'bg-gray-700'} rounded-full py-2 px-3`}>
                    <div className='flex-2 flex flex-col items-center justify-center'>
                        {invoice.formData.from}
                        <div className={`text-sm w-fit font-normal rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                            {formatDateForDisplay(invoice.formData.loadingDate)}
                        </div>

                    </div>
                    <MoveRight size={24} className='flex-none' />
                    <div className='flex-2 flex flex-col items-center justify-center'>
                        {invoice.formData.to}
                        <div className={`text-sm w-fit font-normal rounded-full px-1 ${isLight ? 'bg-gray-400 text-gray-100' : 'bg-gray-500 text-gray-800'}`}>
                            {formatDateForDisplay(invoice.formData.unloadingDate)}
                        </div>
                    </div>
                    {
                        (invoice.formData.backTo != "") && <>
                    <MoveRight size={24} className='flex-none' />
                            <p className='flex-2'>{invoice.formData.backTo}</p>
                        </>
                    }
                </div>
                
            </button>
        </>
    )
}
