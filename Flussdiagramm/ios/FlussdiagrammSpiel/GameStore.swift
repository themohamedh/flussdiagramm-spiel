import SwiftUI
import Observation

@Observable
final class GameStore {
    var mode: GameMode = .learn
    var selectedCard: GameCard?
    var placements: [Int: GameCard] = [:]
    var feedback = "Wähle eine Wortkarte und danach die passende Station."
    var feedbackIsCorrect: Bool?
    var attempts = 0
    var wrongAttempts = 0
    var mistakeSteps: Set<Int> = []
    var startedAt: Date?
    var showResult = false
    var showInfo = false
    var solutionWasShown = false

    private(set) var deck = GameData.cards.shuffled()

    var correctCount: Int {
        GameData.steps.filter { placements[$0.id] == $0.answer }.count
    }

    var currentStep: Int {
        GameData.steps.first(where: { placements[$0.id] != $0.answer })?.id ?? GameData.steps.count
    }

    var unusedCards: [GameCard] {
        deck.filter { card in !placements.values.contains(card) }
    }

    var accuracy: Int {
        Int((Double(correctCount) / Double(max(attempts, correctCount, 1)) * 100).rounded())
    }

    var shouldShowAnswerState: Bool {
        mode == .learn || showResult || solutionWasShown
    }

    func select(_ card: GameCard) {
        beginIfNeeded()
        selectedCard = card
        feedbackIsCorrect = nil
        feedback = "Ausgewählt: „\(card.title)“. Tippe jetzt auf eine Station."
    }

    func placeSelected(at step: FlowStep) {
        guard let card = selectedCard else {
            if placements[step.id] != nil {
                placements[step.id] = nil
                feedback = "Karte entfernt. Du kannst sie neu einsetzen."
                feedbackIsCorrect = nil
                showResult = false
            }
            return
        }

        beginIfNeeded()
        if let oldStep = placements.first(where: { $0.value == card })?.key {
            placements[oldStep] = nil
        }
        placements[step.id] = card
        attempts += 1

        let isCorrect = card == step.answer
        solutionWasShown = false
        showResult = false

        if mode == .learn {
            feedbackIsCorrect = isCorrect
            if isCorrect {
                feedback = "Richtig: \(step.rightHint)"
            } else {
                wrongAttempts += 1
                mistakeSteps.insert(step.id)
                feedback = "Noch nicht korrekt: \(step.wrongHint)"
            }
        } else {
            feedbackIsCorrect = nil
            feedback = "Zuordnung gespeichert."
        }
        selectedCard = nil

        if mode == .learn && correctCount == GameData.steps.count {
            showResult = true
        } else if mode == .exam && placements.count == GameData.steps.count {
            evaluateExamAttempt()
        }
    }

    func revealSolution() {
        placements = Dictionary(uniqueKeysWithValues: GameData.steps.map { ($0.id, $0.answer) })
        selectedCard = nil
        feedbackIsCorrect = true
        feedback = "Die vollständige Lösung wird angezeigt."
        solutionWasShown = true
        showResult = false
    }

    func reset() {
        placements = [:]
        selectedCard = nil
        attempts = 0
        wrongAttempts = 0
        mistakeSteps = []
        startedAt = nil
        showResult = false
        solutionWasShown = false
        feedbackIsCorrect = nil
        feedback = "Wähle eine Wortkarte und danach die passende Station."
        deck.shuffle()
    }

    private func evaluateExamAttempt() {
        let wrongSteps = GameData.steps.filter { placements[$0.id] != $0.answer }.map(\.id)
        wrongAttempts = wrongSteps.count
        mistakeSteps = Set(wrongSteps)
        feedbackIsCorrect = wrongSteps.isEmpty
        feedback = wrongSteps.isEmpty
            ? "Prüfung ausgewertet: Alle Zuordnungen sind richtig."
            : "Prüfung ausgewertet: \(correctCount) von \(GameData.steps.count) Zuordnungen sind richtig."
        showResult = true
    }

    private func beginIfNeeded() {
        if startedAt == nil { startedAt = Date() }
    }
}
