pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'pulse-flow'
        DOCKER_NETWORK = 'pulse-flow_app_network'
        MONGODB_URI = credentials('mongodb-uri')
    }

    stages {

        stage('Setup Network') {
            steps {
                sh 'docker network create ${DOCKER_NETWORK} || true'
            }
        }
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                sh 'docker build -t ${DOCKER_IMAGE} .'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker stop ${DOCKER_IMAGE} || true'
                sh 'docker rm ${DOCKER_IMAGE} || true'
                sh '''
                    docker run -d \
                    --name ${DOCKER_IMAGE} \
                    --network ${DOCKER_NETWORK} \
                    -p 3000:3000 \
                    -e MONGODB_URI=${MONGODB_URI} \
                    ${DOCKER_IMAGE}
                '''
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}