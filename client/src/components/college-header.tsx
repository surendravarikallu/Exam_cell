import React from "react";

/**
 * CollegeHeader — renders the official KITS AKSHAR letterhead banner
 * directly from the header image file in /public.
 * This ensures pixel-perfect match with the official letterhead.
 */
export function CollegeHeader({ className = "" }: { className?: string }) {
    return (
        <div className={`w-full bg-white ${className}`}>
            <img
                src="/Screenshot 2025-07-25 113411_1753423944040.webp"
                alt="KITS Akshar Institute of Technology — Official Header"
                className="w-full h-auto object-contain"
                style={{ maxHeight: 110 }}
            />
        </div>
    );
}
