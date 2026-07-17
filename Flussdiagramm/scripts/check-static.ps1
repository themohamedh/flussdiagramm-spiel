$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Assert-Condition {
  param(
    [bool] $Condition,
    [string] $Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Read-Utf8 {
  param([string] $RelativePath)

  return [System.IO.File]::ReadAllText((Join-Path $root $RelativePath), [System.Text.Encoding]::UTF8)
}

function Get-BalancedExpression {
  param(
    [string] $Source,
    [string] $Marker,
    [char] $OpenChar,
    [char] $CloseChar
  )

  $markerIndex = $Source.IndexOf($Marker, [StringComparison]::Ordinal)
  Assert-Condition ($markerIndex -ge 0) "Missing marker: $Marker"

  $openIndex = $Source.IndexOf([string] $OpenChar, $markerIndex + $Marker.Length, [StringComparison]::Ordinal)
  Assert-Condition ($openIndex -ge 0) "Missing $OpenChar after marker: $Marker"

  $depth = 0
  $quote = [char] 0
  $escaped = $false
  $lineComment = $false
  $blockComment = $false

  for ($index = $openIndex; $index -lt $Source.Length; $index += 1) {
    $char = $Source[$index]
    $next = if ($index + 1 -lt $Source.Length) { $Source[$index + 1] } else { [char] 0 }

    if ($lineComment) {
      if ($char -eq "`n") { $lineComment = $false }
      continue
    }

    if ($blockComment) {
      if ($char -eq "*" -and $next -eq "/") {
        $blockComment = $false
        $index += 1
      }
      continue
    }

    if ($quote -ne [char] 0) {
      if ($escaped) {
        $escaped = $false
      } elseif ($char -eq "\") {
        $escaped = $true
      } elseif ($char -eq $quote) {
        $quote = [char] 0
      }
      continue
    }

    if ($char -eq "/" -and $next -eq "/") {
      $lineComment = $true
      $index += 1
      continue
    }

    if ($char -eq "/" -and $next -eq "*") {
      $blockComment = $true
      $index += 1
      continue
    }

    if ($char -eq "'" -or $char -eq '"' -or [int] $char -eq 96) {
      $quote = $char
      continue
    }

    if ($char -eq $OpenChar) { $depth += 1 }
    if ($char -eq $CloseChar) {
      $depth -= 1
      if ($depth -eq 0) {
        return $Source.Substring($openIndex, $index - $openIndex + 1)
      }
    }
  }

  throw "Unclosed expression after marker: $Marker"
}

function Assert-CodeDelimiters {
  param(
    [string] $Source,
    [string] $Label
  )

  $stack = New-Object 'System.Collections.Generic.Stack[string]'
  $quote = [char] 0
  $escaped = $false
  $lineComment = $false
  $blockComment = $false
  $pairs = @{
    ")" = "("
    "]" = "["
    "}" = "{"
  }

  for ($index = 0; $index -lt $Source.Length; $index += 1) {
    $char = $Source[$index]
    $next = if ($index + 1 -lt $Source.Length) { $Source[$index + 1] } else { [char] 0 }

    if ($lineComment) {
      if ($char -eq "`n") { $lineComment = $false }
      continue
    }

    if ($blockComment) {
      if ($char -eq "*" -and $next -eq "/") {
        $blockComment = $false
        $index += 1
      }
      continue
    }

    if ($quote -ne [char] 0) {
      if ($escaped) {
        $escaped = $false
      } elseif ($char -eq "\") {
        $escaped = $true
      } elseif ($char -eq $quote) {
        $quote = [char] 0
      }
      continue
    }

    if ($char -eq "/" -and $next -eq "/") {
      $lineComment = $true
      $index += 1
      continue
    }

    if ($char -eq "/" -and $next -eq "*") {
      $blockComment = $true
      $index += 1
      continue
    }

    if ($char -eq "'" -or $char -eq '"' -or [int] $char -eq 96) {
      $quote = $char
      continue
    }

    if ($char -eq "(" -or $char -eq "[" -or $char -eq "{") {
      $stack.Push([string] $char)
      continue
    }

    if ($char -eq ")" -or $char -eq "]" -or $char -eq "}") {
      Assert-Condition ($stack.Count -gt 0) "$Label has an unexpected closing delimiter: $char"
      $expected = $pairs[[string] $char]
      $actual = $stack.Pop()
      Assert-Condition ($actual -eq $expected) "$Label has mismatched delimiters near: $char"
    }
  }

  Assert-Condition (-not $lineComment) "$Label has an unterminated line comment"
  Assert-Condition (-not $blockComment) "$Label has an unterminated block comment"
  Assert-Condition ($quote -eq [char] 0) "$Label has an unterminated string or template"
  Assert-Condition ($stack.Count -eq 0) "$Label has unbalanced delimiters"
}

function Assert-SetEquals {
  param(
    [string[]] $Actual,
    [string[]] $Expected,
    [string] $Label
  )

  $actualSorted = @($Actual | Sort-Object)
  $expectedSorted = @($Expected | Sort-Object)
  Assert-Condition ($actualSorted.Count -eq $expectedSorted.Count) "$Label count mismatch"

  for ($index = 0; $index -lt $expectedSorted.Count; $index += 1) {
    Assert-Condition ($actualSorted[$index] -eq $expectedSorted[$index]) "$Label mismatch at index $index"
  }
}

function Get-UniqueCount {
  param([string[]] $Values)

  return @($Values | Sort-Object -Unique).Count
}

function Test-ExternalReference {
  param([string] $Value)

  return $Value -match '^(?:[a-z][a-z\d+.-]*:|//)'
}

function Normalize-LocalReference {
  param([string] $Value)

  if ($null -eq $Value) { return $null }

  $trimmed = $Value.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#") -or (Test-ExternalReference $trimmed)) {
    return $null
  }

  $withoutQuery = ($trimmed -split '[?#]', 2)[0]
  if (-not $withoutQuery -or $withoutQuery -eq "." -or $withoutQuery -eq "./") {
    return "index.html"
  }
  if ($withoutQuery.EndsWith("/")) {
    return ((Join-Path $withoutQuery "index.html") -replace "\\", "/")
  }

  return (($withoutQuery -replace '^[.][\\/]', '') -replace "\\", "/").TrimStart("/")
}

function New-Reference {
  param(
    [string] $Label,
    [string] $Path
  )

  return [pscustomobject] @{
    Label = $Label
    Path = $Path
  }
}

function Get-HtmlAttributeReferences {
  param([string] $Source)

  $references = @()
  $matches = [regex]::Matches($Source, '\b(?:href|src)\s*=\s*(["''])(?<value>.*?)\1', "IgnoreCase")
  foreach ($match in $matches) {
    $path = Normalize-LocalReference $match.Groups["value"].Value
    if ($path) { $references += New-Reference "index.html attribute" $path }
  }
  return $references
}

function Get-CssUrlReferences {
  param(
    [string] $Source,
    [string] $Label
  )

  $references = @()
  $matches = [regex]::Matches($Source, 'url\(\s*(?:"(?<double>[^"]*)"|''(?<single>[^'']*)''|(?<bare>[^)"'']+))\s*\)', "IgnoreCase")
  foreach ($match in $matches) {
    $rawValue = if ($match.Groups["double"].Success) {
      $match.Groups["double"].Value
    } elseif ($match.Groups["single"].Success) {
      $match.Groups["single"].Value
    } else {
      $match.Groups["bare"].Value
    }

    $path = Normalize-LocalReference $rawValue
    if ($path) { $references += New-Reference $Label $path }
  }
  return $references
}

function Get-ServiceWorkerAppShell {
  param([string] $Source)

  $constants = @{}
  [regex]::Matches($Source, 'const\s+(?<name>[A-Z_]+)\s*=\s*"(?<value>[^"]*)";') | ForEach-Object {
    $constants[$_.Groups["name"].Value] = $_.Groups["value"].Value
  }

  function Get-ArrayStringEntries {
    param([string] $Name)

    $marker = "const $Name ="
    if ($Source.IndexOf($marker, [StringComparison]::Ordinal) -lt 0) { return @() }

    $arrayExpression = Get-BalancedExpression $Source $marker "[" "]"
    return @(
      [regex]::Matches($arrayExpression, '(?:"(?<plain>[^"]+)"|`(?<template>[^`]+)`)') |
      ForEach-Object {
        $value = if ($_.Groups["plain"].Success) { $_.Groups["plain"].Value } else { $_.Groups["template"].Value }
        foreach ($key in $constants.Keys) {
          $value = $value.Replace('${' + $key + '}', $constants[$key])
        }
        $value
      }
    )
  }

  $entries = @()
  $entries += Get-ArrayStringEntries "APP_SHELL"
  if ($entries.Count -eq 0) {
    $entries += Get-ArrayStringEntries "REQUIRED_APP_SHELL"
    $entries += Get-ArrayStringEntries "OPTIONAL_APP_SHELL"
  }

  return @($entries | Where-Object { $_ } | Select-Object -Unique)
}

function Assert-ReferencesExist {
  param([object[]] $References)

  $missing = @()
  foreach ($reference in $References) {
    $key = "$($reference.Label) -> $($reference.Path)"
    $fullPath = Join-Path $root $reference.Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
      $missing += $key
    }
  }

  Assert-Condition ($missing.Count -eq 0) ("Local static references must point to existing files: " + ($missing -join ", "))
}

function Get-AssetVersion {
  param(
    [string] $Source,
    [string] $Filename
  )

  $pattern = [regex]::Escape($Filename) + '\?v=([^"''<>]+)'
  $match = [regex]::Match($Source, $pattern)
  Assert-Condition $match.Success "Missing versioned reference for $Filename"
  return $match.Groups[1].Value
}

function Get-ServiceWorkerStringConst {
  param(
    [string] $Source,
    [string] $Name
  )

  $pattern = 'const\s+' + [regex]::Escape($Name) + '\s+=\s+"([^"]+)";'
  $match = [regex]::Match($Source, $pattern)
  Assert-Condition $match.Success "Missing service worker constant $Name"
  return $match.Groups[1].Value
}

$html = Read-Utf8 "index.html"
$learningSource = Read-Utf8 "unterrichtsmaterial.js"
$toniSource = Read-Utf8 "tarif-toni.js"
$nodeTestSource = Read-Utf8 "tests/static-integrity.test.mjs"
$manifest = Read-Utf8 "manifest.webmanifest" | ConvertFrom-Json
$serviceWorkerSource = Read-Utf8 "service-worker.js"
$serveStaticSource = Read-Utf8 "scripts/serve-static.mjs"
$iosContentSource = Read-Utf8 "ios/FlussdiagrammSpiel/ContentView.swift"
$iosGameStoreSource = Read-Utf8 "ios/FlussdiagrammSpiel/GameStore.swift"
$packageJson = Read-Utf8 "package.json" | ConvertFrom-Json
Assert-Condition ($null -ne $packageJson.scripts.check) "package.json must expose a check script"
Assert-Condition ($null -ne $packageJson.scripts.test) "package.json must expose a test script"
Assert-Condition ($packageJson.scripts.check -eq "npm run test:static") "package.json check script should run static tests"
Assert-Condition ($packageJson.scripts.test -eq "npm run test:static") "package.json test script should run static tests"
Assert-Condition ($packageJson.scripts.'test:all' -eq "npm run test:static && npm run test:e2e") "package.json must expose test:all"
Assert-Condition ($packageJson.scripts.'test:static' -eq "node --test tests/static-integrity.test.mjs") "package.json must expose test:static"
Assert-Condition ($packageJson.scripts.'test:e2e' -eq "playwright test") "package.json must expose test:e2e"
Assert-Condition ($packageJson.devDependencies.'@playwright/test' -match '^\^1\.') "package.json must include @playwright/test dev dependency"
Assert-Condition ($nodeTestSource.Trim().Length -gt 0) "Node test file must be readable"
foreach ($file in @("playwright.config.mjs", "scripts/serve-static.mjs", "tests/e2e/flussdiagramm.spec.mjs")) {
  Assert-Condition (Test-Path -LiteralPath (Join-Path $root $file)) "$file must exist"
}
Assert-Condition ($serveStaticSource -match 'decodeURIComponent') "Static server should decode request paths before resolving"
Assert-Condition ($serveStaticSource -match 'path\.relative\(root,\s*target\)') "Static server should use separator-aware containment"
Assert-Condition ($serveStaticSource -match 'path\.isAbsolute\(relative\)') "Static server should reject absolute relative paths"
Assert-Condition ($serveStaticSource -notmatch 'target\.startsWith\(root\)') "Static server must not use prefix-only containment"
Assert-Condition ($iosGameStoreSource -match 'var solutionWasShown = false') "iOS store should track solution reveal separately"
Assert-Condition ($iosGameStoreSource -match 'var shouldShowAnswerState: Bool') "iOS store should expose answer-state visibility"
Assert-Condition ($iosGameStoreSource -match 'mode == \.exam && placements\.count == GameData\.steps\.count') "iOS exam mode should evaluate complete attempts"
Assert-Condition ($iosGameStoreSource -match 'private func evaluateExamAttempt\(\)') "iOS exam mode should evaluate final placement state"
Assert-Condition ($iosGameStoreSource -match 'wrongAttempts = wrongSteps\.count') "iOS exam wrong count should come from final wrong steps"
Assert-Condition ($iosContentSource -match 'game\.shouldShowAnswerState \? game\.correctCount : game\.placements\.count') "iOS exam progress should not reveal correctness before evaluation"
Assert-Condition ($iosContentSource -match 'if game\.shouldShowAnswerState \{[\s\S]*?\} else \{\s*Text\("[^\"]+"\)\s*\}') "iOS exam step label should not reveal the first incorrect placement before evaluation"
Assert-Condition ($iosContentSource -match 'guard game\.shouldShowAnswerState else \{ return "circle\.fill" \}') "iOS exam status icon should stay neutral before evaluation"
Assert-Condition ($iosContentSource -match 'guard game\.shouldShowAnswerState else \{ return \.blue \}') "iOS exam status color should stay neutral before evaluation"
Assert-Condition ($manifest.lang -eq "de") "Manifest language should stay German"
Assert-Condition ($manifest.display -eq "standalone") "Manifest should stay installable"
Assert-Condition ($manifest.icons.Count -gt 0) "Manifest needs at least one icon"

$appShell = Get-ServiceWorkerAppShell $serviceWorkerSource
Assert-Condition ($appShell.Count -gt 0) "Service worker needs a non-empty APP_SHELL"

$references = @()
$references += Get-HtmlAttributeReferences $html
$references += Get-CssUrlReferences $html "index.html css url"
foreach ($icon in $manifest.icons) {
  $iconPath = Normalize-LocalReference $icon.src
  if ($iconPath) { $references += New-Reference "manifest icon" $iconPath }
}
foreach ($entry in $appShell) {
  $entryPath = Normalize-LocalReference $entry
  if ($entryPath) { $references += New-Reference "service-worker APP_SHELL" $entryPath }
}
foreach ($file in @("liquid-glass.css", "tarif-toni.css")) {
  $references += Get-CssUrlReferences (Read-Utf8 $file) "$file css url"
}
Assert-ReferencesExist $references

$appShellPaths = @($appShell | ForEach-Object { Normalize-LocalReference $_ } | Where-Object { $_ } | Sort-Object -Unique)
foreach ($expected in @("index.html", "liquid-glass.css", "tarif-toni.css", "unterrichtsmaterial.js", "tarif-toni.js", "manifest.webmanifest", "app-icon.svg")) {
  Assert-Condition ($appShellPaths -contains $expected) "Service worker APP_SHELL should include $expected"
}

$toniVersion = Get-ServiceWorkerStringConst $serviceWorkerSource "TONI_VERSION"
Assert-Condition ((Get-AssetVersion $html "tarif-toni.css") -eq $toniVersion) "HTML Toni CSS version must match service worker"
Assert-Condition ((Get-AssetVersion $html "tarif-toni.js") -eq $toniVersion) "HTML Toni JS version must match service worker"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'const CACHE_NAME = `\$\{CACHE_PREFIX\}v\d+`;')) "Service worker cache name must be versioned"

$scriptMatches = [regex]::Matches($html, '<script\b(?<attrs>[^>]*)>(?<code>[\s\S]*?)</script>', "IgnoreCase")
$inlineIndex = 0
foreach ($scriptMatch in $scriptMatches) {
  if ($scriptMatch.Groups["attrs"].Value -match '\bsrc\s*=') { continue }
  $inlineIndex += 1
  Assert-CodeDelimiters $scriptMatch.Groups["code"].Value "index.html inline script $inlineIndex"
}

foreach ($file in @("unterrichtsmaterial.js", "tarif-toni.js", "service-worker.js", "scripts/serve-static.mjs", "playwright.config.mjs", "tests/e2e/flussdiagramm.spec.mjs")) {
  $source = if ($file -eq "service-worker.js") { $serviceWorkerSource } else { Read-Utf8 $file }
  Assert-CodeDelimiters $source $file
}

$cardExpression = Get-BalancedExpression $html "const CARD_ITEMS =" "[" "]"
$solutionExpression = Get-BalancedExpression $html "const SOLUTION =" "{" "}"
$stepExpression = Get-BalancedExpression $html "const STEP_ORDER =" "[" "]"
$learningExpression = Get-BalancedExpression $learningSource "window.TARIFF_FLOW_LEARNING =" "{" "}"

$cardIds = @([regex]::Matches($cardExpression, 'id:\s*"(?<id>c\d+)"') | ForEach-Object { $_.Groups["id"].Value })
$solutionMatches = [regex]::Matches($solutionExpression, '(?<slot>s\d+)\s*:\s*"(?<card>c\d+)"')
$solutionKeys = @($solutionMatches | ForEach-Object { $_.Groups["slot"].Value })
$solutionCards = @($solutionMatches | ForEach-Object { $_.Groups["card"].Value })
$stepKeys = @([regex]::Matches($stepExpression, '"(?<slot>s\d+)"') | ForEach-Object { $_.Groups["slot"].Value })

$slotKeys = @(
  [regex]::Matches($html, '<button\b[^>]*\bclass="[^"]*\bslot\b[^>]*>', "IgnoreCase") |
    ForEach-Object {
      $keyMatch = [regex]::Match($_.Value, '\bdata-key="(?<key>s\d+)"')
      if ($keyMatch.Success) { $keyMatch.Groups["key"].Value }
    }
)

Assert-Condition ($cardIds.Count -eq 15) "Expected exactly 15 cards"
Assert-Condition ($slotKeys.Count -eq 15) "Expected exactly 15 slots"
Assert-Condition ($stepKeys.Count -eq 15) "Expected exactly 15 step-order entries"
Assert-Condition ($solutionKeys.Count -eq 15) "Expected exactly 15 solution entries"

Assert-Condition ((Get-UniqueCount $cardIds) -eq 15) "Card ids must be unique"
Assert-Condition ((Get-UniqueCount $slotKeys) -eq 15) "Slot keys must be unique"
Assert-Condition ((Get-UniqueCount $stepKeys) -eq 15) "Step-order keys must be unique"
Assert-Condition ((Get-UniqueCount $solutionCards) -eq 15) "Solution card ids must be unique"

Assert-SetEquals $slotKeys $stepKeys "HTML slots and STEP_ORDER"
Assert-SetEquals $solutionKeys $stepKeys "SOLUTION keys and STEP_ORDER"
Assert-SetEquals $solutionCards $cardIds "SOLUTION values and card ids"

$learningKeys = @([regex]::Matches($learningExpression, '(?m)^\s*(?<slot>s\d+)\s*:\s*\{') | ForEach-Object { $_.Groups["slot"].Value })
Assert-SetEquals $learningKeys $stepKeys "Learning material and STEP_ORDER"

foreach ($key in $stepKeys) {
  $block = Get-BalancedExpression $learningExpression ($key + ":") "{" "}"
  foreach ($field in @("title", "why", "example", "question", "caveat")) {
    $fieldPattern = '\b' + [regex]::Escape($field) + '\s*:\s*"(?<value>(?:\\.|[^"\\])*)"'
    $fieldMatch = [regex]::Match($block, $fieldPattern)
    Assert-Condition $fieldMatch.Success "Missing learning field $key.$field"
    Assert-Condition ($fieldMatch.Groups["value"].Value.Trim().Length -gt 0) "Empty learning field $key.$field"
  }
}

$solveAllBody = Get-BalancedExpression $html "function solveAll(" "{" "}"
$updateSolveButtonStateBody = Get-BalancedExpression $html "function updateSolveButtonState(" "{" "}"
$checkAllBody = Get-BalancedExpression $html "function checkAll(" "{" "}"
$markGameEditedBody = Get-BalancedExpression $html "function markGameEdited(" "{" "}"
$showToniMessageBody = Get-BalancedExpression $toniSource "function showMessage(" "{" "}"

Assert-Condition ([regex]::IsMatch($solveAllBody, 'if\s*\(\s*!allSlotsFilled\(\)\s*\)\s*return;')) "solveAll must require filled slots"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'solutionWasShown\s*=\s*true;')) "solveAll must mark the solution as shown"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'placed\s*=\s*\{\s*\};')) "solveAll must rebuild placed cards from the solution"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'slots\.forEach')) "solveAll must iterate over all slots"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'SOLUTION\[key\]')) "solveAll must use the solution mapping"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'slot\.classList\.add\("correct"\)')) "solveAll must mark revealed slots as correct"
Assert-Condition ([regex]::IsMatch($solveAllBody, 'updateLearningButtons\(\);')) "solveAll must refresh learning buttons"

Assert-Condition ([regex]::IsMatch($updateSolveButtonStateBody, 'solveBtnEl\.disabled\s*=\s*!isComplete;')) "Solve button must be disabled until complete"
Assert-Condition ([regex]::IsMatch($updateSolveButtonStateBody, 'solveHintEl\.hidden\s*=\s*isComplete;')) "Solve hint must mirror completeness"
Assert-Condition ([regex]::IsMatch($html, 'document\.getElementById\("solveBtn"\)\.addEventListener\("click"(?s:.*?)if\s*\(\s*solveBtnEl\.disabled\s*\)\s*return;(?s:.*?)solveAll\(\);')) "Solve button click handler must guard before reveal"

Assert-Condition ([regex]::IsMatch($checkAllBody, 'const revealCorrectness\s*=\s*currentMode\s*===\s*"learn"\s*\|\|\s*\(\s*currentMode\s*===\s*"exam"\s*&&\s*empty\s*===\s*0\s*\);')) "Exam mode must reveal correctness only after every field is filled"
Assert-Condition ([regex]::IsMatch($checkAllBody, 'slot\.classList\.add\(cardId\s*===\s*SOLUTION\[key\]\s*\?\s*"correct"\s*:\s*"wrong"\);')) "Completed checks must mark both correct and wrong slots"
Assert-Condition ([regex]::IsMatch($checkAllBody, 'currentMode\s*===\s*"learn"\s*\?\s*\(wrong\s*>\s*0\s*\|\|\s*empty\s*>\s*0\)\s*:\s*\(empty\s*===\s*0\s*&&\s*wrong\s*>\s*0\)')) "Exam try-again animation must wait for a complete failed check"
Assert-Condition ([regex]::IsMatch($markGameEditedBody, 'slots\.forEach\(\(slot\)\s*=>\s*slot\.classList\.remove\("correct",\s*"wrong"\)\);')) "Editing an evaluated exam attempt must clear stale correctness classes"

Assert-Condition ([regex]::IsMatch($toniSource, 'function getBubbleRectForCandidate\(')) "Toni needs a speech-bubble footprint"
Assert-Condition ([regex]::IsMatch($toniSource, 'function getCandidateRects\(')) "Toni candidate scoring must support multiple occupied rects"
Assert-Condition ([regex]::IsMatch($showToniMessageBody, 'findFreePosition\(\{\s*includeBubble:\s*true\s*\}\)')) "Toni must position for the bubble before speaking"
Assert-Condition ([regex]::IsMatch($showToniMessageBody, 'getCollisionCount\(nextPosition,\s*\{\s*includeBubble:\s*true\s*\}\)')) "Toni must detect speech-bubble collisions"
Assert-Condition ([regex]::IsMatch($showToniMessageBody, 'if\s*\(\s*bubbleWouldCollide\s*\)\s*return;')) "Toni must skip obstructive speech bubbles"

$playwrightConfig = Read-Utf8 "playwright.config.mjs"
$e2eSource = Read-Utf8 "tests/e2e/flussdiagramm.spec.mjs"
Assert-Condition ([regex]::IsMatch($playwrightConfig, 'testDir:\s*"\./tests/e2e"')) "Playwright config must point at tests/e2e"
Assert-Condition ([regex]::IsMatch($playwrightConfig, 'serviceWorkers:\s*"block"')) "E2E tests should block service workers for deterministic runs"
Assert-Condition ([regex]::IsMatch($playwrightConfig, 'webServer:\s*\{(?s:.*?)scripts/serve-static\.mjs')) "E2E tests should start the local static server"
Assert-Condition ([regex]::IsMatch($e2eSource, 'learn-correct-wrong')) "E2E suite should cover learn-mode correction"
Assert-Condition ([regex]::IsMatch($e2eSource, 'exam-success')) "E2E suite should cover successful exam evaluation"
Assert-Condition ([regex]::IsMatch($e2eSource, 'exam-failure')) "E2E suite should cover failed exam evaluation"
Assert-Condition ([regex]::IsMatch($e2eSource, 'solve-all')) "E2E suite should cover solution reveal"
Assert-Condition ([regex]::IsMatch($e2eSource, 'mobile-layout')) "E2E suite should cover mobile layout"

Write-Host "Static checks passed:"
Write-Host "- 15 cards, 15 slots, 15 step-order entries, and 15 solution entries."
Write-Host "- Solution mapping is unique and covers every card exactly once."
Write-Host "- Learning material is complete for every step."
Write-Host "- Solution reveal is gated and refreshes solved-board state."
Write-Host "- Exam-mode reveal timing and stale-mark clearing are checked."
Write-Host "- Tarif Toni message-bubble placement safeguards are checked."
Write-Host "- Delimiter checks found no obvious syntax breakage."
Write-Host "- Local static references, manifest icons, and Service Worker cache entries are checked."
Write-Host "- Versioned Toni assets match the Service Worker."
Write-Host "- Playwright E2E setup and core browser-flow coverage are checked."
Write-Host "- package.json and Node test file are readable."
