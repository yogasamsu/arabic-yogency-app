import { redirect } from "next/navigation";

// Kode undangan sudah tidak dipakai (pendaftaran terbuka). Tautan lama diarahkan ke belajar.
export default function UndanganPage() {
  redirect("/belajar");
}
