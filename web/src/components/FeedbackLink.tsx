import { MessageCircle } from "lucide-react";
import clsx from "clsx";

export const WA_NUMBER = "6281578613875";

/** Tautan WhatsApp ke Yoga untuk masukan langsung dari pengguna. */
export function feedbackUrl(context?: string) {
  const text = `Assalamu'alaikum Yoga, saya mau kasih masukan untuk arabic.yogency.work${context ? ` (${context})` : ""}: `;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function FeedbackLink({
  context,
  variant = "button",
  className,
}: {
  context?: string;
  variant?: "button" | "link";
  className?: string;
}) {
  return (
    <a
      href={feedbackUrl(context)}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        variant === "button" ? "btn btn-secondary w-full" : "inline-flex items-center gap-1.5 font-bold text-accent underline-offset-4 hover:underline",
        className,
      )}
    >
      <MessageCircle aria-hidden className="h-5 w-5" />
      Kirim masukan via WhatsApp
    </a>
  );
}
