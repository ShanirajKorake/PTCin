import { Client, TablesDB, Query, ID } from 'appwrite';

// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL Appwrite Configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT; 
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID; 

// Table (Collection) IDs
const COUNTER_TABLE_ID = 'counters'; 
const ENTRIES_TABLE_ID = 'entries'; 

// Counter Row ID
const COUNTER_ROW_ID = 'invoice_counter'; 

// Field/Column Names
const COUNTER_COLUMN_KEY = 'count';
const INVOICE_NO_KEY = 'invoiceNo';
const VALUE_KEY = 'formData'; // Holds the JSON string of the invoice data

// --- INITIALIZATION ---
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(PROJECT_ID);

const tablesDB = new TablesDB(client);

// --- UTILITY FUNCTION ---

/**
 * Formats a raw integer counter into the desired Invoice ID format (e.g., P-000001).
 */
export const formatInvoiceId = (count) => {
    return `P-${String(count).padStart(6, '0')}`; 
};

// --- COUNTER FUNCTIONS ---

/**
 * Retrieves the current invoice counter value.
 */
export const getInvoiceCounter = async () => {
    try {
        const row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: COUNTER_TABLE_ID,
            rowId: COUNTER_ROW_ID,
        });
        return row[COUNTER_COLUMN_KEY] || 0; 
    } catch (error) {
        // Initialize counter if not found
        try {
            await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: COUNTER_TABLE_ID,
                rowId: COUNTER_ROW_ID,
                data: { [COUNTER_COLUMN_KEY]: 0 }
            });
            return 0;
        } catch (createError) {
            console.error("Error creating initial counter row:", createError);
            throw new Error("Failed to initialize invoice counter."); 
        }
    }
};

/**
 * Atomically increments the invoice counter by one.
 */
export const incrementInvoiceCounter = async () => {
    try {
        const updatedRow = await tablesDB.incrementRowColumn({
            databaseId: DATABASE_ID,
            tableId: COUNTER_TABLE_ID,
            rowId: COUNTER_ROW_ID,
            column: COUNTER_COLUMN_KEY,
            value: 1
        });
        return updatedRow[COUNTER_COLUMN_KEY];
    } catch (error) {
        console.error("Error atomically incrementing invoice counter:", error);
        throw new Error("Failed to increment invoice counter. Check if the counter row exists.");
    }
};

// --- INVOICE CRUD/UPDATE FUNCTIONS ---

/**
 * Saves a new invoice or updates an existing one.
 */
export const saveNewInvoice = async (invoiceData) => {
    const invoiceNo = invoiceData.formData.invoiceNo;
    const invoiceValueString = JSON.stringify(invoiceData);

    if (!invoiceNo || invoiceNo.includes("Load") || invoiceNo.includes("ERR")) {
        return { status: 'aborted' };
    }

    try {
        // 1. Check if an entry with this invoiceNo already exists
        const { rows: existingEntries } = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            queries: [Query.equal(INVOICE_NO_KEY, invoiceNo)]
        });

        if (existingEntries.length > 0) {
            // --- UPDATE EXISTING INVOICE (Edit/Manual Override Mode) ---
            const rowId = existingEntries[0].$id;
            
            await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: ENTRIES_TABLE_ID,
                rowId: rowId,
                data: { [VALUE_KEY]: invoiceValueString } 
            });
            
            return { status: 'updated' };

        } else {
            // --- CREATE NEW INVOICE ---
            await tablesDB.createRow({
                databaseId: DATABASE_ID,
                tableId: ENTRIES_TABLE_ID,
                rowId: ID.unique(),
                data: {
                    [INVOICE_NO_KEY]: invoiceNo,
                    [VALUE_KEY]: invoiceValueString 
                }
            });

            return { status: 'saved' };
        }
    } catch (error) {
        console.error("Error saving/updating invoice:", error);
        throw new Error("Failed to save invoice record.");
    }
};


/**
 * Retrieves all saved invoices history, including the Appwrite Row ID ($id) and creation date.
 */
export const getInvoicesHistory = async () => {
    try {
        const { rows } = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            queries: [
                Query.limit(500),
                Query.orderDesc('$createdAt') 
            ]
        });

        const history = rows.map(row => {
            try {
                // Parse the JSON data from the 'value' column
                const invoiceData = JSON.parse(row[VALUE_KEY]);
                
                // Merge the Appwrite Row ID ($id) as 'id' and timestamp as 'createdAt'
                // This is vital for the History component's delete and update functions.
                return { ...invoiceData, id: row.$id, createdAt: row.$createdAt };
            } catch (e) {
                console.error("Error parsing JSON for row:", row.$id, e);
                return null;
            }
        }).filter(item => item !== null);

        return history;

    } catch (error) {
        console.error("Error fetching invoice history:", error);
        return [];
    }
};

/**
 * Deletes an invoice row permanently using the Appwrite Row ID.
 */
export const deleteInvoice = async (rowId) => {
    if (!rowId) throw new Error("Row ID is required for deletion.");

    try {
        await tablesDB.deleteRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId
        });
        console.log(`Invoice row ${rowId} deleted successfully.`);
    } catch (error) {
        console.error(`Failed to delete invoice row ${rowId}:`, error);
        throw new Error("Appwrite deletion failed.");
    }
};

/**
 * Updates an invoice row to set the balance due to zero (clears payment).
 * Note: It modifies the 'balance' and 'totalBalance' fields, assuming the form 
 * logic correctly calculated the stored 'warai' value.
 */
export const clearInvoiceDue = async (rowId) => {
    if (!rowId) throw new Error("Row ID is required for updating.");

    try {
        // 1. Get the current row data
        const row = await tablesDB.getRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId,
        });

        // 2. Parse the JSON string
        const invoiceData = JSON.parse(row[VALUE_KEY]);

        // 3. Modify the data (Set all balances to "0.00")
        const zero = "0.00";
        
        // Update summary
        const updatedSummary = {
            ...invoiceData.summary,
            totalBalance: zero
        };

        // Update each vehicle's balance
        const updatedVehicles = invoiceData.vehicles.map(v => ({
            ...v,
            balance: zero
        }));

        // Construct the final modified object
        const updatedInvoiceData = {
            ...invoiceData,
            vehicles: updatedVehicles,
            summary: updatedSummary
        };

        // 4. Stringify the modified data
        const updatedInvoiceValueString = JSON.stringify(updatedInvoiceData);

        // 5. Update the row with the new JSON string
        await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: ENTRIES_TABLE_ID,
            rowId: rowId,
            data: { [VALUE_KEY]: updatedInvoiceValueString }
        });

        console.log(`Invoice row ${rowId} balance cleared successfully.`);

    } catch (error) {
        console.error(`Failed to clear balance for invoice row ${rowId}:`, error);
        throw new Error("Appwrite update failed during balance clearing.");
    }
};