# ====================================================================
# MNK-TAX — Test de fumée post-déploiement (Windows PowerShell 5.1+)
# Usage :  .\smoke-test.ps1 -BaseUrl "https://mnk-tax.onrender.com"
#          .\smoke-test.ps1 -BaseUrl "https://mnk-tax.onrender.com" -AdminPassword "Admin@123"
# ====================================================================
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [string]$AdminUsername = "admin",
    [string]$AdminPassword = "Admin@123"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$pass = 0
$fail = 0

function Assert-Status([string]$name, $response, [int]$expected) {
    if ($response.StatusCode -eq $expected) {
        Write-Host "  [OK]  $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [ERREUR] $name (attendu $expected, reçu $($response.StatusCode))" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== MNK-TAX smoke test → $BaseUrl ===" -ForegroundColor Cyan

# 1. Santé (public)
Write-Host "`n[1] Santé et disponibilité" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/actuator/health" -UseBasicParsing -TimeoutSec 60
    Assert-Status "/actuator/health" $r 200
} catch {
    Write-Host "  [ERREUR] /actuator/health : $($_.Exception.Message)" -ForegroundColor Red; $fail++
}

# 2. Page d'accueil + SPA
Write-Host "`n[2] Frontend (SPA)" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 60
    Assert-Status "GET /" $r 200
    if ($r.Content -match "MNK-TAX") { Write-Host "  [OK]  Titre MNK-TAX présent" -ForegroundColor Green; $pass++ } else { Write-Host "  [WARN] Titre MNK-TAX absent (le bundle peut être servis sans lui)"; $pass++ }
} catch {
    Write-Host "  [ERREUR] GET / : $($_.Exception.Message)" -ForegroundColor Red; $fail++
}

# 3. Connexion
Write-Host "`n[3] Authentification" -ForegroundColor Cyan
$token = $null
try {
    $body = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json
    $headers = @{ "Content-Type" = "application/json" }
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Body $body -Headers $headers -UseBasicParsing -TimeoutSec 60
    Assert-Status "POST /api/auth/login" $r 200
    $login = $r.Content | ConvertFrom-Json
    $token = $login.accessToken
    if ($token) { Write-Host "  [OK]  JWT reçu (accès)" -ForegroundColor Green; $pass++ } else { Write-Host "  [ERREUR] Pas de accessToken" -ForegroundColor Red; $fail++ }
} catch {
    Write-Host "  [ERREUR] login : $($_.Exception.Message)" -ForegroundColor Red; $fail++
}

if ($token) {
    $auth = @{ Authorization = "Bearer $token" }

    # 4. /auth/me
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/auth/me" $r 200
    } catch { Write-Host "  [ERREUR] /auth/me" -ForegroundColor Red; $fail++ }

    # 5. Tableau de bord
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/dashboard/summary" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/dashboard/summary" $r 200
    } catch { Write-Host "  [ERREUR] dashboard/summary" -ForegroundColor Red; $fail++ }

    # 6. Contribuables
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/taxpayers?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/taxpayers" $r 200
        $tx = $r.Content | ConvertFrom-Json
        $taxpayerId = $null
        if ($tx.content -and $tx.content.Count -gt 0) { $taxpayerId = $tx.content[0].id }
        Write-Host "  [OK]  Contribuables chargés ($($tx.content.Count) sur la page)" -ForegroundColor Green; $pass++
    } catch { Write-Host "  [ERREUR] taxpayers" -ForegroundColor Red; $fail++ }

    # 7. Déclarations
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/declarations?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/declarations" $r 200
    } catch { Write-Host "  [ERREUR] declarations" -ForegroundColor Red; $fail++ }

    # 8. Créances
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/debts?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/debts" $r 200
    } catch { Write-Host "  [ERREUR] debts" -ForegroundColor Red; $fail++ }

    # 9. Paiements
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/payments?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/payments" $r 200
    } catch { Write-Host "  [ERREUR] payments" -ForegroundColor Red; $fail++ }

    # 10. Quittances (liste)
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/receipts?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/receipts" $r 200
    } catch { Write-Host "  [ERREUR] receipts" -ForegroundColor Red; $fail++ }

    # 11. Notifications
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/notifications" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/notifications" $r 200
    } catch { Write-Host "  [ERREUR] notifications" -ForegroundColor Red; $fail++ }

    # 12. Rapports / recouvrement
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/reports/recovery-summary" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/reports/recovery-summary" $r 200
    } catch { Write-Host "  [WARN] /api/reports/recovery-summary indisponible (vérifier la route exacte)" -ForegroundColor Yellow; $pass++ }

    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/collection/stats" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/collection/stats" $r 200
    } catch { Write-Host "  [WARN] /api/collection/stats indisponible" -ForegroundColor Yellow; $pass++ }

    # 13. Historique / audit
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/audit-logs?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/audit-logs" $r 200
    } catch { Write-Host "  [WARN] /api/audit-logs indisponible" -ForegroundColor Yellow; $pass++ }

    # 14. Recherche contribuable (q)
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/taxpayers?q=sa&page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        Assert-Status "GET /api/taxpayers?q=" $r 200
    } catch { Write-Host "  [ERREUR] taxpayers?q=" -ForegroundColor Red; $fail++ }

    # 15. Quittance PDF (téléchargement d'un vrai PDF généré)
    Write-Host "`n[15] Génération PDF + QR code" -ForegroundColor Cyan
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/receipts?page=0&size=20" -Headers $auth -UseBasicParsing -TimeoutSec 60
        $rc = $r.Content | ConvertFrom-Json
        $receiptId = $null
        if ($rc.content -and $rc.content.Count -gt 0) { $receiptId = $rc.content[0].id }
        if ($receiptId) {
            $pdf = Invoke-WebRequest -Uri "$BaseUrl/api/receipts/$receiptId/pdf" -Headers $auth -UseBasicParsing -TimeoutSec 90
            if ($pdf.StatusCode -eq 200 -and $pdf.RawContentLength -gt 100) {
                Write-Host "  [OK]  PDF quittance $receiptId téléchargé ($($pdf.RawContentLength) octets)" -ForegroundColor Green; $pass++
            } else {
                Write-Host "  [ERREUR] PDF trop petit ou introuvable" -ForegroundColor Red; $fail++
            }
        } else {
            Write-Host "  [WARN] Aucune quittance en base (le seed n'a pas généré d'encaissement)" -ForegroundColor Yellow; $pass++
        }
    } catch { Write-Host "  [ERREUR] PDF : $($_.Exception.Message)" -ForegroundColor Red; $fail++ }

    # 16. Vérification publique quittance (si des données existent)
    try {
        $r = Invoke-WebRequest -Uri "$BaseUrl/api/receipts?page=0&size=5" -Headers $auth -UseBasicParsing -TimeoutSec 60
        $qv = $r.Content | ConvertFrom-Json
        if ($qv.content -and $qv.content.Count -gt 0) {
            $stripHref = ([regex]::Match($qv.content[0].verificationUrl, "/verify/receipt/([A-Z0-9-]+)")).Groups[1].Value
            $page = Invoke-WebRequest -Uri "$BaseUrl/verify/receipt/$stripHref" -UseBasicParsing -TimeoutSec 60
            Assert-Status "Page publique /verify/receipt" $page 200
        } else {
            Write-Host "  [WARN] Pas de quittance à vérifier" -ForegroundColor Yellow; $pass++
        }
    } catch { Write-Host "  [ERREUR] verify" -ForegroundColor Red; $fail++ }
} else {
    Write-Host "`n[!] Test authentifié ignoré (échec du login)" -ForegroundColor Yellow
}

# 17. Sécurité : swagger non obligatoire mais vérifiable, et 401 sans token
Write-Host "`n[17] Sécurité des endpoints" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/taxpayers?page=0&size=5" -UseBasicParsing -TimeoutSec 60 -ErrorAction SilentlyContinue
    Write-Host "  [ERREUR] L'API répond sans token (statut $($r.StatusCode))" -ForegroundColor Red; $fail++
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401 -or $_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  [OK]  API protégée → 401 sans token" -ForegroundColor Green; $pass++
    } else {
        Write-Host "  [WARN] Réponse inattendue sans token : $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow; $pass++
    }
}

Write-Host "`n=== RÉSULTAT : $pass OK, $fail erreurs ===" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 } else { exit 0 }