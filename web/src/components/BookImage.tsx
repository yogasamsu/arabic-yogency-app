/* eslint-disable @next/next/no-img-element -- ilustrasi lama lewat route privat; ilustrasi orisinal WebP kecil di /img/o */
import clsx from "clsx";

export function BookImage({ name, className }: { name: string; className?: string }) {
  return (
    <img
      src={name.startsWith("/") ? name : `/api/img/${name}`}
      alt="Ilustrasi"
      loading="lazy"
      decoding="async"
      className={clsx("rounded-xl bg-peach object-contain", className)}
    />
  );
}
