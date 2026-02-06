"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import Script from "next/script";

interface ReCaptchaContextType {
  executeRecaptcha: (action: string) => Promise<string | null>;
  isLoaded: boolean;
}

const ReCaptchaContext = createContext<ReCaptchaContextType>({
  executeRecaptcha: async () => null,
  isLoaded: false,
});

export const useReCaptcha = () => useContext(ReCaptchaContext);

interface ReCaptchaProviderProps {
  children: ReactNode;
  siteKey?: string;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * ReCaptcha v3 Provider
 *
 * Provides invisible bot protection for forms without user friction.
 * Usage:
 * 1. Wrap your app with <ReCaptchaProvider>
 * 2. In forms, use the useReCaptcha hook to get executeRecaptcha
 * 3. Call executeRecaptcha('action_name') before form submission
 * 4. Send the token to your backend for verification
 */
export function ReCaptchaProvider({ children, siteKey }: ReCaptchaProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // NEXT_PUBLIC_ prefix required for client-side access in Next.js
  const recaptchaSiteKey = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Define callbacks BEFORE any conditional returns (React hooks rule)
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      // If no site key, return null (graceful degradation)
      if (!recaptchaSiteKey) {
        return null;
      }

      // Wait for script to load (max 5 seconds)
      if (!window.grecaptcha) {
        for (let i = 0; i < 50; i++) {
          await new Promise(r => setTimeout(r, 100));
          if (window.grecaptcha) break;
        }
        if (!window.grecaptcha) {
          return null;
        }
      }

      try {
        const token = await new Promise<string>((resolve, reject) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha
              .execute(recaptchaSiteKey, { action })
              .then(resolve)
              .catch(reject);
          });
        });
        return token;
      } catch {
        return null;
      }
    },
    [recaptchaSiteKey]
  );

  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // If no site key is configured, render children without reCAPTCHA script
  // This allows development without setting up reCAPTCHA keys
  if (!recaptchaSiteKey) {
    return (
      <ReCaptchaContext.Provider value={{ executeRecaptcha, isLoaded: false }}>
        {children}
      </ReCaptchaContext.Provider>
    );
  }

  return (
    <ReCaptchaContext.Provider value={{ executeRecaptcha, isLoaded }}>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />
      {children}
    </ReCaptchaContext.Provider>
  );
}
