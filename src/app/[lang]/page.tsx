import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/dictionaries";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Expertise from "@/components/sections/Expertise";
import PinnedProcess from "@/components/sections/PinnedProcess";
import Technology from "@/components/sections/Technology";
import Security from "@/components/sections/Security";
import Clients from "@/components/sections/Clients";
import Contact from "@/components/sections/Contact";
import EdgeBeam from "@/components/EdgeBeam";

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <Navbar nav={dict.nav} lang={lang} />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Hero hero={dict.hero} />
        <Expertise expertise={dict.expertise} lang={lang} />
        <PinnedProcess dict={dict} />
        <EdgeBeam><Clients dict={dict} /></EdgeBeam>
        <EdgeBeam><Technology technology={dict.technology} /></EdgeBeam>
        <EdgeBeam><Security security={dict.security} /></EdgeBeam>
        <EdgeBeam><Contact contact={dict.contact} /></EdgeBeam>
      </main>
      <Footer dict={dict} lang={lang} />
    </>
  );
}
