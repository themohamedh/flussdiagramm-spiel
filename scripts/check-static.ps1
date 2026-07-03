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

$html = Read-Utf8 "index.html"
$learningSource = Read-Utf8 "unterrichtsmaterial.js"
$nodeTestSource = Read-Utf8 "tests/static-integrity.test.mjs"
$serviceWorkerSource = Read-Utf8 "service-worker.js"
$packageJson = Read-Utf8 "package.json" | ConvertFrom-Json
Assert-Condition ($null -ne $packageJson.scripts.check) "package.json must expose a check script"
Assert-Condition ($null -ne $packageJson.scripts.test) "package.json must expose a test script"
Assert-Condition ($nodeTestSource.Trim().Length -gt 0) "Node test file must be readable"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'const isNavigation = event\.request\.mode === "navigate";')) "Service worker should identify navigations"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'const isStaticAsset = isAppShellRequest\(event\.request\);')) "Service worker should identify app-shell assets"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'if \(!isNavigation && !isStaticAsset\) return;')) "Service worker should skip non-shell non-navigation GETs"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'response\.ok && \(isStaticAsset \|\| isNavigation\)')) "Service worker should cache handled navigations and shell assets"
Assert-Condition ([regex]::IsMatch($serviceWorkerSource, 'key\.startsWith\(CACHE_PREFIX\) && key !== CACHE_NAME')) "Service worker should delete only own old caches"

$scriptMatches = [regex]::Matches($html, '<script\b(?<attrs>[^>]*)>(?<code>[\s\S]*?)</script>', "IgnoreCase")
$inlineIndex = 0
foreach ($scriptMatch in $scriptMatches) {
  if ($scriptMatch.Groups["attrs"].Value -match '\bsrc\s*=') { continue }
  $inlineIndex += 1
  Assert-CodeDelimiters $scriptMatch.Groups["code"].Value "index.html inline script $inlineIndex"
}

foreach ($file in @("unterrichtsmaterial.js", "tarif-toni.js", "service-worker.js")) {
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

Write-Host "Static checks passed:"
Write-Host "- 15 cards, 15 slots, 15 step-order entries, and 15 solution entries."
Write-Host "- Solution mapping is unique and covers every card exactly once."
Write-Host "- Learning material is complete for every step."
Write-Host "- Solution reveal is gated and refreshes solved-board state."
Write-Host "- Delimiter checks found no obvious syntax breakage."
Write-Host "- package.json and Node test file are readable."
