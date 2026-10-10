import { ExternalLink, MessageCircle } from "lucide-react";
import { WA_NUMBER } from "./FeedbackLink";

const LINKEDIN = "https://www.linkedin.com/in/yogasamsu/";
const WHATSAPP = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  "Assalamu'alaikum Yoga, saya tertarik berkontribusi di arabic.yogency.work: ",
)}`;

/** Ajakan berkontribusi + profil singkat developer. */
export function ContributorCard() {
  return (
    <section className="tile p-5 text-start" aria-labelledby="kontribusi-title">
      <h2 id="kontribusi-title" className="text-[22px] leading-tight font-black">
        Ingin berkontribusi di project ini?
      </h2>
      <p className="mt-1 text-[16px] text-ink-soft">
        Bantu review harakat, terjemahan, desain, atau kode. Hubungi developer.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-b-4 border-accent-deep bg-accent text-[22px] font-black text-accent-ink">
          YS
        </span>
        <div className="min-w-0">
          <p className="font-black">Yoga Samsugiharja</p>
          <p className="text-[15px] text-ink-soft">Pelayan Tuhan. Suka baca dan mecutin AI.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
          <MessageCircle aria-hidden className="h-5 w-5" />
          WhatsApp
        </a>
        <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
          LinkedIn
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
