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

  const recaptchaSiteKey = siteKey || process.env.JJ_PORTAL_CAPTCHA_KEY;

  // Debug: Log if key is loaded (remove in production)
  if (typeof window !== 'undefined') {
    console.log("[ReCaptcha] Site key loaded:", recaptchaSiteKey ? "Yes" : "No");
  }

  // Define callbacks BEFORE any conditional returns (React hooks rule)
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      // If no site key, return null (graceful degradation)
      if (!recaptchaSiteKey) {
        return null;
      }

      // Wait for script to load (max 5 seconds)
      if (!window.grecaptcha) {
        console.log("[ReCaptcha] Waiting for script to load...");
        for (let i = 0; i < 50; i++) {
          await new Promise(r => setTimeout(r, 100));
          if (window.grecaptcha) break;
        }
        if (!window.grecaptcha) {
          console.error("[ReCaptcha] Script failed to load after 5 seconds");
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
      } catch (error) {
        console.error("[ReCaptcha] Error executing reCAPTCHA:", error);
        return null;
      }
    },
    [recaptchaSiteKey]
  );

  const handleScriptLoad = useCallback(() => {
    setIsLoaded(true);
    console.log("[ReCaptcha] Script loaded successfully");
  }, []);

  // If no site key is configured, render children without reCAPTCHA script
  // This allows development without setting up reCAPTCHA keys
  if (!recaptchaSiteKey) {
    console.warn("[ReCaptcha] No site key configured. reCAPTCHA is disabled.");
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
