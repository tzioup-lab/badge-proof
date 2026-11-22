param([switch]$DryRun)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Find-Python {
    $candidates = @()
    $localPython = Join-Path $PSScriptRoot ".runtime\python\python.exe"
    if (Test-Path -LiteralPath $localPython) {
        $candidates += @{ Path = $localPython; Prefix = @() }
    }
    foreach ($name in @("py", "python", "python3")) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command -and $command.Source -notmatch "\\WindowsApps\\") {
            $prefix = @()
            if ($name -eq "py") { $prefix = @("-3") }
            $candidates += @{ Path = $command.Source; Prefix = $prefix }
        }
    }
    foreach ($candidate in $candidates) {
        try {
            $candidatePrefix = @($candidate.Prefix)
            & $candidate.Path @candidatePrefix -c "import sys,http.server,ssl,tarfile,hashlib;sys.exit(sys.version_info<(3,10))" 2>$null
            if ($LASTEXITCODE -eq 0) { return $candidate }
        } catch { }
    }
    return $null
}

try {
    $python = Find-Python
    if (-not $python) {
        $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot "dependency-manifest.json") -Raw | ConvertFrom-Json
        $architecture = $env:PROCESSOR_ARCHITEW6432
        if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
        switch ($architecture.ToUpperInvariant()) {
            "ARM64" { $package = $manifest.python.windows.arm64 }
            "AMD64" { $package = $manifest.python.windows.amd64 }
            default { throw "Windows x64 ou ARM64 requis / Windows x64 or ARM64 required." }
        }
        if ($DryRun) {
            Write-Host "Simulation / Dry run: download $($package.url), verify SHA-256, extract locally to .runtime\python, then recheck Python."
            exit 0
        }
        Write-Host "Python absent. Preparation locale / Python missing. Preparing a local runtime."
        $runtime = Join-Path $PSScriptRoot ".runtime"
        New-Item -ItemType Directory -Path $runtime -Force | Out-Null
        $zipPath = Join-Path $runtime "python.zip.part"
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -UseBasicParsing -Uri $package.url -OutFile $zipPath
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant() -ne $package.sha256) {
            throw "Telechargement non conforme / Python download checksum mismatch."
        }
        $zipFile = Join-Path $runtime "python.zip"
        Move-Item -LiteralPath $zipPath -Destination $zipFile -Force
        $staging = Join-Path $runtime ("python-" + [guid]::NewGuid().ToString("N"))
        Expand-Archive -LiteralPath $zipFile -DestinationPath $staging
        $executable = Join-Path $staging "python.exe"
        & $executable -c "import sys,http.server,ssl,tarfile,hashlib;sys.exit(sys.version_info<(3,10))"
        if ($LASTEXITCODE -ne 0) { throw "Python local invalide / Local Python runtime validation failed." }
        $destination = Join-Path $runtime "python"
        if (Test-Path -LiteralPath $destination) {
            $backup = Join-Path $runtime ("python-previous-" + [guid]::NewGuid().ToString("N"))
            Move-Item -LiteralPath $destination -Destination $backup
        }
        Move-Item -LiteralPath $staging -Destination $destination
        $python = @{ Path = (Join-Path $destination "python.exe"); Prefix = @() }
    }
    $bootstrapArgs = @("bootstrap.py", "--port", "8770", "--open")
    if ($DryRun) { $bootstrapArgs += @("--check", "--dry-run") }
    $pythonPrefix = @($python.Prefix)
    & $python.Path @pythonPrefix @bootstrapArgs
    exit $LASTEXITCODE
} catch {
    Write-Host "Le composeur ne peut pas demarrer / Composer could not start."
    Write-Host $_.Exception.Message
    Write-Host "Reconnectez Internet puis relancez. Hors ligne, restaurez vendor depuis le ZIP complet."
    Write-Host "Reconnect and reopen. Offline, restore vendor from the complete ZIP."
    Write-Host "Python officiel / Official Python: https://www.python.org/downloads/windows/"
    exit 1
}
