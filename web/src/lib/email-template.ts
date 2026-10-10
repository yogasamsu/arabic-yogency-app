// Template email admin. Tanpa rahasia, jadi dipakai juga untuk pratinjau di browser.

export type EmailVars = { nama: string; selesai: number; total: number; xp: number };

export const PLACEHOLDERS: { tag: string; desc: string }[] = [
  { tag: "{nama}", desc: "nama panggilan" },
  { tag: "{selesai}", desc: "jumlah pelajaran selesai" },
  { tag: "{total}", desc: "jumlah seluruh pelajaran" },
  { tag: "{xp}", desc: "total XP" },
];

export const AUDIENCES = {
  all: "Semua peserta",
  active7: "Aktif 7 hari terakhir",
  inactive7: "Sudah mulai, tapi tidak belajar 7 hari terakhir",
  not_started: "Belum pernah mulai belajar",
} as const;
export type Audience = keyof typeof AUDIENCES;
export const isAudience = (a: unknown): a is Audience => typeof a === "string" && a in AUDIENCES;

export function fillVars(text: string, v: EmailVars) {
  return text
    .replaceAll("{nama}", v.nama)
    .replaceAll("{selesai}", String(v.selesai))
    .replaceAll("{total}", String(v.total))
    .replaceAll("{xp}", String(v.xp));
}

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Teks biasa → HTML aman: paragraf dari baris kosong, tautan http(s) dapat diklik. */
export function bodyToHtml(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => {
      const html = esc(p)
        .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#a23e43">${u}</a>`)
        .replaceAll("\n", "<br>");
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join("");
}

export function renderEmail(opts: {
  subject: string;
  body: string;
  vars: EmailVars;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const subject = fillVars(opts.subject, opts.vars);
  const body = fillVars(opts.body, opts.vars);
  const cta = `${opts.appUrl}/belajar`;
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#fef7d6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3a2622">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 16px;font-weight:700;color:#a23e43">arabic.yogency.work</p>
<div style="background:#fffcef;border:1px solid #ecd9b8;border-radius:20px;padding:24px;font-size:16px;line-height:1.6">
${bodyToHtml(body)}
<p style="margin:8px 0 0"><a href="${cta}" style="display:inline-block;background:#a23e43;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Lanjut belajar</a></p>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#6e4d45">Kamu menerima email ini karena terdaftar di arabic.yogency.work.
<a href="${opts.unsubscribeUrl}" style="color:#6e4d45">Berhenti menerima email</a>.</p>
</div></body></html>`;
  const text = `${body.trim()}\n\nLanjut belajar: ${cta}\n\n—\nKamu menerima email ini karena terdaftar di arabic.yogency.work.\nBerhenti menerima email: ${opts.unsubscribeUrl}\n`;
  return { subject, html, text };
}
