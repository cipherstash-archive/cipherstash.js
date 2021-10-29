export type FederatedAwsCredentials = {
  kind: "Federated"
  accessKeyId: string,
  secretAccessKey: string
  sessionToken: string
}

export type ExplicitAwsCredentials = {
  kind: "Explicit"
  accessKeyId: string,
  secretAccessKey: string
}

export type AwsCredentials = FederatedAwsCredentials | ExplicitAwsCredentials
