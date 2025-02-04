if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env file from .env.example"
}

docker-compose -f docker-compose.prod.yml up -d
Write-Host "Services started. Access:"
Write-Host "App: http://localhost:3000"
Write-Host "Grafana: http://localhost:3001"
Write-Host "Jenkins: http://localhost:8080"