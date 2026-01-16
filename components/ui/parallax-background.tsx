"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import { useRef } from "react"

export function ParallaxBackground() {
    const { scrollYProgress } = useScroll()

    // Move background up slowly (standard parallax depth) ensuring no gaps
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"])

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden h-full w-full">
            <motion.div style={{ y }} className="relative w-full h-[150vh] will-change-transform">
                {/* ACCOUNTING IMAGE */}
                <Image
                    src="/images/taxbg.png"
                    alt="Professional Tax Background"
                    fill
                    className="object-cover"
                    priority
                    quality={90}
                />
                {/* DARK OVERLAY (Crucial for text readability) */}
                <div className="absolute inset-0 bg-background/90 backdrop-blur-[1px]" />

                {/* Subtle Noise Texture for premium feel */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </motion.div>
        </div>
    )
}
