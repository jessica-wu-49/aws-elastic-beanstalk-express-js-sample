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
                    # Safely copy source code into container via tar pipe and install dependencies
                    tar -C . -cf - . | docker run --rm -i -w /work node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work
                        npm install --save
                    '
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    # Run unit tests in isolated Node.js environment
                    tar -C . -cf - . | docker run --rm -i -w /work node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work
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
                    echo "🔍 Current workspace: $WORKSPACE"
                    echo "📦 Checking if package.json exists..."
                    ls -la $WORKSPACE

                    # Run Snyk vulnerability scan with JSON report output and persist to Jenkins workspace
                    docker run --rm -u 0 -i -w /work \
                      -v $WORKSPACE:/work \
                      -e SNYK_TOKEN node:16 bash -lc '
                        if [ ! -f /work/package.json ]; then
                          echo "❌ ERROR: package.json not found in /work!"
                          ls -la /work
                          exit 1
                        fi
                        npm install --save
                        npx --yes snyk@latest test --severity-threshold=high --json > snyk-report.json
                      '

                    # Verify report generation
                    ls -lh $WORKSPACE/snyk-report.json || echo "⚠️ snyk-report.json not found!"
                    echo "✅ Snyk Security Scan completed. Report saved as snyk-report.json"
                '''
            }
            post {
                always {
                    // Archive generated Snyk security report
                    archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    # Build Docker image using Jenkins build info
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
                        # Login and push images to Docker Hub
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
