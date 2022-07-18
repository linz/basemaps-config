import { Construct } from 'constructs';
import { App, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export class PreviewStack extends Stack {
  lambda: lambda.Function;
  functionUrl: lambda.FunctionUrl;
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.lambda = new NodejsFunction(this, 'Lambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      memorySize: 2048,
      entry: './infra/basemaps.ts',
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        GIT_VERSION: 'v6.28.1',
        GIT_HASH: '#' + process.env.STAGE,
        CONFIG_LOCATION: process.env.CONFIG_LOCATION ?? '',
        ASSETS_LOCATION: process.env.ASSETS_LOCATION ?? '',
      },
      bundling: {
        nodeModules: ['sharp'],
        externalModules: ['aws-sdk'],
      },
    });

    this.functionUrl = new lambda.FunctionUrl(this, 'Url', {
      function: this.lambda,
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET],
        allowCredentials: true,
        maxAge: Duration.minutes(1),
      },
    });
    Bucket.fromBucketName(this, 'BasemapsCogs', 'linz-basemaps').grantRead(this.lambda);
    Bucket.fromBucketName(this, 'BasemapsDev', 'linz-basemaps-dev').grantRead(this.lambda);
    new CfnOutput(this, 'DeploymentUrl', { value: this.functionUrl.url });
  }
}

const app = new App();

const stackName = `BasemapsConfig${process.env.STAGE ?? ''}`;
new PreviewStack(app, stackName);
