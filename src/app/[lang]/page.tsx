import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PinnedHero from "@/components/sections/PinnedHero";
import Clients from "@/components/sections/Clients";
import Security from "@/components/sections/Security";
import Contact from "@/components/sections/Contact";

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <Navbar dict={dict} lang={lang} />
      <main>
        <PinnedHero dict={dict} />
        <Clients dict={dict} />
        <Security dict={dict} />
        <Contact dict={dict} />
      </main>
      <Footer dict={dict} />
    </>
  );
}
