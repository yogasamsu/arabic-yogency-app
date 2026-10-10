import { BookOpen, Check, Flame, Heart, Mic, MessageCircle, Star, Volume2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContributorCard } from "@/components/ContributorCard";
import { LandingDemo } from "@/components/LandingDemo";
import { getSession } from "@/lib/session";

export default async function Home() {
  if (await getSession()) redirect("/mulai");

  return (
    <div className="min-h-dvh">
      {/* Bilah atas */}
      <header className="sticky top-0 z-20 border-b-2 border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-[22px] font-black text-accent">
            <span className="ar inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[22px] text-accent-ink">ع</span>
            arabic
          </Link>
          <Link href="/masuk" className="btn btn-secondary min-h-11 px-4 text-[14px]">
            Masuk
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
          <div className="order-2 md:order-1">
            <LandingDemo />
            <p className="mt-3 text-center text-[14px] font-bold text-ink-soft">Coba langsung: ini cara kamu belajar di sini.</p>
          </div>
          <div className="order-1 text-center md:order-2 md:text-start">
            <p lang="ar" className="ar text-[28px] text-ink-soft">
              تَعَلَّمِ العَرَبِيَّةَ بِسُهُولَةٍ
            </p>
            <h1 className="mt-2 text-[34px] leading-[1.1] font-black text-ink md:text-[44px]">
              Cara gratis, seru, dan efektif untuk bisa bahasa Arab.
            </h1>
            <p className="mt-4 text-[18px] text-ink-soft">
              5–10 menit sehari: dengar, tirukan, jawab, tulis. Dialog dan tokohnya dekat dengan keseharian Indonesia.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mx-auto sm:max-w-sm md:mx-0">
              <Link href="/daftar" className="btn btn-primary">
                Mulai sekarang
              </Link>
              <Link href="/masuk" className="btn btn-secondary">
                Saya sudah punya akun
              </Link>
            </div>
          </div>
        </section>

        {/* Tiga janji */}
        <section className="border-y-2 border-line bg-surface">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 text-center sm:grid-cols-3">
            {[
              { t: "Gratis selamanya", d: "Tanpa iklan, tanpa langganan. Bayarnya cukup doa." },
              { t: "Sedikit demi sedikit", d: "Pelajaran pendek yang pas untuk sela waktu." },
              { t: "Bukan cuma kaidah", d: "Latih telinga, lidah, mata, dan tangan sekaligus." },
            ].map((x) => (
              <div key={x.t}>
                <p className="text-[22px] font-black text-accent">{x.t}</p>
                <p className="mt-1 text-[16px] text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fitur berselang-seling */}
        <Feature
          title="Dengar dialog aslinya"
          text="Setiap pelajaran dimulai dari percakapan sehari-hari. Ketuk tiap kalimat untuk mendengar pelafalan, baca terjemahannya bila perlu."
          visual={
            <div className="space-y-2">
              <Bubble side="end" who="خالد" ar="السَّلامُ عَلَيْكُم" id="Assalamu'alaikum" />
              <Bubble side="start" who="خليل" ar="وَعَلَيْكُمُ السَّلام" id="Wa'alaikumussalam" />
              <Bubble side="end" who="خالد" ar="كَيْفَ حالُكَ؟" id="Apa kabarmu?" />
            </div>
          }
        />
        <Feature
          reverse
          title="Tirukan, lalu dinilai"
          text="Rekam suaramu. Kami bandingkan dengan kalimat target dan tandai kata yang sudah tepat atau perlu diulang."
          visual={
            <div className="tile space-y-3 p-5">
              <div className="flex items-center gap-3">
                <span className="btn btn-primary h-16 w-16 rounded-full p-0">
                  <Mic aria-hidden className="h-8 w-8" />
                </span>
                <p className="text-[22px] font-black text-good">Skor ucapan: 92</p>
              </div>
              <p className="ar text-[28px]" dir="rtl">
                <span className="me-2 text-good">اِسْمِي</span>
                <span className="text-good">يُوغا</span>
              </p>
            </div>
          }
        />
        <Feature
          title="Latihan yang terasa seperti main"
          text="Pilih gambar yang cocok, susun kalimat, bedakan bunyi خ dan ك. Jawaban salah diulang sampai kamu hafal."
          visual={
            <div className="space-y-3">
              <div className="flex flex-wrap justify-center gap-2" dir="rtl">
                {["أَنا", "مِنْ", "إِنْدونيسِيا"].map((w) => (
                  <span key={w} className="tile ar px-3 py-1 text-[24px]">
                    {w}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl bg-good-bg p-3 text-good">
                <p className="flex items-center gap-2 text-[18px] font-black">
                  <Check aria-hidden className="h-5 w-5" strokeWidth={3} /> Mantap!
                </p>
                <p className="text-[15px]">Saya dari Indonesia.</p>
              </div>
            </div>
          }
        />
        <Feature
          reverse
          title="Pantau kemajuanmu"
          text="Jalur belajar yang jelas dari unit pertama, streak harian, XP, dan ulasan kosakata otomatis supaya tidak lupa."
          visual={
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-[22px] font-black text-accent">
                <Flame aria-hidden className="h-7 w-7 fill-accent" /> 7 hari
              </div>
              <div className="flex items-end gap-5">
                <Node icon={<Check aria-hidden className="h-8 w-8" strokeWidth={3} />} done />
                <Node icon={<MessageCircle aria-hidden className="h-8 w-8" strokeWidth={2.5} />} active />
                <Node icon={<Star aria-hidden className="h-8 w-8" strokeWidth={2.5} />} />
              </div>
            </div>
          }
        />

        {/* Penutup */}
        <section className="mx-auto max-w-3xl px-4 py-14 text-center">
          <Heart aria-hidden className="mx-auto h-10 w-10 fill-accent text-accent" />
          <h2 className="mt-3 text-[30px] leading-tight font-black">Belajar bahasa Al-Qur&apos;an, mulai hari ini.</h2>
          <p className="mt-3 text-[17px] text-ink-soft">
            Proyek nirlaba, amal jariyah. Gratis selamanya, tanpa iklan.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
            <Link href="/daftar" className="btn btn-primary">
              Mulai sekarang
            </Link>
          </div>
        </section>
        <div className="mx-auto max-w-md px-4 pb-14">
          <ContributorCard />
        </div>
      </main>

      <footer className="border-t-2 border-line px-4 py-6 text-center text-[14px] text-ink-soft">
        <p>
          <BookOpen aria-hidden className="me-1.5 inline h-4 w-4 align-[-2px]" />
          Materi orisinal berkonteks Indonesia, ditulis untuk proyek ini.
        </p>
        <p className="mt-1">
          <Volume2 aria-hidden className="me-1.5 inline h-4 w-4 align-[-2px]" />
          arabic.yogency.work · gratis selamanya
        </p>
      </footer>
    </div>
  );
}

function Feature({ title, text, visual, reverse }: { title: string; text: string; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-12 md:grid-cols-2">
      <div className={reverse ? "md:order-2" : ""}>
        <h2 className="text-[28px] leading-tight font-black text-accent">{title}</h2>
        <p className="mt-3 text-[18px] text-ink-soft">{text}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>{visual}</div>
    </section>
  );
}

function Bubble({ side, who, ar, id }: { side: "start" | "end"; who: string; ar: string; id: string }) {
  return (
    <div className={side === "end" ? "flex justify-end" : "flex justify-start"}>
      <div className="tile max-w-[85%] px-4 py-2">
        <p className="ar text-[14px] font-bold text-accent">{who}</p>
        <p className="ar text-[24px]" lang="ar">
          {ar}
        </p>
        <p className="text-[15px] text-ink-soft">{id}</p>
      </div>
    </div>
  );
}

function Node({ icon, done, active }: { icon: React.ReactNode; done?: boolean; active?: boolean }) {
  return (
    <span
      className={
        done
          ? "inline-flex h-[72px] w-[80px] items-center justify-center rounded-[50%] border-b-[6px] border-good-deep bg-good-strong text-white"
          : active
            ? "node-pulse inline-flex h-[72px] w-[80px] items-center justify-center rounded-[50%] border-b-[6px] border-accent-deep bg-accent text-accent-ink"
            : "inline-flex h-[72px] w-[80px] items-center justify-center rounded-[50%] border-b-[6px] border-line bg-peach text-ink-soft"
      }
    >
      {icon}
    </span>
  );
}
