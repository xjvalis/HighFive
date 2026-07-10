import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// TODO before launch: fill in the [DOPLNIT: ...] placeholders below with your
// real legal identity/contact. This is a solid generic starting point, not a
// substitute for a lawyer's review — especially given users meet in person.
export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto pb-16">
      <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4"/>Zpět
      </Link>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-grotesk font-bold text-2xl mb-1">Podmínky používání</h1>
          <p className="text-sm text-muted-foreground">Platné od: 1. 8. 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">1. Úvod</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Tyto podmínky upravují používání platformy HighFive (dále jen „Služba"), kterou provozuje
            <strong> Jan Vališ, se sídlem Praha - Záběhlice, Roztylské náměstí 2396/1, 141 00, IČO: 04859944</strong>. Registrací nebo používáním Služby
            s těmito podmínkami souhlasíte. Pokud s nimi nesouhlasíte, Službu prosím nepoužívejte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">2. Co Služba je (a co není)</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            HighFive je platforma, která uživatelům umožňuje vytvářet a vyhledávat společné aktivity a
            propojovat se s dalšími lidmi. <strong>HighFive akce sám neorganizuje, neověřuje totožnost
            uživatelů ani bezpečnost, vhodnost či legálnost jednotlivých akcí.</strong> Akce vytvářejí
            a organizují sami uživatelé, na vlastní odpovědnost.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">3. Registrace a účet</h2>
          <ul className="list-disc pl-5 text-sm text-foreground/80 leading-relaxed space-y-1">
            <li>Služba je určena osobám starším 18 let.</li>
            <li>Při registraci jste povinni uvádět pravdivé údaje.</li>
            <li>Za veškerou aktivitu na svém účtu a za zabezpečení přístupových údajů odpovídáte vy sami.</li>
            <li>Jeden člověk může mít jen jeden účet.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">4. Pravidla chování</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">Při používání Služby je zakázáno:</p>
          <ul className="list-disc pl-5 text-sm text-foreground/80 leading-relaxed space-y-1">
            <li>obtěžovat, ohrožovat, ponižovat nebo diskriminovat ostatní uživatele,</li>
            <li>zveřejňovat nenávistný, sexuálně explicitní, násilný nebo jinak nevhodný obsah,</li>
            <li>vytvářet podvodné, klamavé nebo nebezpečné akce,</li>
            <li>spamovat, propagovat nesouvisející produkty/služby nebo zneužívat Službu ke komerčním účelům bez souhlasu,</li>
            <li>vydávat se za jinou osobu nebo vytvářet falešné účty,</li>
            <li>obcházet bezpečnostní nebo moderační mechanismy Služby.</li>
          </ul>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Porušení těchto pravidel může vést k odstranění obsahu, dočasnému omezení nebo trvalému zrušení účtu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">5. Bezpečnost při osobních setkáních</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Akce vytvořené přes HighFive zahrnují setkání s dalšími lidmi v reálném světě.
            <strong> Účast na jakékoliv akci je zcela na vaše vlastní riziko.</strong> Doporučujeme:
          </p>
          <ul className="list-disc pl-5 text-sm text-foreground/80 leading-relaxed space-y-1">
            <li>první setkání domlouvat na veřejném místě,</li>
            <li>informovat blízkou osobu, kam a s kým jdete,</li>
            <li>nesdílet citlivé osobní nebo finanční údaje s ostatními uživateli,</li>
            <li>podezřelé nebo nebezpečné chování ihned nahlásit přes funkci nahlášení v aplikaci.</li>
          </ul>
          <p className="text-sm text-foreground/80 leading-relaxed">
            HighFive neprovádí prověrky totožnosti ani trestní bezúhonnosti uživatelů a nenese odpovědnost
            za jednání uživatelů v rámci akcí ani mimo Službu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">6. Obsah vytvořený uživateli</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Za obsah, který zveřejníte (akce, komentáře, zprávy, fotky), odpovídáte vy. Zveřejněním obsahu
            nám udělujete nevýhradní licenci k jeho zobrazování v rámci Služby. Vyhrazujeme si právo obsah,
            který porušuje tyto podmínky, odstranit bez předchozího upozornění.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">7. Placené tarify</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Služba nabízí volitelné placené tarify s rozšířenými funkcemi. Platby zpracovává Stripe.
            Předplatné se automaticky obnovuje, dokud jej nezrušíte v nastavení profilu. Zaplacené období
            se nevrací, pokud zákon nestanoví jinak.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">8. Ukončení účtu</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Účet si můžete kdykoliv sami smazat v nastavení profilu. Vyhrazujeme si právo pozastavit nebo
            zrušit účet, který opakovaně nebo závažně porušuje tyto podmínky.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">9. Omezení odpovědnosti</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Službu poskytujeme „tak, jak je", bez záruk dostupnosti nebo bezchybnosti. V maximálním rozsahu
            povoleném zákonem neneseme odpovědnost za škody vzniklé z interakcí mezi uživateli, z účasti na
            akcích, ani za nepřímé či následné škody vzniklé používáním Služby.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">10. Změny podmínek</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Tyto podmínky můžeme čas od času upravit. O podstatných změnách vás budeme informovat e-mailem
            nebo upozorněním v aplikaci. Pokračováním v používání Služby po změně s podmínkami souhlasíte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">11. Rozhodné právo</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny u věcně a
            místně příslušných soudů České republiky.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-grotesk font-semibold text-lg">12. Kontakt</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Dotazy k těmto podmínkám posílejte na <strong>xjvalis+highfive@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
