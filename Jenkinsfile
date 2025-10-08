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
                    docker run --rm -i -w /work -v $(pwd):/work node:16 bash -lc '
                        npm install --save
                    '
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    # Run project unit tests in isolated Node.js container
                    docker run --rm -i -w /work -v $(pwd):/work node:16 bash -lc '
                        npm install --save
                        npm test
                    '
                    echo "✅ All unit tests passed successfully."
                '''
            }
        }

        stage('Security Scan (Snyk)') {
            environment { SNYK_TOKEN = credentials('snyk-api-token') }
            steps {
                sh '''
                    # Run Snyk security scan, mounting Jenkins workspace for report persistence
                    docker run --rm -i -w /work -v $(pwd):/work -e SNYK_TOKEN node:16 bash -lc '
                        npm install --save
                        npx --yes snyk@latest test --severity-threshold=high --json > snyk-report.json
                    '
                    echo "Snyk Security Scan completed. Report saved as snyk-report.json"
                '''
            }
            post {
                always {
                    # Archive generated Snyk security report
                    archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    # Build and tag Docker image using Jenkins build info
                    docker build -t $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG .
                    docker tag $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$APP_NAME:latest
                """
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-id',
                                                  usernameVariable: 'DOCKER_USER',
                                                  passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        # Authenticate to Docker Hub and push both versioned and latest images
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
