import { Credentials } from '@aws-sdk/types'

// You'd think there'd be one of these ready-to-go in @aws-sdk/types, but
// nooooooo, they're all client-specific, so we've got to build our own.
// LIKE ANIMALS.
export type AWSClientConfig = {
  credentials: Credentials,
  region: string
}
