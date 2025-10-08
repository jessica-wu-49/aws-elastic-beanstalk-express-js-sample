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
                    echo "🔍 Starting Snyk Security Scan..."
                    echo "📦 Packaging source files and transferring into container..."

                    # Copy all source files into container and run Snyk test
                    tar -C . -cf - . | docker run --rm -u 0 -i -w /work -e SNYK_TOKEN node:16 bash -lc '
                        mkdir -p /work
                        tar -xf - -C /work

                        if [ ! -f /work/package.json ]; then
                            echo "❌ ERROR: package.json not found in /work!"
                            ls -la /work
                            exit 1
                        fi

                        npm install --save
                        npm install -g snyk
                        snyk auth $SNYK_TOKEN
                        snyk test --severity-threshold=high --json > snyk-report.json
                        echo "✅ Snyk scan completed successfully."
                    '

                    # Copy report file out of the container to Jenkins workspace
                    docker cp $(docker ps -alq):/work/snyk-report.json ./snyk-report.json || true
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
