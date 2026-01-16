// tax-client-portal/services/strapi-client.ts

import axios from "axios";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

/**
 * Silicon Valley Standard: Using Axios Interceptors for centralized Security.
 * This automatically handles JWT injection and session expiration.
 */
export const strapiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Security Step 1: Automatically attach JWT to every request
strapiClient.interceptors.request.use((config: any) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tax-auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Security Step 2: Global Error Handling (e.g., auto-logout on 401)
strapiClient.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Clear all session data on authentication error
        localStorage.removeItem("tax-auth-token");
        localStorage.removeItem("tax-refresh-token");
        localStorage.removeItem("tax-auth-user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export interface StrapiResponse<T> {
  data: T;
  meta?: any;
}

export interface UploadedFile {
  id: number;
  documentId: string;
  name: string;
  url: string;
  mime: string;
  size: number;
}

/**
 * Upload a file to Strapi's media library
 * Returns the uploaded file info including URL
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tax-auth-token') : null;

  if (!token) {
    throw new Error('No authentication token');
  }

  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to upload file');
  }

  const uploadedFiles = await response.json();

  if (!uploadedFiles || uploadedFiles.length === 0) {
    throw new Error('No file was uploaded');
  }

  const uploaded = uploadedFiles[0];
  return {
    id: uploaded.id,
    documentId: uploaded.documentId || uploaded.id,
    name: uploaded.name,
    url: uploaded.url.startsWith('http') ? uploaded.url : `${STRAPI_URL}${uploaded.url}`,
    mime: uploaded.mime,
    size: uploaded.size,
  };
}