import React from 'react';
// Assuming your Button component is correctly imported and is a default export
import Button from '../../../components/ui/Button'; 
// Renamed the import to match your file structure: AppIcon.jsx
import AppIcon from '../../../components/AppIcon'; 

const SocialLogin = ({ isLoading }) => {

    // Function to handle Google OAuth redirect
    const handleGoogleLogin = () => {
        // Redirect to the backend's Google authentication initiation endpoint
        // This URL must match the VITE_API_URL and the backend route setup
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    };

    const socialProviders = [
        {
            name: 'Google',
            // Ensure this icon name matches what AppIcon expects for Google
            icon: 'Chrome', 
            action: handleGoogleLogin, // <-- UPDATED: Use the new handler
            bgColor: 'bg-white hover:bg-gray-50',
            textColor: 'text-gray-700',
            borderColor: 'border-gray-300'
        },
        {
            name: 'Microsoft',
            icon: 'Square',
            action: () => console.log('Microsoft login'),
            bgColor: 'bg-blue-600 hover:bg-blue-700',
            textColor: 'text-white',
            borderColor: 'border-blue-600'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">
                        Or continue with
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialProviders?.map((provider) => (
                    <Button
                        key={provider?.name}
                        variant="outline"
                        onClick={provider?.action} // This now calls handleGoogleLogin for Google
                        disabled={isLoading}
                        className={`h-11 ${provider?.bgColor} ${provider?.textColor} ${provider?.borderColor}`}
                    >
                        {/* Use AppIcon here */}
                        <AppIcon name={provider?.icon} size={18} className="mr-2" />
                        {provider?.name}
                    </Button>
                ))}
            </div>
        </div>
    );
};

// NOTE: I've also renamed the imported 'Icon' to 'AppIcon' to match your directory structure.
export default SocialLogin;