import type { Messages } from "..";

/** Compliance prompts and the in-between states (errors, 404, offline). */
export const states: Pick<
  Messages,
  "welcome" | "consent" | "loginGate" | "renewal" | "unsubscribe" | "errors" | "notFound" | "offline" | "visual" | "legalFooter"
> = {
  welcome: {
    title: "Prieš pradedant",
    body: "FlagBid padeda žmonėms, kurie profesionaliai perka ir parduoda automobilius. Patvirtinkite du dalykus, kad galėtumėte tęsti.",
    age: "Man yra 18 metų arba daugiau.",
    terms: "Perskaičiau ir sutinku su {terms} bei {privacy}.",
    ageNote: "FlagBid nėra skirtas jaunesniems nei 18 metų asmenims ir mes sąmoningai nerenkame vaikų duomenų.",
    continue: "Tęsti",
    saving: "Saugoma…",
    failed: "Nepavyko išsaugoti. Bandykite dar kartą.",
    signedInAs: "Prisijungta kaip {email}",
    notYou: "Ne jūs? Atsijungti",
  },
  consent: {
    dialogLabel: "Slapukų nuostatos",
    title: "Slapukai ir privatumas",
    body: "Naudojame būtinuosius slapukus, kad liktumėte prisijungę ir būtų įsimenama kalba bei tema. Jūsų leidimu taip pat anonimiškai matuojame, kurie puslapiai naudojami ir kaip greitai kraunasi. Jokių reklamų, sekimo kitose svetainėse ar sesijų įrašymo.",
    accept: "Leisti analitiką",
    decline: "Tik būtinieji",
    policy: "Privatumo politika",
    manage: "Slapukų nustatymai",
  },
  loginGate: {
    confirm: "Man yra 18 metų arba daugiau ir sutinku su {terms} bei {privacy}.",
    required: "Pažymėkite langelį, kad tęstumėte.",
  },
  renewal: {
    monthly:
      "Atnaujinama automatiškai kas mėnesį už {price}, kol atsisakysite. Atsisakyti galite bet kada: Atsiskaitymas → Tvarkyti prenumeratą; planas galioja iki apmokėto laikotarpio pabaigos. Dalinių mėnesių pinigai negrąžinami. Gali būti taikomi mokesčiai.",
    pack: "Vienkartinis {price} mokėjimas. Jokios prenumeratos ar atnaujinimo. Kreditai nesibaigia. Nepanaudotus kreditus galima grąžinti per 14 dienų nuo pirkimo.",
    trial: "Gali būti taikomi mokesčiai. Kainos nurodytos eurais.",
  },
  unsubscribe: {
    title: "Atsisakyti el. laiškų",
    body: "Nebesiųsti priminimų ir produkto naujienų šiuo adresu? Paskyros ir atsiskaitymo laiškus (kvitus, mokėjimo problemas) vis tiek gausite.",
    confirm: "Atsisakyti",
    working: "Atsisakoma…",
    done: "Atsisakėte. Nebesiųsime priminimų ir produkto naujienų.",
    invalid: "Ši atsisakymo nuoroda negalioja. Prisijunkite ir išjunkite el. laiškus nustatymuose arba susisiekite su palaikymu.",
    failed: "Kažkas nepavyko. Bandykite dar kartą.",
    home: "Atgal į pradžią",
  },
  errors: {
    title: "Kažkas nepavyko",
    body: "Įvyko netikėta klaida. Apie ją pranešta ir ją ištirsime. Jūsų duomenys saugūs.",
    retry: "Bandyti dar kartą",
    home: "Atgal į pradžią",
    ref: "Nuoroda: {digest}",
    appTitle: "Šio puslapio nepavyko įkelti",
    appBody: "Kraunant puslapį įvyko klaida. Galite bandyti dar kartą arba grįžti į skydelį.",
    dashboard: "Eiti į skydelį",
  },
  notFound: {
    title: "Puslapis nerastas",
    body: "Ieškomo puslapio nėra arba jis perkeltas.",
    home: "Eiti į pradžią",
    app: "Eiti į skydelį",
    code: "404",
  },
  offline: {
    banner: "Esate neprisijungę. Pakeitimų išsaugoti negalėsime, kol vėl prisijungsite.",
    requestFailed: "Nepavyko susisiekti su serveriu. Patikrinkite ryšį ir bandykite dar kartą.",
    timeout: "Tai užtruko per ilgai. Patikrinkite ryšį ir bandykite dar kartą.",
  },
  visual: {
    noPreview: "Peržiūra nepasiekiama",
    lobbyLabel: "Automobiliai, laukiantys nuskaitymo",
    lobbyPause: "Sustabdyti automobilių kaitą",
    lobbyPlay: "Paleisti automobilių kaitą",
    lobbyShow: "Rodyti automobilį {n} iš {total}",
  },
  legalFooter: {
    dmca: "Autorių teisės (DMCA)",
    operator: "Veiklą vykdo {entity}, {address}",
  },
};
