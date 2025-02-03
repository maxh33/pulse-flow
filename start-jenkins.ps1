# start-jenkins.ps1
docker-compose up -d jenkins
Write-Host "Waiting for Jenkins to start..."
Start-Sleep -Seconds 30

# Get the initial admin password
$adminPassword = docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
Write-Host "Jenkins initial admin password: $adminPassword"
Write-Host "Jenkins is running at http://localhost:8080"