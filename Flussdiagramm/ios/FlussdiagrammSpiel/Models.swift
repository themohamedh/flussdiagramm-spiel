import Foundation

enum GameMode: String, CaseIterable, Identifiable {
    case learn = "Lernen"
    case exam = "Prüfung"

    var id: Self { self }
}

enum StepKind: String {
    case start = "Start"
    case action = "Aktion"
    case process = "Verhandlung"
    case decision = "Entscheidung"
    case outcome = "Ergebnis"

    var symbol: String {
        switch self {
        case .start: "flag.fill"
        case .action: "bolt.fill"
        case .process: "bubble.left.and.bubble.right.fill"
        case .decision: "arrow.triangle.branch"
        case .outcome: "checkmark.seal.fill"
        }
    }
}

struct GameCard: Identifiable, Hashable {
    let id: Int
    let title: String
}

struct FlowStep: Identifiable, Hashable {
    let id: Int
    let kind: StepKind
    let answer: GameCard
    let rightHint: String
    let wrongHint: String
}

enum GameData {
    static let cards = [
        GameCard(id: 1, title: "Kündigung TV"),
        GameCard(id: 2, title: "Warnstreiks"),
        GameCard(id: 3, title: "1. Verhandlungsrunde"),
        GameCard(id: 4, title: "keine Einigung / Ende der Friedenspflicht / Urabstimmung über Streik"),
        GameCard(id: 5, title: "Einigung (1)"),
        GameCard(id: 6, title: "Streik"),
        GameCard(id: 7, title: "evtl. Aussperrung"),
        GameCard(id: 8, title: "2. Verhandlungsrunde"),
        GameCard(id: 9, title: "Ergebnis"),
        GameCard(id: 10, title: "Urabstimmung"),
        GameCard(id: 11, title: "Schlichtung"),
        GameCard(id: 12, title: "3. Verhandlungsrunde"),
        GameCard(id: 13, title: "Einigung (2)"),
        GameCard(id: 14, title: "Urabstimmung Ergebnis"),
        GameCard(id: 15, title: "neuer TV")
    ]

    static let steps: [FlowStep] = [
        step(1, .start, "Die Tarifrunde beginnt mit der Kündigung des bisherigen Tarifvertrags.", "Hier gehört der Startpunkt „Kündigung TV“ hin."),
        step(2, .action, "Warnstreiks bauen nach dem Auftakt zusätzlichen Druck auf.", "An dieser Position werden „Warnstreiks“ erwartet."),
        step(3, .process, "Danach folgt die erste Verhandlungsrunde.", "Hier passt die „1. Verhandlungsrunde“ in den Ablauf."),
        step(4, .decision, "Ohne Einigung endet die Friedenspflicht; eine Urabstimmung über Streik wird vorbereitet.", "Hier wird die Entscheidung nach einer gescheiterten Verhandlung erwartet."),
        step(5, .outcome, "„Einigung (1)“ ist der direkte positive Ausgang nach der ersten Konfliktphase.", "Auf dieses Ergebnisfeld gehört „Einigung (1)“."),
        step(6, .action, "Auf dem Eskalationspfad folgt der Streik.", "Hier wird „Streik“ erwartet."),
        step(7, .action, "Parallel kann es zur Aussperrung kommen.", "Dieses Feld ist für „evtl. Aussperrung“ vorgesehen."),
        step(8, .process, "Im weiteren Verlauf kommt die zweite Verhandlungsrunde.", "An diese Stelle gehört die „2. Verhandlungsrunde“."),
        step(9, .outcome, "„Ergebnis“ markiert einen erfolgreichen Ausgang.", "Hier wird die Karte „Ergebnis“ benötigt."),
        step(10, .outcome, "Die Urabstimmung ist ein eigener Schritt vor dem Abschluss.", "Dieses Feld erwartet „Urabstimmung“."),
        step(11, .action, "Schlichtung ist ein strukturierter Vermittlungsschritt.", "Hier gehört „Schlichtung“ hin."),
        step(12, .process, "Danach folgt die dritte Verhandlungsrunde.", "An dieser Position wird die „3. Verhandlungsrunde“ erwartet."),
        step(13, .outcome, "„Einigung (2)“ ist ein möglicher Abschluss nach der dritten Runde.", "Hier passt die Karte „Einigung (2)“."),
        step(14, .outcome, "Das Urabstimmungsergebnis führt in den finalen Abschlusszweig.", "Dieses Feld ist für „Urabstimmung Ergebnis“ reserviert."),
        step(15, .outcome, "Der neue Tarifvertrag ist das gemeinsame Ziel aller Pfade.", "Als Endfeld gehört hier „neuer TV“ hin.")
    ]

    private static func step(_ id: Int, _ kind: StepKind, _ right: String, _ wrong: String) -> FlowStep {
        FlowStep(id: id, kind: kind, answer: cards[id - 1], rightHint: right, wrongHint: wrong)
    }
}
