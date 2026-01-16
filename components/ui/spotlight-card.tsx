"use client"

import { useRef, useState, MouseEvent, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    spotlightColor?: string
}

export const SpotlightCard = ({
    children,
    className = "",
    spotlightColor = "rgba(167, 139, 250, 0.25)", // Default Indigo Glow
    ...props
}: SpotlightCardProps) => {
    const divRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return

        const rect = divRef.current.getBoundingClientRect()
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })

        // Call original handler if it exists
        if (props.onMouseMove) props.onMouseMove(e)
    }

    const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
        setOpacity(1)
        if (props.onMouseEnter) props.onMouseEnter(e)
    }

    const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
        setOpacity(0)
        if (props.onMouseLeave) props.onMouseLeave(e)
    }

    return (
        <div
            ref={divRef}
            {...props}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-8 shadow-2xl transition-colors duration-300",
                className
            )}
        >
            {/* The Spotlight Overlay */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />
            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    )
}
