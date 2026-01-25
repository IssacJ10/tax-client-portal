/**
 * Secure Document Upload Service
 *
 * Uploads files to Google Cloud Storage via Strapi API.
 * Files are encrypted at rest using Google-managed AES-256 encryption.
 *
 * Features:
 * - Progress tracking via XMLHttpRequest
 * - Client-side validation
 * - Automatic retry on network failure
 * - Error handling with user feedback
 */

import { getCsrfHeaders } from "@/lib/security/csrf";
import { validateFileUpload } from "@/lib/security/validation";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

// Allowed file types for secure document upload
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
];

const ALLOWED_EXTENSIONS = [
    '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'
];

const MAX_FILE_SIZE_MB = 10;

// Document type for categorization
export type DocumentType = 'tax_slip' | 'supporting_doc' | 'id_document' | 'business_doc' | 'other';

// Upload result returned from API
export interface SecureDocumentInfo {
    id: number;
    documentId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    documentType: DocumentType;
    questionId?: string;
    fieldName?: string;
    createdAt: string;
}

// Upload options
export interface SecureUploadOptions {
    filingId: string;
    personalFilingId?: string;
    documentType?: DocumentType;
    questionId?: string;
    fieldName?: string;
    onProgress?: (progress: number) => void;
}

// Upload error with details
export class DocumentUploadError extends Error {
    constructor(
        message: string,
        public code: 'VALIDATION' | 'AUTH' | 'RATE_LIMIT' | 'NETWORK' | 'SERVER',
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'DocumentUploadError';
    }
}

/**
 * Sanitize filename to prevent security issues
 */
function sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
        return 'document';
    }

    let sanitized = filename
        // Remove path traversal attempts
        .replace(/\.\./g, '')
        // Remove path separators
        .replace(/[/\\]/g, '_')
        // Remove dangerous characters
        .replace(/[<>:"|?*\x00-\x1f]/g, '')
        // Remove leading dots
        .replace(/^\.+/, '');

    // Limit length while preserving extension
    if (sanitized.length > 100) {
        const lastDot = sanitized.lastIndexOf('.');
        if (lastDot > 0) {
            const ext = sanitized.substring(lastDot);
            const name = sanitized.substring(0, 100 - ext.length);
            sanitized = name + ext;
        } else {
            sanitized = sanitized.substring(0, 100);
        }
    }

    return sanitized || 'document';
}

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tax-auth-token');
}

/**
 * Upload a document securely to GCS via Strapi
 *
 * @param file - The file to upload
 * @param options - Upload options including filingId
 * @returns Document metadata on success
 */
export async function uploadSecureDocument(
    file: File,
    options: SecureUploadOptions
): Promise<SecureDocumentInfo> {
    // Validate authentication
    const token = getAuthToken();
    if (!token) {
        throw new DocumentUploadError(
            'Please log in to upload documents',
            'AUTH',
            false
        );
    }

    // Validate filingId
    if (!options.filingId) {
        throw new DocumentUploadError(
            'Filing ID is required for upload',
            'VALIDATION',
            false
        );
    }

    // Validate file
    const validation = validateFileUpload(file, {
        maxSizeMB: MAX_FILE_SIZE_MB,
        allowedTypes: ALLOWED_MIME_TYPES,
        allowedExtensions: ALLOWED_EXTENSIONS,
    });

    if (!validation.valid) {
        throw new DocumentUploadError(
            validation.error || 'Invalid file',
            'VALIDATION',
            false
        );
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    const sanitizedFile = new File([file], sanitizedFilename, { type: file.type });

    // Create FormData
    const formData = new FormData();
    formData.append('file', sanitizedFile);
    formData.append('filingId', options.filingId);

    if (options.personalFilingId) {
        formData.append('personalFilingId', options.personalFilingId);
    }

    formData.append('documentType', options.documentType || 'other');

    if (options.questionId) {
        formData.append('questionId', options.questionId);
    }

    if (options.fieldName) {
        formData.append('fieldName', options.fieldName);
    }

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress handler
        if (options.onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    options.onProgress!(progress);
                }
            });
        }

        // Load handler (success)
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.data) {
                        resolve(response.data as SecureDocumentInfo);
                    } else {
                        reject(new DocumentUploadError(
                            'Invalid response from server',
                            'SERVER',
                            true
                        ));
                    }
                } catch {
                    reject(new DocumentUploadError(
                        'Failed to parse server response',
                        'SERVER',
                        true
                    ));
                }
            } else if (xhr.status === 401) {
                // Auth expired
                reject(new DocumentUploadError(
                    'Session expired. Please log in again.',
                    'AUTH',
                    false
                ));
            } else if (xhr.status === 403) {
                reject(new DocumentUploadError(
                    'You do not have permission to upload to this filing',
                    'AUTH',
                    false
                ));
            } else if (xhr.status === 429) {
                // Rate limited
                const retryAfter = xhr.getResponseHeader('Retry-After') || '60';
                reject(new DocumentUploadError(
                    `Too many uploads. Please wait ${retryAfter} seconds.`,
                    'RATE_LIMIT',
                    true
                ));
            } else if (xhr.status === 413) {
                reject(new DocumentUploadError(
                    'File is too large. Maximum size is 10MB.',
                    'VALIDATION',
                    false
                ));
            } else {
                // Other server errors
                let errorMessage = 'Failed to upload document';
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    errorMessage = errorResponse.error?.message || errorMessage;
                } catch {
                    // Use default error message
                }
                reject(new DocumentUploadError(
                    errorMessage,
                    'SERVER',
                    xhr.status >= 500
                ));
            }
        });

        // Error handler (network failure)
        xhr.addEventListener('error', () => {
            reject(new DocumentUploadError(
                'Network error. Please check your connection and try again.',
                'NETWORK',
                true
            ));
        });

        // Timeout handler
        xhr.addEventListener('timeout', () => {
            reject(new DocumentUploadError(
                'Upload timed out. Please try again.',
                'NETWORK',
                true
            ));
        });

        // Abort handler
        xhr.addEventListener('abort', () => {
            reject(new DocumentUploadError(
                'Upload was cancelled',
                'NETWORK',
                false
            ));
        });

        // Configure and send request
        xhr.open('POST', `${STRAPI_URL}/api/documents/upload`);
        xhr.timeout = 60000; // 60 second timeout for large files

        // Set auth header
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        // Set CSRF headers
        const csrfHeaders = getCsrfHeaders();
        Object.entries(csrfHeaders).forEach(([key, value]) => {
            if (value) {
                xhr.setRequestHeader(key, value);
            }
        });

        // Send the request
        xhr.send(formData);
    });
}

/**
 * Upload with automatic retry on network failure
 */
export async function uploadSecureDocumentWithRetry(
    file: File,
    options: SecureUploadOptions,
    maxRetries: number = 2
): Promise<SecureDocumentInfo> {
    let lastError: DocumentUploadError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await uploadSecureDocument(file, options);
        } catch (error) {
            if (error instanceof DocumentUploadError) {
                lastError = error;

                // Don't retry non-retryable errors
                if (!error.retryable) {
                    throw error;
                }

                // Don't retry if this was the last attempt
                if (attempt === maxRetries) {
                    throw error;
                }

                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }

    throw lastError || new DocumentUploadError('Upload failed', 'SERVER', false);
}

/**
 * Get download URL for a document
 * Returns a time-limited signed URL
 */
export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
    const token = getAuthToken();
    if (!token) {
        throw new DocumentUploadError('Please log in to download documents', 'AUTH', false);
    }

    const response = await fetch(`${STRAPI_URL}/api/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...getCsrfHeaders(),
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new DocumentUploadError('Session expired. Please log in again.', 'AUTH', false);
        }
        if (response.status === 403) {
            throw new DocumentUploadError('You do not have permission to download this document', 'AUTH', false);
        }
        if (response.status === 404) {
            throw new DocumentUploadError('Document not found', 'VALIDATION', false);
        }
        throw new DocumentUploadError('Failed to get download URL', 'SERVER', true);
    }

    const data = await response.json();
    return data.data.url;
}

/**
 * List documents for a filing
 */
export async function listFilingDocuments(filingId: string): Promise<SecureDocumentInfo[]> {
    const token = getAuthToken();
    if (!token) {
        throw new DocumentUploadError('Please log in to view documents', 'AUTH', false);
    }

    const response = await fetch(`${STRAPI_URL}/api/documents/filing/${filingId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...getCsrfHeaders(),
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new DocumentUploadError('Session expired. Please log in again.', 'AUTH', false);
        }
        if (response.status === 403) {
            throw new DocumentUploadError('You do not have permission to view these documents', 'AUTH', false);
        }
        throw new DocumentUploadError('Failed to list documents', 'SERVER', true);
    }

    const data = await response.json();
    return data.data || [];
}
