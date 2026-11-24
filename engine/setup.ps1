# Non-destructive Windows setup: never reinstall an existing Piper/Denis environment.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js >=22, then run setup.ps1 again.' }
  $major = [int](& node -p 'parseInt(process.versions.node)')
  if ($major -lt 22) { throw 'Node.js >=22 required.' }
  if (-not (Test-Path '.\node_modules\remotion\package.json')) {
    $oldOrt = $env:ONNXRUNTIME_NODE_INSTALL
    try {
      $env:ONNXRUNTIME_NODE_INSTALL = 'skip'
      & npm ci
      if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; see output above.' }
    } finally { $env:ONNXRUNTIME_NODE_INSTALL = $oldOrt }
  } else { Write-Host 'Existing Node dependencies preserved.' }
  & node .\render.mjs doctor --fix
  $result = $LASTEXITCODE
  if ($result -ne 0) {
    Write-Warning 'Components are missing. Read doctor output; existing Python/Piper/Denis were not changed.'
  } else { Write-Host 'Ready. Run start.bat and open http://127.0.0.1:7788' }
} finally { Pop-Location }
exit $result
