# irishPlay 커밋 + 배포 푸시 (mykim) + 백업 푸시 (origin)
# 사용법: .\deploy.ps1 [-Message "커밋 메시지"] [-BuildFirst] [-BackupOnly] [-SkipBuild]
#
# 옵션:
#   -Message "..."  커밋 메시지 (생략 시 자동 생성)
#   -BuildFirst     푸시 전 빌드 검증 실행
#   -BackupOnly     origin(백업)에만 푸시 (배포 생략)
#   -SkipCommit     커밋 없이 푸시만 (이미 커밋된 상태)

param(
    [string]$Message = "",
    [switch]$BuildFirst,
    [switch]$BackupOnly,
    [switch]$SkipCommit
)

Set-Location "$PSScriptRoot"

# ── 빌드 검증 (옵션) ──────────────────────────────────────────
if ($BuildFirst) {
    Write-Host "빌드 검증 중..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\app"
    npm run typecheck
    if ($LASTEXITCODE -ne 0) { Write-Host "타입 오류. 배포 중단." -ForegroundColor Red; exit 1 }
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "빌드 실패. 배포 중단." -ForegroundColor Red; exit 1 }
    Write-Host "빌드 OK" -ForegroundColor Green
    Set-Location "$PSScriptRoot"
}

# ── Git 상태 확인 ─────────────────────────────────────────────
$status = git status --porcelain
if (-not $SkipCommit) {
    if (-not $status) {
        Write-Host "변경 사항 없음. 커밋 생략." -ForegroundColor Yellow
    } else {
        # 커밋 메시지 자동 생성
        if (-not $Message) {
            $date = Get-Date -Format "yyyy-MM-dd HH:mm"
            $Message = "chore: update $date"
        }

        Write-Host "스테이징 중..." -ForegroundColor Yellow
        git add -A

        Write-Host "커밋: $Message" -ForegroundColor Yellow
        git commit -m $Message
        if ($LASTEXITCODE -ne 0) { Write-Host "커밋 실패." -ForegroundColor Red; exit 1 }
    }
}

# ── 푸시 ─────────────────────────────────────────────────────
if (-not $BackupOnly) {
    Write-Host "배포 푸시 → mykim (배포/GitHub Pages)..." -ForegroundColor Cyan
    git push mykim main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "mykim 푸시 실패." -ForegroundColor Red
        exit 1
    }
    Write-Host "배포 완료: https://mykim711231.github.io/irishPlay/" -ForegroundColor Green
}

Write-Host "백업 푸시 → origin (gababayo)..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "origin 푸시 실패." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "완료!" -ForegroundColor Green
if (-not $BackupOnly) {
    Write-Host "  배포 URL: https://mykim711231.github.io/irishPlay/" -ForegroundColor White
}
Write-Host "  GitHub Actions: https://github.com/mykim711231/irishPlay/actions" -ForegroundColor White
