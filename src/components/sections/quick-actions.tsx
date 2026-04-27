"use client";

import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  HeartHandshake,
  LifeBuoy,
  Mail,
  Megaphone,
  MessagesSquare,
  ShieldAlert,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { staggerItem } from "@/components/motion/reveal";
import type { QuickAction } from "@/lib/schemas";

const ICONS: Record<string, LucideIcon> = {
  ShieldAlert,
  Users,
  MessagesSquare,
  HeartHandshake,
  LifeBuoy,
  Mail,
  Megaphone,
  BookOpen,
  Calendar,
  Sparkles,
};

const FALLBACK_ACTIONS: QuickAction[] = [
  {
    icon: "ShieldAlert",
    title: "Submit a grievance",
    body: "Confidential channel for harassment, discrimination, or misconduct concerns.",
    href: "/support#grievance-form",
  },
  {
    icon: "Users",
    title: "Join a club",
    body: "Twelve+ active clubs across tech, design, arts, sports and entrepreneurship.",
    href: "/clubs",
  },
  {
    icon: "MessagesSquare",
    title: "Talk to the Council",
    body: "Share an idea, request a meeting, or flag something the Council should know.",
    href: "mailto:council@woxsen.edu.in",
  },
];

export function QuickActions({ actions }: { actions?: QuickAction[] }) {
  const ACTIONS = actions && actions.length > 0 ? actions : FALLBACK_ACTIONS;
  return (
    <section className="container py-28 sm:py-32">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="grid gap-5 md:grid-cols-3"
      >
        {ACTIONS.map((a) => {
          const Icon = ICONS[a.icon] ?? Sparkles;
          return (
            <motion.div key={a.title} variants={staggerItem}>
              <SpotlightCard
                as="a"
                href={a.href}
                className="group/q flex h-full flex-col justify-between gap-12 p-8"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-ink" aria-hidden />
                  <ArrowUpRight className="h-5 w-5 text-muted transition-all duration-300 group-hover/q:-translate-y-0.5 group-hover/q:translate-x-0.5 group-hover/q:text-ink" />
                </div>
                <div className="space-y-3">
                  <h3 className="display text-2xl text-ink sm:text-3xl">
                    {a.title}
                  </h3>
                  <p className="text-sm text-muted">{a.body}</p>
                </div>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
