import React from 'react'
import logo from '../assets/logo.jpg'; // Assuming your logo is accessible here

// Accept the 'theme' prop
export default function Dashboard({ theme }) {

    // 1. Conditional Styling for the Main Dashboard Container
    const dashboardClasses = theme === "light"
        ? "bg-gray-50 text-gray-800" // Light theme background and default text
        : "bg-gray-900 text-white"; // Dark theme background and default text

    // 2. Conditional Styling for the Title
    const titleClasses = theme === "light"
        ? "text-indigo-600" // Light theme title color
        : "text-indigo-400"; // Dark theme title color

    // 3. Conditional Styling for the Text
    const textClasses = theme === "light"
        ? "text-gray-500" // Light theme secondary text
        : "text-gray-300"; // Dark theme secondary text


    return (
        // Apply the dynamic classes along with fixed layout classes
        <div className={`p-4 text-center flex flex-col items-center justify-start w-full h-full ${dashboardClasses}`}>

            {/* --- Big Logo at Top --- */}
            <img 
                src={logo} 
                alt="Company Logo" 
                className={`w-32 h-32 rounded-full my-20 shadow-xl ${theme === "light" ? "border-4 border-indigo-200" : "border-4 border-indigo-500"}`} 
            />


            {/* --- Removed all stats. Added message and sticker --- */}
            <div className={`p-8 rounded-2xl max-w-md w-full ${theme === "light" ? "bg-white border border-gray-200" : "bg-gray-800 border border-gray-700"}`}>
                
                <span role="img" aria-label="Sticker" className="text-6xl block mb-4 animate-bounce">
                    🚧
                </span>
                
                <h3 className={`text-2xl font-semibold mb-2 ${titleClasses}`}>
                    Coming Soon!
                </h3>
                
                <p className={`text-lg font-medium ${textClasses}`}>
                    More features and insights will be added here soon. Stay tuned!
                </p>

            </div>
        </div>
    )
}