(function () {
  "use strict";

window.TARIFF_FLOW_LEARNING = {
    s1: {
      title: "Kündigung TV",
      why: "Die rechtzeitige Kündigung eines Tarifvertrags schafft die Möglichkeit, über neue Arbeitsbedingungen zu verhandeln.",
      example: "Der Entgelttarifvertrag einer Metallbranche läuft Ende September aus. Die Gewerkschaft kündigt ihn fristgerecht und fordert für den nächsten Tarifvertrag höhere Ausbildungsvergütungen und Löhne.",
      question: "Warum verhandeln die Tarifparteien häufig schon vor dem Ende des bisherigen Tarifvertrags?",
      caveat: "Die Kündigung beendet den Tarifvertrag und die Friedenspflicht nicht immer sofort. Entscheidend sind Laufzeit und Kündigungsfrist. Nach dem Ende können tarifliche Regeln außerdem weitergelten, bis sie durch eine andere Abmachung ersetzt werden."
    },
    s2: {
      title: "Warnstreiks",
      why: "Kurze und zeitlich begrenzte Warnstreiks zeigen, dass Beschäftigte die Forderungen ihrer Gewerkschaft unterstützen, und erhöhen den Verhandlungsdruck.",
      example: "Nach Ablauf der Friedenspflicht legen Beschäftigte eines Verkehrsbetriebs für zwei Stunden die Arbeit nieder. Danach nehmen sie ihre Arbeit wieder auf.",
      question: "Worin unterscheidet sich ein kurzer Warnstreik von einem länger dauernden Streik?",
      caveat: "Warnstreiks sind erst nach Ende der Friedenspflicht zulässig. In echten Tarifrunden finden sie meist während oder zwischen Verhandlungsrunden statt; die Reihenfolge kann daher vom vereinfachten Diagramm abweichen."
    },
    s3: {
      title: "1. Verhandlungsrunde",
      why: "In der ersten Runde stellen Gewerkschaft und Arbeitgeberseite ihre Forderungen, Interessen und wirtschaftlichen Einschätzungen gegenüber.",
      example: "Die Gewerkschaft fordert sieben Prozent mehr Entgelt und einen zusätzlichen freien Tag. Der Arbeitgeberverband erklärt, welche Kosten er für tragbar hält, und legt ein erstes Angebot vor.",
      question: "Welche Informationen brauchen beide Seiten, um die Forderungen der anderen Seite beurteilen zu können?",
      caveat: "Die erste Verhandlungsrunde ist nicht immer der erste Kontakt zwischen den Tarifparteien. Häufig werden Forderungen, Termine und Rahmenbedingungen schon vorher vorbereitet oder öffentlich angekündigt."
    },
    s4: {
      title: "keine Einigung / Ende der Friedenspflicht / Urabstimmung über Streik",
      why: "Bleibt eine Einigung aus und gilt keine Friedenspflicht mehr, kann die Gewerkschaft entscheiden, ob sie einen länger dauernden Streik vorbereitet.",
      example: "Mehrere Gespräche bringen keinen Kompromiss. Nach dem Ende des alten Tarifvertrags lässt die Gewerkschaft ihre betroffenen Mitglieder darüber abstimmen, ob sie zu einem Streik bereit sind.",
      question: "Warum sollte eine Gewerkschaft ihre Mitglieder vor einem länger dauernden Streik befragen?",
      caveat: "Eine gescheiterte Verhandlungsrunde beendet die Friedenspflicht nicht automatisch; maßgeblich ist insbesondere das Ende des Tarifvertrags oder eine besondere Vereinbarung. Eine Urabstimmung ist keine allgemeine gesetzliche Voraussetzung für einen Streik, sondern richtet sich vor allem nach den Regeln der jeweiligen Gewerkschaft."
    },
    s5: {
      title: "Einigung (1)",
      why: "Eine frühe Einigung verhindert einen längeren Arbeitskampf und schafft schnell Klarheit über die neuen Bedingungen.",
      example: "Schon nach der ersten Konfliktphase einigen sich beide Seiten auf eine Entgelterhöhung in zwei Stufen und eine einmalige Zahlung.",
      question: "Welche Zugeständnisse könnten beide Seiten machen, damit eine frühe Einigung möglich wird?",
      caveat: "Eine Tarifeinigung ist zunächst ein ausgehandelter Kompromiss. Je nach Verfahren müssen zuständige Gremien oder Mitglieder noch zustimmen, bevor der neue Tarifvertrag abgeschlossen wird."
    },
    s6: {
      title: "Streik",
      why: "Ein von einer Gewerkschaft getragener Streik kann Druck auf die Arbeitgeberseite ausüben, wenn Verhandlungen festgefahren sind.",
      example: "Die Gewerkschaft ruft die Beschäftigten mehrerer Betriebe zu einem unbefristeten Streik für einen neuen Entgelttarifvertrag auf. Während der Streikteilnahme wird grundsätzlich kein Arbeitsentgelt gezahlt.",
      question: "Welche Folgen hat ein längerer Streik für Beschäftigte, Arbeitgeber und unbeteiligte Dritte?",
      caveat: "Ein rechtmäßiger Streik muss ein tariflich regelbares Ziel verfolgen, von einer Gewerkschaft getragen sein, die Friedenspflicht beachten und verhältnismäßig sein."
    },
    s7: {
      title: "evtl. Aussperrung",
      why: "Die Aussperrung ist ein mögliches Arbeitskampfmittel der Arbeitgeberseite und zeigt, dass auch Arbeitgeber auf einen Streik mit Druck reagieren können.",
      example: "Als Reaktion auf einen Streik lässt ein Arbeitgeber einen Teil der Beschäftigten vorübergehend nicht arbeiten und zahlt für diese Zeit kein Entgelt.",
      question: "Warum kann eine Aussperrung den Druck auf die Beschäftigten und ihre Gewerkschaft erhöhen?",
      caveat: "Aussperrungen sind in Deutschland selten und nicht beliebig zulässig. Sie müssen insbesondere verhältnismäßig sein."
    },
    s8: {
      title: "2. Verhandlungsrunde",
      why: "Auch während eines Arbeitskampfs bleiben Verhandlungen wichtig, weil nur ein ausgehandelter Kompromiss den Tarifkonflikt dauerhaft lösen kann.",
      example: "Nach mehreren Streiktagen kehren beide Seiten an den Verhandlungstisch zurück. Die Arbeitgeberseite verbessert ihr Angebot, während die Gewerkschaft ihre Forderung anpasst.",
      question: "Wie können Arbeitskampfmaßnahmen die Bereitschaft zu einem neuen Kompromiss verändern?",
      caveat: "Weitere Verhandlungsrunden können auch ohne Streik stattfinden. Die Nummerierung im Spiel vereinfacht den Ablauf, damit die wichtigsten Entscheidungspunkte sichtbar bleiben."
    },
    s9: {
      title: "Ergebnis",
      why: "Ein Verhandlungsergebnis hält den gefundenen Kompromiss fest und gibt den Beteiligten eine konkrete Grundlage für ihre Entscheidung.",
      example: "Die Verhandlungskommissionen vereinbaren eine Lohnerhöhung, eine längere Laufzeit und Verbesserungen für Auszubildende.",
      question: "Nach welchen Kriterien sollten Gewerkschaftsmitglieder ein Verhandlungsergebnis bewerten?",
      caveat: "Ein Verhandlungsergebnis ist nicht immer schon der fertige Tarifvertrag. Häufig folgen noch eine Abstimmung, die Zustimmung von Gremien und die schriftliche Ausarbeitung."
    },
    s10: {
      title: "Urabstimmung",
      why: "Mit einer Urabstimmung können die betroffenen Gewerkschaftsmitglieder über die Annahme eines Ergebnisses oder die Fortsetzung eines Streiks entscheiden.",
      example: "Nach einem Streik stimmen die Mitglieder darüber ab, ob sie den ausgehandelten Kompromiss annehmen und den Arbeitskampf beenden wollen.",
      question: "Welche Vorteile hat eine geheime Abstimmung aller betroffenen Gewerkschaftsmitglieder?",
      caveat: "Anlass, Verfahren und nötige Mehrheiten einer Urabstimmung richten sich nach der Satzung oder den Arbeitskampfrichtlinien der jeweiligen Gewerkschaft; sie sind nicht allgemein gesetzlich festgelegt."
    },
    s11: {
      title: "Schlichtung",
      why: "Eine Schlichtung kann festgefahrene Verhandlungen mit Hilfe neutraler Vermittlung wieder in Bewegung bringen und einen Arbeitskampf vermeiden oder beenden.",
      example: "Gewerkschaft und Arbeitgeberverband rufen gemeinsam eine neutrale Schlichterin an. Sie hört beide Seiten an und schlägt einen Kompromiss vor.",
      question: "Was kann eine neutrale Person beitragen, das den Tarifparteien allein bisher nicht gelungen ist?",
      caveat: "Eine Schlichtung findet nicht automatisch statt. Grundlage ist eine Vereinbarung der Tarifparteien. Ob und wie lange währenddessen Friedenspflicht gilt und wie mit dem Schlichtungsvorschlag umzugehen ist, hängt von dieser Vereinbarung ab."
    },
    s12: {
      title: "3. Verhandlungsrunde",
      why: "Eine weitere Verhandlungsrunde gibt beiden Seiten die Chance, neue Vorschläge oder einen Schlichtungsvorschlag zu prüfen und zu einem tragfähigen Abschluss zu kommen.",
      example: "Nach der Schlichtung beraten beide Seiten erneut. Sie übernehmen Teile des Vorschlags und handeln bei Arbeitszeit und Laufzeit noch Änderungen aus.",
      question: "Warum kann ein neuer Vorschlag helfen, obwohl frühere Verhandlungsrunden gescheitert sind?",
      caveat: "Nicht jede Tarifrunde hat genau drei Verhandlungsrunden. Manche Konflikte enden früher, andere brauchen deutlich mehr Gespräche oder besondere Vermittlungsverfahren."
    },
    s13: {
      title: "Einigung (2)",
      why: "Eine spätere Einigung zeigt, dass auch nach einem langen Konflikt ein gemeinsam getragener Kompromiss möglich ist.",
      example: "Nach Schlichtung und weiterer Verhandlung einigen sich die Tarifparteien auf höhere Entgelte, zusätzliche freie Tage und eine Laufzeit von 24 Monaten.",
      question: "Woran lässt sich erkennen, ob ein später Kompromiss für beide Seiten tragfähig ist?",
      caveat: "Auch diese Einigung kann noch unter dem Vorbehalt der Zustimmung zuständiger Gremien oder einer Mitgliederabstimmung stehen."
    },
    s14: {
      title: "Urabstimmung Ergebnis",
      why: "Das Ergebnis der Urabstimmung zeigt, ob die abstimmenden Gewerkschaftsmitglieder den ausgehandelten Weg mittragen.",
      example: "Eine deutliche Mehrheit stimmt für die Annahme des Kompromisses. Die Gewerkschaft beendet daraufhin den Arbeitskampf und bereitet den Tarifabschluss vor.",
      question: "Was könnte geschehen, wenn die Mitglieder das Verhandlungsergebnis ablehnen?",
      caveat: "Die Folgen und erforderlichen Mehrheiten richten sich nach den Regeln der jeweiligen Gewerkschaft. Eine Ablehnung führt nicht automatisch zu einem bestimmten nächsten Schritt."
    },
    s15: {
      title: "neuer TV",
      why: "Der neue Tarifvertrag hält den Kompromiss schriftlich fest und schafft verlässliche Regeln für Lohn, Arbeitszeit oder andere Arbeitsbedingungen.",
      example: "Gewerkschaft und Arbeitgeberverband unterschreiben einen neuen Entgelttarifvertrag. Er regelt für 24 Monate die Tabellenentgelte und Ausbildungsvergütungen.",
      question: "Warum ist es wichtig, den Verhandlungskompromiss genau und schriftlich festzuhalten?",
      caveat: "Unmittelbar und zwingend gilt ein Tarifvertrag grundsätzlich für beiderseits Tarifgebundene in seinem Geltungsbereich. Arbeitgeber wenden seine Bedingungen in der Praxis jedoch oft auch auf weitere Beschäftigte an; außerdem kann ein Tarifvertrag für allgemeinverbindlich erklärt werden."
    }
};

window.TARIFF_TONI_KNOWLEDGE = [
  {
    id: "tarifverhandlungen",
    label: "bpb: Tarifverhandlungen und Arbeitskampf",
    url: "https://www.bpb.de/themen/arbeit/arbeitsmarktpolitik/316978/grundlagen-der-lohnpolitik/",
    keywords: ["tarif", "verhandlung", "lohn", "gehalt", "arbeitgeber", "gewerkschaft", "tarifautonomie", "tarifvertrag"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Achte darauf, dass hier Gewerkschaften und Arbeitgeber die Arbeits- und Einkommensbedingungen aushandeln. Der Staat soll diese Verhandlungen normalerweise nicht direkt steuern."
  },
  {
    id: "friedenspflicht",
    label: "bpb: Tarifverhandlungen und Arbeitskampf",
    url: "https://www.bpb.de/themen/arbeit/arbeitsmarktpolitik/316978/grundlagen-der-lohnpolitik/",
    keywords: ["friedenspflicht", "ablauf", "ende", "kündigung", "kuendigung"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Überlege, wann die Friedenspflicht endet. Erst danach kommen Arbeitskampfmaßnahmen als Druckmittel wirklich in Betracht."
  },
  {
    id: "warnstreik",
    label: "bpb: Was ist ein Streik?",
    url: "https://www.bpb.de/kurz-knapp/hintergrund-aktuell/547428/faq-was-ist-ein-streik/",
    keywords: ["warnstreik", "warnstreiks", "kurzstreik", "druck", "angebot"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Warnstreiks sind eher kurze Signale während oder zwischen Verhandlungen. Sie zeigen Entschlossenheit, ohne schon der große dauerhafte Streik zu sein."
  },
  {
    id: "streik",
    label: "bpb: Was ist ein Streik?",
    url: "https://www.bpb.de/kurz-knapp/hintergrund-aktuell/547428/faq-was-ist-ein-streik/",
    keywords: ["streik", "arbeitskampf", "arbeit niederlegen", "niederlegung", "streiken"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Ein Streik ist ein gewerkschaftlich organisierter Arbeitskampf. Frage dich also: Sind die Verhandlungen schon so festgefahren, dass dieses Druckmittel logisch wird?"
  },
  {
    id: "aussperrung",
    label: "bpb: Tarifverhandlungen und Arbeitskampf",
    url: "https://www.bpb.de/themen/arbeit/arbeitsmarktpolitik/316978/grundlagen-der-lohnpolitik/",
    keywords: ["aussperrung", "aussperren", "arbeitgeberseite"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Die Aussperrung ist die mögliche Reaktion der Arbeitgeberseite auf einen gewerkschaftlichen Streik. Sie gehört also nicht an den Anfang der Tarifrunde."
  },
  {
    id: "schlichtung",
    label: "bpb: Tarifverhandlungen und Arbeitskampf",
    url: "https://www.bpb.de/themen/arbeit/arbeitsmarktpolitik/316978/grundlagen-der-lohnpolitik/",
    keywords: ["schlichtung", "schlichter", "vermittlung", "kompromiss"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Eine Schlichtung passt besonders dann, wenn die Fronten verhärtet sind. Denke an eine neutrale Vermittlung, nicht an den ersten normalen Verhandlungsschritt."
  },
  {
    id: "urabstimmung",
    label: "bpb: Urabstimmung",
    url: "https://www.bpb.de/kurz-knapp/lexika/politiklexikon/296518/urabstimmung/",
    keywords: ["urabstimmung", "abstimmung", "mitglieder", "75", "mehrheit"],
    tip: "Kleiner Tipp aus der bpb-Quelle: Bei einer Urabstimmung entscheiden die Mitglieder der Organisation. Im Tarifkonflikt geht es oft darum, ob ein Streik getragen oder ein Ergebnis angenommen wird."
  },
  {
    id: "pruefungsmodus",
    label: "bpb-Quellen im Spiel",
    url: "https://www.bpb.de/",
    keywords: ["lösung", "loesung", "antwort", "wohin", "welches feld", "reihenfolge"],
    tip: "Ich gebe dir keinen fertigen Platz im Diagramm. Denk lieber an die Logik: Erst werden Forderungen verhandelt, dann steigt bei keiner Einigung der Druck, und am Ende braucht es ein tragfähiges Ergebnis."
  }
];

(() => {
  const legacyToni = document.getElementById("tarifToni");

  if (legacyToni) {
    legacyToni.hidden = true;
    legacyToni.style.display = "none";
    legacyToni.classList.remove("tarif-toni");
    legacyToni.classList.add("legacy-tarif-toni");
    legacyToni.setAttribute("aria-hidden", "true");
  }

  if (!document.querySelector('link[href^="tarif-toni.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "tarif-toni.css";
    document.head.appendChild(stylesheet);
  }
})();

  window.TARIFF_FLOW_SOURCES = [
    {
      title: "Tarifvertragsgesetz (TVG)",
      url: "https://www.gesetze-im-internet.de/tvg/",
      note: "Gesetzliche Grundlagen zu Tarifvertragsparteien, Tarifbindung, Wirkung und Nachwirkung."
    },
    {
      title: "Bundesministerium für Arbeit und Soziales: Tarifregister",
      url: "https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Tarifvertraege/Tarifregister/tarifregister-art.html",
      note: "Überblick zu Tarifautonomie, Tarifparteien und tariflich geregelten Arbeitsbedingungen."
    },
    {
      title: "Bundeszentrale für politische Bildung: Tarifpolitik und Tarifautonomie",
      url: "https://www.bpb.de/kurz-knapp/lexika/handwoerterbuch-politisches-system/202193/tarifpolitik-tarifautonomie/",
      note: "Einordnung von Verhandlungen, Warnstreiks, Arbeitskampf und Schlichtung."
    },
    {
      title: "Bundeszentrale für politische Bildung: Arbeitskampf",
      url: "https://www.bpb.de/kurz-knapp/lexika/recht-a-z/323045/arbeitskampf/",
      note: "Grundlagen und Grenzen von Streik, Friedenspflicht und Aussperrung."
    }
  ];
}());
