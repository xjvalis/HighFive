import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// TODO before launch: fill in the [DOPLNIT: ...] placeholders below with your
// real legal identity/contact. This is a solid generic starting point, not a
// substitute for a lawyer's review — especially given users meet in person.
export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto pb-16 pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <Link to="/" className="flex items-center gap-2 mb-4 transition-colors w-fit" style={{ font: "300 12px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
        <ArrowLeft className="w-3.5 h-3.5"/>Zpět
      </Link>

      <div style={{ background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)', padding: '22px 22px' }} className="space-y-5">
        <div>
          <h1 style={{ font: "500 19px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)', marginBottom: 4 }}>Zásady ochrany osobních údajů</h1>
          <p style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>Platné od: 1. 8. 2026</p>
        </div>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>1. Kdo jsme</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Provozovatelem platformy Spoluvíc (dále jen „my", „Spoluvíc" nebo „Služba") a správcem osobních
            údajů je <strong>Jan Vališ, se sídlem Praha - Záběhlice, Roztylské náměstí 2396/1, 141 00, IČO: 04859944</strong>, kontaktní e-mail pro otázky
            ochrany soukromí: <strong>xjvalis+spoluvic@gmail.com</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>2. Jaké údaje zpracováváme</h2>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li><strong>Registrační údaje:</strong> e-mail, jméno, heslo (uloženo zašifrovaně), případně údaje z Google účtu při přihlášení přes Google.</li>
            <li><strong>Profilové údaje:</strong> profilová fotka, věk, pohlaví, oblíbené kategorie aktivit - vše dobrovolné, pokud není u konkrétního pole uvedeno jinak.</li>
            <li><strong>Poloha:</strong> přibližná poloha při vyhledávání akcí v okolí nebo adresa zadaná při vytváření akce. Přesnou GPS polohu zpracováváme jen pokud k tomu dáte souhlas v prohlížeči/zařízení.</li>
            <li><strong>Obsah, který vytváříte:</strong> vytvořené akce, komentáře, zprávy v chatu a soukromé zprávy ostatním uživatelům.</li>
            <li><strong>Údaje o účasti:</strong> na jaké akce jste se přihlásili/je organizovali, hodnocení spolehlivosti (docházka/no-show skóre).</li>
            <li><strong>Platební údaje:</strong> u placených tarifů zpracovává platby výhradně Stripe, my čísla platebních karet nikdy nevidíme ani neukládáme.</li>
            <li><strong>Technické údaje:</strong> IP adresa, typ zařízení a prohlížeče, logy přístupu - pro bezpečnost a diagnostiku chyb.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>3. Proč údaje zpracováváme</h2>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li>Abychom vám umožnili vytvořit účet a používat Službu (plnění smlouvy).</li>
            <li>Abychom vám zobrazovali relevantní akce ve vašem okolí a umožnili komunikaci s ostatními uživateli.</li>
            <li>Pro bezpečnost komunity - moderace obsahu, vyřizování nahlášení, sledování spolehlivosti účastníků.</li>
            <li>Pro fakturaci a správu placených tarifů.</li>
            <li>Pro zasílání upozornění souvisejících s vaší aktivitou v aplikaci (nové zprávy, změny u akcí apod.).</li>
            <li>Pro zlepšování Služby a opravu chyb (anonymizovaná diagnostická data).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>4. Právní základ zpracování</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Údaje zpracováváme na základě plnění smlouvy (provoz vašeho účtu a Služby), oprávněného zájmu
            (bezpečnost komunity, prevence zneužití) a v případě volitelných údajů (např. věk, pohlaví,
            přesná poloha) na základě vašeho souhlasu, který můžete kdykoliv odvolat v nastavení profilu.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>5. Komu údaje předáváme</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Údaje nikdy neprodáváme třetím stranám. Pro provoz Služby využíváme tyto zpracovatele:
          </p>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li><strong>Supabase</strong> - hosting databáze, autentizace a ukládání souborů (fotky).</li>
            <li><strong>Stripe</strong> - zpracování plateb za placené tarify.</li>
            <li><strong>Mapy.cz (Seznam.cz)</strong> - vyhledávání a zobrazování míst konání akcí.</li>
            <li><strong>Resend</strong> - odesílání e-mailových notifikací.</li>
            <li>Případně další poskytovatelé infrastruktury (hosting) - vždy jen v rozsahu nutném pro provoz Služby.</li>
          </ul>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Někteří z těchto zpracovatelů mohou být mimo Evropský hospodářský prostor; v takovém případě
            zajišťujeme ochranu údajů standardními smluvními doložkami nebo obdobným mechanismem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>6. Doba uchovávání</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Údaje uchováváme po dobu trvání vašeho účtu. Po zrušení účtu údaje smažeme nebo anonymizujeme
            do 30 dnů, s výjimkou údajů, které jsme ze zákona povinni uchovávat déle (např. účetní doklady).
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>7. Vaše práva</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>Podle GDPR máte právo:</p>
          <ul className="list-disc pl-5 space-y-1" style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            <li>na přístup ke svým osobním údajům,</li>
            <li>na opravu nepřesných údajů,</li>
            <li>na výmaz („právo být zapomenut") - účet a data si můžete smazat přímo v nastavení profilu,</li>
            <li>na přenositelnost údajů,</li>
            <li>vznést námitku proti zpracování na základě oprávněného zájmu,</li>
            <li>kdykoliv odvolat udělený souhlas,</li>
            <li>podat stížnost u Úřadu pro ochranu osobních údajů (uoou.cz), pokud se domníváte, že vaše práva byla porušena.</li>
          </ul>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Pro uplatnění těchto práv nás kontaktujte na <strong>xjvalis+spoluvic@gmail.com</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>8. Cookies a lokální úložiště</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Používáme technicky nezbytná úložiště v prohlížeči (localStorage) pro udržení vašeho přihlášení.
            Nepoužíváme marketingové ani sledovací cookies třetích stran.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>9. Zabezpečení</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Přístup k datům je chráněn autentizací a řízením přístupu na úrovni databáze (row-level security).
            Hesla ukládáme pouze v zašifrované podobě. Přesto žádný systém není stoprocentně bezpečný - v
            případě bezpečnostního incidentu vás budeme informovat v souladu se zákonnými lhůtami.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>10. Věkové omezení</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Služba je určena osobám starším 18 let. Vědomě nezpracováváme údaje osob mladších 18 let. Pokud
            zjistíme, že jsme takové údaje získali, účet a související data odstraníme.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>11. Změny těchto zásad</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Tyto zásady můžeme čas od času aktualizovat. O podstatných změnách vás budeme informovat
            e-mailem nebo upozorněním v aplikaci.
          </p>
        </section>

        <section className="space-y-2">
          <h2 style={{ font: "500 14.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>12. Kontakt</h2>
          <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.6 }}>
            Máte-li jakékoliv dotazy ohledně zpracování vašich osobních údajů, napište nám na
            <strong> xjvalis+spoluvic@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
