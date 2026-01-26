"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"

export function ParallaxBackground() {
    const { scrollYProgress } = useScroll()

    // Move background up slowly (standard parallax depth) ensuring no gaps
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"])

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden">
            <motion.div style={{ y }} className="relative w-full h-[100vh] will-change-transform">
                {/* ACCOUNTING IMAGE */}
                <Image
                    src="/images/taxbg.png"
                    alt="Professional Tax Background"
                    fill
                    className="object-cover"
                    priority
                    quality={90}
                />
                {/* WHITE OVERLAY (for light theme readability) */}
                <div className="absolute inset-0 bg-white/80" />

                {/* Subtle green tint */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#07477a]/5 via-transparent to-[#07477a]/5" />
            </motion.div>
        </div>
    )
}
