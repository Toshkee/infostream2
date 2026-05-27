import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PinnedHero from "@/components/sections/PinnedHero";
import Stats from "@/components/sections/Stats";
import Clients from "@/components/sections/Clients";
import Technology from "@/components/sections/Technology";
import Security from "@/components/sections/Security";
import LiveFeed from "@/components/sections/LiveFeed";
import Contact from "@/components/sections/Contact";
import EdgeBeam from "@/components/effects/EdgeBeam";

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <Navbar dict={dict} lang={lang} />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <PinnedHero dict={dict} />
        <EdgeBeam><Stats dict={dict} /></EdgeBeam>
        <EdgeBeam><Clients dict={dict} /></EdgeBeam>
        <EdgeBeam><Technology dict={dict} /></EdgeBeam>
        <EdgeBeam><LiveFeed dict={dict} /></EdgeBeam>
        <EdgeBeam><Security dict={dict} /></EdgeBeam>
        <EdgeBeam><Contact dict={dict} /></EdgeBeam>
      </main>
      <Footer dict={dict} />
    </>
  );
}
