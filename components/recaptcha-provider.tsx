"use client";

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
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

  const recaptchaSiteKey = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If no site key is configured, render children without reCAPTCHA
  // This allows development without setting up reCAPTCHA keys
  if (!recaptchaSiteKey) {
    console.warn("[ReCaptcha] No site key configured. reCAPTCHA is disabled.");
    return (
      <ReCaptchaContext.Provider value={{ executeRecaptcha: async () => null, isLoaded: false }}>
        {children}
      </ReCaptchaContext.Provider>
    );
  }

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!isLoaded || !window.grecaptcha) {
        console.warn("[ReCaptcha] grecaptcha not loaded yet");
        return null;
      }

      try {
        const token = await new Promise<string>((resolve, reject) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha
              .execute(recaptchaSiteKey!, { action })
              .then(resolve)
              .catch(reject);
          });
        });
        return token;
      } catch (error) {
        console.error("[ReCaptcha] Error executing reCAPTCHA:", error);
        return null;
      }
    },
    [isLoaded, recaptchaSiteKey]
  );

  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
    console.log("[ReCaptcha] Script loaded successfully");
  }, []);

  return (
    <ReCaptchaContext.Provider value={{ executeRecaptcha, isLoaded }}>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
        onLoad={handleScriptLoad}
        strategy="lazyOnload"
      />
      {children}
    </ReCaptchaContext.Provider>
  );
}
