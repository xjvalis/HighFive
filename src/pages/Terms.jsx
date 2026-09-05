import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// TODO before launch: fill in the [DOPLNIT: ...] placeholders below with your
// real legal identity/contact. This is a solid generic starting point, not a
// substitute for a lawyer's review — especially given users meet in person.
export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <Link to="/" className="flex items-center gap-2 mb-4 transition-colors w-fit" style={{ font: "300 12px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
        <ArrowLeft className="w-3.5 h-3.5"/>Zpět
      </Link>

      <div style={{ background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)', padding: '22px 22px' }} className="space-y-5">
        <div>
          <h1 style={{ font: "500 19px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)', marginBottom: 4 }}>Podmínky používání</h1>
          <p style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>Platné od: 1. 8. 2026</p>
        </div>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>1. Úvod</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Tyto podmínky upravují používání platformy Spoluvíc (dále jen „Služba"), kterou provozuje
            <strong> Jan Vališ, se sídlem Praha - Záběhlice, Roztylské náměstí 2396/1, 141 00, IČO: 04859944</strong>. Registrací nebo používáním Služby
            s těmito podmínkami souhlasíte. Pokud s nimi nesouhlasíte, Službu prosím nepoužívejte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>2. Co Služba je (a co není)</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Spoluvíc je platforma, která uživatelům umožňuje vytvářet a vyhledávat společné aktivity a
            propojovat se s dalšími lidmi. <strong>Spoluvíc akce sám neorganizuje, neověřuje totožnost
            uživatelů ani bezpečnost, vhodnost či legálnost jednotlivých akcí.</strong> Akce vytvářejí
            a organizují sami uživatelé, na vlastní odpovědnost.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>3. Registrace a účet</h2>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li>Služba je určena osobám starším 18 let.</li>
            <li>Při registraci jste povinni uvádět pravdivé údaje.</li>
            <li>Za veškerou aktivitu na svém účtu a za zabezpečení přístupových údajů odpovídáte vy sami.</li>
            <li>Jeden člověk může mít jen jeden účet.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>4. Pravidla chování</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>Při používání Služby je zakázáno:</p>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li>obtěžovat, ohrožovat, ponižovat nebo diskriminovat ostatní uživatele,</li>
            <li>zveřejňovat nenávistný, sexuálně explicitní, násilný nebo jinak nevhodný obsah,</li>
            <li>vytvářet podvodné, klamavé nebo nebezpečné akce,</li>
            <li>spamovat, propagovat nesouvisející produkty/služby nebo zneužívat Službu ke komerčním účelům bez souhlasu,</li>
            <li>vydávat se za jinou osobu nebo vytvářet falešné účty,</li>
            <li>obcházet bezpečnostní nebo moderační mechanismy Služby.</li>
          </ul>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Porušení těchto pravidel může vést k odstranění obsahu, dočasnému omezení nebo trvalému zrušení účtu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>5. Bezpečnost při osobních setkáních</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Akce vytvořené přes Spoluvíc zahrnují setkání s dalšími lidmi v reálném světě.
            <strong> Účast na jakékoliv akci je zcela na vaše vlastní riziko.</strong> Doporučujeme:
          </p>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li>první setkání domlouvat na veřejném místě,</li>
            <li>informovat blízkou osobu, kam a s kým jdete,</li>
            <li>nesdílet citlivé osobní nebo finanční údaje s ostatními uživateli,</li>
            <li>podezřelé nebo nebezpečné chování ihned nahlásit přes funkci nahlášení v aplikaci.</li>
          </ul>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Spoluvíc neprovádí prověrky totožnosti ani trestní bezúhonnosti uživatelů a nenese odpovědnost
            za jednání uživatelů v rámci akcí ani mimo Službu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>6. Obsah vytvořený uživateli</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Za obsah, který zveřejníte (akce, komentáře, zprávy, fotky), odpovídáte vy. Zveřejněním obsahu
            nám udělujete nevýhradní licenci k jeho zobrazování v rámci Služby. Vyhrazujeme si právo obsah,
            který porušuje tyto podmínky, odstranit bez předchozího upozornění.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>7. Placené tarify</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Služba nabízí volitelné placené tarify s rozšířenými funkcemi. Platby zpracovává Stripe.
            Předplatné se automaticky obnovuje, dokud jej nezrušíte v nastavení profilu. Zaplacené období
            se nevrací, pokud zákon nestanoví jinak.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>8. Ukončení účtu</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Účet si můžete kdykoliv sami smazat v nastavení profilu. Vyhrazujeme si právo pozastavit nebo
            zrušit účet, který opakovaně nebo závažně porušuje tyto podmínky.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>9. Omezení odpovědnosti</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Službu poskytujeme „tak, jak je", bez záruk dostupnosti nebo bezchybnosti. V maximálním rozsahu
            povoleném zákonem neneseme odpovědnost za škody vzniklé z interakcí mezi uživateli, z účasti na
            akcích, ani za nepřímé či následné škody vzniklé používáním Služby.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>10. Změny podmínek</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Tyto podmínky můžeme čas od času upravit. O podstatných změnách vás budeme informovat e-mailem
            nebo upozorněním v aplikaci. Pokračováním v používání Služby po změně s podmínkami souhlasíte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>11. Rozhodné právo</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Tyto podmínky se řídí právním řádem České republiky. Případné spory budou řešeny u věcně a
            místně příslušných soudů České republiky.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>12. Kontakt</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Dotazy k těmto podmínkám posílejte na <strong>xjvalis+spoluvic@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
