# irishPlay 빌드 및 로컬 미리보기
# 사용법: .\build.ps1 [-Preview]

param(
    [switch]$Preview
)

Set-Location "$PSScriptRoot\app"

Write-Host "타입 검사 중..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "타입 오류 발생. 빌드 중단." -ForegroundColor Red
    exit 1
}

Write-Host "빌드 중..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "빌드 실패." -ForegroundColor Red
    exit 1
}

Write-Host "빌드 완료: app/dist/" -ForegroundColor Green

if ($Preview) {
    Write-Host "미리보기 서버 시작 중... http://localhost:4173/irishPlay/" -ForegroundColor Cyan
    npm run preview
}
