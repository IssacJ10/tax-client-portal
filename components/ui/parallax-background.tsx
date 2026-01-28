"use client"

export function ParallaxBackground() {
    return (
        <div className="fixed inset-0 -z-50 overflow-hidden">
            {/* Base gradient — blue to warm gold sweep */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8f0fa] via-[#f5f0e8] to-[#e8f0fa]" />

            {/* Blue orb — top left */}
            <div className="absolute -top-[100px] -left-[100px] w-[700px] h-[700px] rounded-full bg-[#07477a]/[0.12] blur-[180px]" />

            {/* Warm gold orb — bottom right */}
            <div className="absolute -bottom-[100px] -right-[100px] w-[600px] h-[600px] rounded-full bg-[#c9a84c]/[0.10] blur-[150px]" />

            {/* Light teal orb — center right */}
            <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[#3b9cc2]/[0.08] blur-[140px]" />

            {/* Soft pink/peach accent — bottom left */}
            <div className="absolute bottom-1/4 -left-[50px] w-[400px] h-[400px] rounded-full bg-[#d4a574]/[0.07] blur-[120px]" />
        </div>
    )
}
