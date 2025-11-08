import React, { useState, useEffect } from "react";
import Divers from './Pages/Drivers';
import NewInvoice from './Pages/NewInvoice';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Dashboard from "./Pages/Dashboard";
import History from "./Pages/History";
import './index.css';

// 1. IMPORT CAPACITOR STATUS BAR PLUGIN
import { StatusBar } from '@capacitor/status-bar';

// Main App Component
function App() {
  const [theme, setTheme] = useState("light");
  const [currentPage, setPage] = useState("dashboard");
  
  // NEW STATE: Manages data and title for InvoiceForm when editing/duplicating
  const [formContext, setFormContext] = useState({ 
    mode: 'new', // 'new', 'edit', or 'duplicate'
    data: null, 
    title: 'Create New Invoice' 
  });

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  /**
   * 2. COMBINED EFFECT HOOK for Body Class and Status Bar.
   */
  useEffect(() => {
    // Set the body background color based on theme
    document.body.className = theme === "dark" ? "bg-gray-900" : "bg-gray-100";

    // Logic to change the native status bar color/style
    if (theme === "dark") {
        StatusBar.setStyle({ style: 'light' }); // Status bar icons (text/icons) should be light on a dark background
    } else {
        StatusBar.setStyle({ style: 'dark' }); // Status bar icons should be dark on a light background
    }

  }, [theme]); // Reruns whenever the theme state changes

  // NEW HANDLER: Passed to History.jsx to request navigation/data load
  const handleNavigateToForm = (data, mode, title) => {
      setFormContext({ mode, data, title }); // Set the data and context
      setPage('new Invoice');               // Navigate to the form page
  };

  // Conditional rendering function for routing
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard theme={theme}/>;
      
      case "new Invoice":
        // Pass the editing/duplication context to the NewInvoice component
        return <NewInvoice 
                  theme={theme} 
                  initialData={formContext.data} 
                  contextTitle={formContext.title}
                  // Optionally, pass setPage back if NewInvoice needs to navigate back
               />;
      
      case "history":
        // Pass the navigation handler to History.jsx
        return <History 
                  theme={theme} 
                  onNavigateToForm={handleNavigateToForm} 
                />;
      
      case "vehicals":
        return <Divers theme={theme}/>;
      
      default:
        return <Dashboard theme={theme}/>;
    }
  };

  const themeClasses = theme === 'dark'
    ? 'bg-gray-900 text-white'
    : 'bg-gray-100 text-gray-900';

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${themeClasses} outfit`} >
        
        {/* Header: Use the context title for the header */}
        <Header 
          toggleTheme={toggleTheme} 
          theme={theme} 
          title={formContext.title} // Display the custom title when in the form
        />

        {/* Main Content Area: Scrollable middle section */}
        <main className="flex-grow overflow-y-auto">
            {renderPage()}
        </main>

        {/* Footer Navigation - handles page switching */}
        <Footer currentPage={currentPage} setPage={setPage} theme={theme} setFormContextChanger={setFormContext}/>
    </div>
  );
}

export default App;