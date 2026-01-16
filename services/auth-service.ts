// tax-client-portal/services/auth-service.ts

import { strapiClient } from "./strapi-client"

export const AuthService = {
    async login(data: any) {
        return strapiClient.post<any>("/auth/local", data)
    },
    async register(data: any) {
        return strapiClient.post<any>("/auth/local/register", data)
    },
    async getMe() {
        return strapiClient.get<any>("/users/me")
    },
    getGoogleAuthURL() {
        return `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/connect/google`
    }
}