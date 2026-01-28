"use client"

export function ParallaxBackground() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden will-change-auto content-visibility-auto">
            {/* Base gradient — blue to warm gold sweep */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8f0fa] via-[#f5f0e8] to-[#e8f0fa]" />

            {/* Blue orb — top left (reduced blur for performance) */}
            <div className="absolute -top-[100px] -left-[100px] w-[500px] h-[500px] rounded-full bg-[#07477a]/[0.10] blur-[80px] transform-gpu" />

            {/* Warm gold orb — bottom right */}
            <div className="absolute -bottom-[100px] -right-[100px] w-[450px] h-[450px] rounded-full bg-[#c9a84c]/[0.08] blur-[70px] transform-gpu" />

            {/* Light teal orb — center right */}
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#3b9cc2]/[0.06] blur-[60px] transform-gpu" />

            {/* Soft pink/peach accent — bottom left */}
            <div className="absolute bottom-1/4 -left-[50px] w-[350px] h-[350px] rounded-full bg-[#d4a574]/[0.05] blur-[50px] transform-gpu" />
        </div>
    )
}
