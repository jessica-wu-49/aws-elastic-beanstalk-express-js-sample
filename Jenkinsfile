pipeline {
    agent {
        docker {
            image 'node:16'        // Use Node.js 16 Docker image as the build environment
            args '-u root:root'    // Run container as root user
        }
    }

    environment {
        DOCKER_REGISTRY = 'jessicawu49'   
        APP_NAME        = 'aws-sample'
        IMAGE_TAG       = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}" // Build number + short commit hash
        DOCKER_CREDENTIALS = 'dockerhub-id' // Jenkins credentials ID for Docker
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm    // Pull source code from repository
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "Installing dependencies with npm ci..."
                sh 'npm ci'     // Install Node.js dependencies
            }
        }

        stage('Run Unit Tests') {
            steps {
                echo "Running unit tests..."
                sh 'npm test'   // Run unit tests
            }
        }

        stage('Security Scan') {
            steps {
                withCredentials([string(credentialsId: 'snyk-api-token', variable: 'SNYK_TOKEN')]) {
                    sh '''
                        npm install -g snyk            // Install Snyk CLI
                        snyk auth $SNYK_TOKEN          // Authenticate Snyk
                        snyk test --severity-threshold=high --json > snyk-report.json  // Run security scan
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'snyk-report.json', allowEmptyArchive: true // Save Snyk report
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker image..."
                sh '''
                    docker build -t $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG .   // Build image with tag
                    docker tag $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$APP_NAME:latest  // Tag as latest
                '''
            }
        }

        stage('Push Docker Image') {
            steps {
                echo "Pushing Docker image to registry..."
                withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials-id',
                                                  usernameVariable: 'DOCKER_USER',
                                                  passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin // Login to DockerHub
                        docker push $DOCKER_REGISTRY/$APP_NAME:$IMAGE_TAG                  // Push image with version tag
                        docker push $DOCKER_REGISTRY/$APP_NAME:latest                      // Push latest tag
                    '''
                }
            }
        }
    }

    post {
        failure {
            echo '❌ Pipeline failed!'   // Notify failure
        }
        success {
            echo '✅ Pipeline succeeded!' // Notify success
        }
    }
}
