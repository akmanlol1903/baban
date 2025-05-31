import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

const LoginPage = () => {
  const { signInWithDiscord } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clear any error when component unmounts
    return () => setError(null);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithDiscord();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-background"></div>
      <div className="graddygrad fixed inset-0"></div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-white">
        <div className="mb-8 text-center">
          <h1 className="montserrat-black relative select-none text-[4rem] text-primary sm:text-[5rem] md:text-[8rem]">boşalanzi</h1>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4 max-w-md">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center justify-center h-11 sm:h-12 md:h-14 px-6 py-2 font-medium text-white text-base sm:text-lg bg-card border border-border -[1.5rem] shadow-custom-inset drop-shadow-md transition-colors duration-150 ease-in-out hover:bg-card-hover hover:border-primary focus:outline-none disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <Skeleton className="mr-2 h-5 w-5 " />
              Connecting...
            </span>
          ) : (
            <span className="flex items-center">
              <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36">
                <path
                  fill="currentColor"
                  d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
                />
              </svg>
              Continue with Discord
            </span>
          )}
        </Button>
      </div>
    </>
  );
};

export default LoginPage;