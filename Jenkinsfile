pipeline {

    agent { label 'built-in' }

    environment {
        DOCKER_REGISTRY = 'jessicawu49'
        APP_NAME        = 'aws-sample'
        IMAGE_TAG       = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
    }

    stages {
        stage('Debug Workspace') {
            steps {
                sh 'pwd && ls -la'
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    tar -C . -cf - . | docker run --rm -i -w /work node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work
                        if [ -f /work/package-lock.json ]; then npm ci; else npm install; fi
                    '
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    tar -C . -cf - . | docker run --rm -i -w /work node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work
                        if [ -f /work/package-lock.json ]; then npm ci; else npm install; fi
                        npm test
                    '
                '''
            }
        }

        stage('Security Scan (Snyk)') {
            environment { SNYK_TOKEN = credentials('snyk-api-token') }
            steps {
                sh '''
                    tar -C . -cf - . | docker run --rm -i -w /work -e SNYK_TOKEN node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work
                        if [ -f /work/package-lock.json ]; then npm ci; else npm install; fi
                        npx --yes snyk@latest test --severity-threshold=high --json > snyk-report.json
                    '
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG .
                    docker tag $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$APP_NAME:latest
                """
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials-id',
                                                  usernameVariable: 'DOCKER_USER',
                                                  passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                        docker push $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG
                        docker push $DOCKER_REGISTRY/$APP_NAME:latest
                    """
                }
            }
        }
    }

    post {
        failure {
            echo '❌ Pipeline failed!'
        }
        success {
            echo '✅ Pipeline succeeded!'
        }
    }
}
