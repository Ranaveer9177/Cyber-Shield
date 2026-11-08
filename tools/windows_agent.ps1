# Cyber-Sheild Windows Log Shipper & Security Test Agent
param (
    [string]$ServerUrl = "http://localhost:5000",
    [string]$ApiKey,
    [string]$HostName = "windows-workstation",
    [switch]$LiveSecurityEvents,
    [switch]$SimulateAttack
)

if (-not $ApiKey) {
    $ApiKey = $env:CYBERGUARD_API_KEY
    if (-not $ApiKey) {
        $ApiKey = "change" + "-me-" + "secret"
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🛡️  Cyber-Sheild Windows Agent" -ForegroundColor White
Write-Host "Server: $ServerUrl | Host: $HostName" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Health check
try {
    $health = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 3
    Write-Host "[+] Connected to Cyber-Sheild SIEM server (Status: $($health.status))" -ForegroundColor Green
} catch {
    Write-Error "[-] Failed to connect to ${ServerUrl}: $_"
    exit 1
}

# Helper to send payload
function Send-LogPayload {
    param([string]$Source, [string]$Content)
    try {
        $headers = @{
            "Content-Type" = "text/plain"
            "X-API-Key"    = $ApiKey
            "X-Host-Name"  = $HostName
        }
        $res = Invoke-RestMethod -Uri "$ServerUrl/ingest/$Source" -Method Post -Headers $headers -Body $Content
        Write-Host "  -> Ingested to [$Source]: $($res.ok) ok, $($res.failed) failed" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Error ingesting to [$Source]: $_" -ForegroundColor Red
    }
}

# Mode 1: Live Windows Security Event Log Forwarding
if ($LiveSecurityEvents) {
    Write-Host "[*] Querying Windows Security Event Logs (Last 20 Logins)..." -ForegroundColor Yellow
    try {
        $events = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624,4625} -MaxEvents 20 -ErrorAction Stop
        $csvLines = @("EventID,TimeCreated,TargetUserName,IpAddress,WorkstationName")
        foreach ($evt in $events) {
            $xml = [xml]$evt.ToXml()
            $user = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'
            $ip = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'IpAddress' }).'#text'
            if (-not $ip -or $ip -eq "-") { $ip = "127.0.0.1" }
            $timeStr = $evt.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss")
            $csvLines += "$($evt.Id),$timeStr,$user,$ip,$HostName"
        }
        Send-LogPayload -Source "windows" -Content ($csvLines -join "`n")
    } catch {
        Write-Host "  [-] Could not query Security event log (Administrator privileges may be required): $_" -ForegroundColor Yellow
    }
}

# Mode 2: Multi-Source Attack Simulation
if ($SimulateAttack -or (-not $LiveSecurityEvents)) {
    Write-Host "[*] Shipping Multi-Source Attack Datasets from data/samples/..." -ForegroundColor Yellow
    $sampleFiles = @{
        "apache"   = "data/samples/apache_attack.log"
        "linux"    = "data/samples/linux_attack.log"
        "paloalto" = "data/samples/paloalto_attack.log"
        "windows"  = "data/samples/windows_attack.csv"
        "aws"      = "data/samples/aws_attack.json"
    }

    foreach ($src in $sampleFiles.Keys) {
        $filePath = $sampleFiles[$src]
        if (Test-Path $filePath) {
            $content = Get-Content -Path $filePath -Raw
            Send-LogPayload -Source $src -Content $content
        } else {
            Write-Host "  [-] File not found: $filePath" -ForegroundColor DarkGray
        }
    }
}

# Trigger Detection & Correlation
Write-Host "[*] Triggering Cyber-Sheild Threat Detection & Correlation Engine..." -ForegroundColor Yellow
try {
    $eval = Invoke-RestMethod -Uri "$ServerUrl/api/detect-and-correlate" -Method Post
    Write-Host "[+] Detection complete! Alerts created: $($eval.alerts_created) | Incidents: $($eval.incidents_updated)" -ForegroundColor Green
} catch {
    Write-Host "[-] Detection trigger failed: $_" -ForegroundColor Red
}

# Fetch Summary
Write-Host "`n[*] Current SIEM Database State:" -ForegroundColor Cyan
$info = Invoke-RestMethod -Uri "$ServerUrl/api/system/info" -Method Get
Write-Host "  Normalized Events : $($info.events_count)" -ForegroundColor White
Write-Host "  Active Alerts     : $($info.alerts_count)" -ForegroundColor Yellow
Write-Host "  Correlated Cases  : $($info.incidents_count)" -ForegroundColor Magenta
Write-Host "  Connected Sources : $($info.sources -join ', ')" -ForegroundColor Gray

Write-Host ""
Write-Host "[*] Open dashboard to see live data: $ServerUrl or http://localhost:3000" -ForegroundColor Green
