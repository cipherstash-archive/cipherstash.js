import { AuthStrategy } from "./auth-strategy";
import { ExplicitAwsCredentialsSource } from '../stash-config';
import { AuthenticationFailure } from "../errors";
import { AsyncResult, Ok } from "../result";
import { AWSClientConfig } from './aws-client-config';

export class AWSClientConfigExplicitStrategy implements AuthStrategy<AWSClientConfig> {
  constructor(private credSource: ExplicitAwsCredentialsSource) {}

  public stillFresh(): boolean {
    return true
  }

  public async getAuthenticationDetails(): AsyncResult<AWSClientConfig, AuthenticationFailure> {
    return Ok({
      credentials: {
        accessKeyId: this.credSource.accessKeyId,
        secretAccessKey: this.credSource.secretAccessKey,
        sessionToken: this.credSource.sessionToken
      },
      region: this.credSource.region
    })
  }
}
