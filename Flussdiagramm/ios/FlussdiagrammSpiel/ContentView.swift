import SwiftUI

struct ContentView: View {
    @State private var game = GameStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 18) {
                    HeroView(game: game)
                    ProgressView(value: Double(progressValue), total: Double(GameData.steps.count))
                        .tint(.blue)

                    FeedbackView(game: game)

                    ForEach(GameData.steps) { step in
                        FlowStepView(step: step, game: game)
                    }

                    CardDeckView(game: game)
                    actionButtons
                }
                .padding()
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Tarifrunde")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Info", systemImage: "info.circle") { game.showInfo = true }
                }
            }
            .sheet(isPresented: $game.showInfo) {
                InfoView()
            }
            .sheet(isPresented: $game.showResult) {
                ResultView(game: game)
            }
        }
    }

    private var progressValue: Int {
        game.shouldShowAnswerState ? game.correctCount : game.placements.count
    }

    private var actionButtons: some View {
        VStack(spacing: 10) {
            Button("Lösung anzeigen", systemImage: "lightbulb.fill") {
                game.revealSolution()
            }
            .buttonStyle(.borderedProminent)
            .disabled(game.placements.count < GameData.steps.count)

            Button("Neu starten", systemImage: "arrow.counterclockwise", role: .destructive) {
                game.reset()
            }
            .buttonStyle(.bordered)
        }
        .padding(.vertical)
    }
}

private struct HeroView: View {
    @Bindable var game: GameStore

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Flussdiagramm-Spiel", systemImage: "point.topleft.down.to.point.bottomright.curvepath")
                .font(.title2.bold())
            Text("Setze die Wortkarten in der richtigen Reihenfolge in den Ablauf von Tarifrunde und Streik.")
                .foregroundStyle(.secondary)
            Picker("Spielmodus", selection: $game.mode) {
                ForEach(GameMode.allCases) { mode in Text(mode.rawValue).tag(mode) }
            }
            .pickerStyle(.segmented)
            HStack {
                Label(progressText, systemImage: progressIcon)
                Spacer()
                Text("Schritt \(game.currentStep)")
            }
            .font(.subheadline.weight(.semibold))
        }
        .padding()
        .background(.blue.gradient, in: RoundedRectangle(cornerRadius: 22))
        .foregroundStyle(.white)
    }

    private var progressText: String {
        if game.shouldShowAnswerState {
            return "\(game.correctCount) / \(GameData.steps.count) richtig"
        }
        return "\(game.placements.count) / \(GameData.steps.count) gesetzt"
    }

    private var progressIcon: String {
        game.shouldShowAnswerState ? "checkmark.circle.fill" : "tray.full.fill"
    }
}

private struct FeedbackView: View {
    let game: GameStore

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
            Text(game.feedback)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .font(.subheadline)
        .padding()
        .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
        .foregroundStyle(color)
        .animation(.snappy, value: game.feedback)
    }

    private var color: Color {
        game.feedbackIsCorrect.map { $0 ? .green : .red } ?? .blue
    }

    private var icon: String {
        game.feedbackIsCorrect.map { $0 ? "checkmark.circle.fill" : "xmark.circle.fill" } ?? "hand.tap.fill"
    }
}

private struct FlowStepView: View {
    let step: FlowStep
    let game: GameStore

    var body: some View {
        VStack(spacing: 0) {
            Button {
                game.placeSelected(at: step)
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: step.kind.symbol)
                        .font(.title3)
                        .frame(width: 34, height: 34)
                        .background(kindColor.opacity(0.15), in: Circle())
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Schritt \(step.id) · \(step.kind.rawValue)")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(game.placements[step.id]?.title ?? "Karte hier einsetzen")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(game.placements[step.id] == nil ? .secondary : .primary)
                    }
                    Spacer()
                    Image(systemName: statusIcon)
                        .foregroundStyle(statusColor)
                }
                .padding()
                .background(background, in: RoundedRectangle(cornerRadius: 18))
                .overlay {
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(game.selectedCard == nil ? .clear : .blue, lineWidth: 2)
                }
            }
            .buttonStyle(.plain)

            if step.id < GameData.steps.count {
                Image(systemName: "arrow.down")
                    .foregroundStyle(game.shouldShowAnswerState && game.placements[step.id] == step.answer ? .green : .secondary)
                    .padding(.vertical, 5)
            }
        }
    }

    private var kindColor: Color {
        switch step.kind {
        case .start: .purple
        case .action: .orange
        case .process: .blue
        case .decision: .pink
        case .outcome: .green
        }
    }

    private var statusIcon: String {
        guard let card = game.placements[step.id] else { return "plus.circle" }
        guard game.shouldShowAnswerState else { return "circle.fill" }
        return card == step.answer ? "checkmark.circle.fill" : "xmark.circle.fill"
    }

    private var statusColor: Color {
        guard let card = game.placements[step.id] else { return .blue }
        guard game.shouldShowAnswerState else { return .blue }
        return card == step.answer ? .green : .red
    }

    private var background: Color {
        Color(uiColor: .secondarySystemGroupedBackground)
    }
}

private struct CardDeckView: View {
    let game: GameStore
    private let columns = [GridItem(.adaptive(minimum: 140), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Wortkarten")
                .font(.title3.bold())
            Text("Wähle eine Karte und tippe danach auf eine Station.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(game.unusedCards) { card in
                    Button(card.title) { game.select(card) }
                        .buttonStyle(CardButtonStyle(selected: game.selectedCard == card))
                }
            }
        }
        .padding(.top, 8)
    }
}

private struct CardButtonStyle: ButtonStyle {
    let selected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 54)
            .padding(8)
            .background(selected ? Color.blue : Color(uiColor: .secondarySystemGroupedBackground))
            .foregroundStyle(selected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private struct InfoView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("Spielziel") {
                    Text("Ordne alle 15 Stationen dem Ablauf einer Tarifrunde zu.")
                    Text("Im Lernmodus erhältst du sofort Hinweise. Im Prüfungsmodus siehst du erst am Ende deine Auswertung.")
                }
                Section("Warum ist das wichtig?") {
                    Text("Tarifverhandlungen ermöglichen bessere Löhne und Arbeitsbedingungen. Ein Streik ist das letzte legitime Mittel, um bei festgefahrenen Verhandlungen Druck aufzubauen.")
                }
            }
            .navigationTitle("Über das Spiel")
            .toolbar {
                Button("Fertig") { dismiss() }
            }
        }
    }
}

private struct ResultView: View {
    @Environment(\.dismiss) private var dismiss
    let game: GameStore

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.yellow)
                Text("Spiel abgeschlossen")
                    .font(.largeTitle.bold())
                Text("\(game.accuracy)% Trefferquote")
                    .font(.title2.weight(.semibold))
                HStack(spacing: 12) {
                    stat("\(game.correctCount)", "Richtig")
                    stat("\(game.wrongAttempts)", "Fehlversuche")
                    stat("\(game.attempts)", "Versuche")
                }
                if !game.mistakeSteps.isEmpty {
                    Text("Übe besonders die Schritte: \(game.mistakeSteps.sorted().map(String.init).joined(separator: ", ")).")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                Button("Noch einmal spielen") {
                    game.reset()
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .toolbar {
                Button("Schließen") { dismiss() }
            }
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack {
            Text(value).font(.title.bold())
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    ContentView()
}
